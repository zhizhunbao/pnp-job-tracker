/**
 * Seed/load: GET /seed   (add ?reset=1 to wipe & rebuild)
 * 纯加载器 v2(批量 SQL)— 只读 data/mart/(etl/09 产出的最终表)直接灌库。
 * 拼装/清洗/评分关联/中介过滤/去重 全在 ETL 完成,这里不做。
 *
 * v2 改批量的原因:原 Payload 逐行管线(12k 岗 × find+update ≈ 数万次 DB 往返)在
 * Render Free 0.1 vCPU 上一轮 ~40 分钟,还必撞代理 ~100s 超时(客户端记失败、服务端继续跑)。
 * 分批 upsert(INSERT … ON CONFLICT)后整轮秒级,且全程单事务——失败回滚,不再有半写状态。
 * 代价(认账,同「/jobs 读走原始 SQL」老坑 5):列名耦合 Payload snake_case,
 * 改 collection 字段必须同步这里的列白名单。语义与 v1 完全一致:
 * token 鉴权 / ?reset=1 全清重建 / 增量 upsert / lastSeen=抓取时间(mart 透传,缺则不动旧值)/
 * 「本次未见且发布超 30 天」才下架。
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH = 300 // 行/语句:jobs 43 列 × 300 行 ≈ 1.3 万参数(PG 上限 65535),JD 正文大也控住单语句体积

const isoDate = (s?: string) => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

type Row = Record<string, unknown>
type PgClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> ; release: () => void }

// 分批多行 INSERT(可带 ON CONFLICT 子句);返回 RETURNING 的行(未写 RETURNING 则为空)
async function insertBatch(client: PgClient, table: string, cols: string[], rows: Row[], suffix = ''): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const params: unknown[] = []
    const values = chunk
      .map((r, ri) => '(' + cols.map((c, ci) => { params.push(r[c] ?? null); return `$${ri * cols.length + ci + 1}` }).join(',') + ')')
      .join(',')
    const res = await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${suffix}`, params)
    out.push(...res.rows)
  }
  return out
}

export async function GET(req: Request) {
  // 鉴权:SEED_TOKEN 已设置则必须匹配(生产必设 —— ?reset=1 可清库,公网裸奔=事故;本地 dev 未设则放行)
  const url = new URL(req.url)
  const token = process.env.SEED_TOKEN
  if (token && req.headers.get('x-seed-token') !== token && url.searchParams.get('token') !== token) {
    return new Response('unauthorized', { status: 401 })
  }
  const payload = await getPayload({ config: await config })
  const reset = !!url.searchParams.get('reset')
  // mart 读取链(E7-04,Supabase Storage 退役):/api/mart 上传端点落的 <tmpdir>/mart 优先(Render 生产),
  // 回退本地 ../data/mart(本地 dev / compose)。
  // 2026-07-11 事故防线(22c8d6a)语义保持:上游读失败绝不能当空表——维度表是 DELETE+重灌,
  // 空表照灌 = 生产维度全清(真发生过)。两目录都不存在 = 本轮上传丢失(如部署重启清 /tmp)
  // → 抛错整事务回滚;有目录而单表文件缺 = 表确实不存在(同旧 404)→ 返回 []。
  const tmpMartDir = path.join(os.tmpdir(), 'mart')
  const localMartDir = path.resolve(process.cwd(), '..', 'data', 'mart')
  // 该表的有序文件清单:大表(>6MB)由 upload_mart 分片上传(name__part0..N-1 + name__meta 声明片数,
  // meta 最后传=提交语义),小表单文件。分片存在的意义:512MB 实例整文件 parse 27k 行 jobs 会 OOM(实撞),
  // 逐片 parse→入库→释放才扛得住。meta 声明的片缺失=半程上传 → 抛错整事务回滚。
  const martPaths = (name: string): string[] => {
    for (const dir of [tmpMartDir, localMartDir]) {
      if (!fs.existsSync(dir)) continue
      const metaP = path.join(dir, `${name}__meta.json`)
      if (fs.existsSync(metaP)) {
        const parts = JSON.parse(fs.readFileSync(metaP, 'utf8'))[0]?.parts
        if (!Number.isInteger(parts) || parts < 1) throw new Error(`mart ${name}__meta invalid`)
        return Array.from({ length: parts }, (_, k) => {
          const p = path.join(dir, `${name}__part${k}.json`)
          if (!fs.existsSync(p)) throw new Error(`mart ${name} shard ${k + 1}/${parts} missing (partial upload? rolling back)`)
          return p
        })
      }
      const single = path.join(dir, `${name}.json`)
      if (fs.existsSync(single)) return [single]
    }
    if (!fs.existsSync(tmpMartDir) && !fs.existsSync(localMartDir)) {
      throw new Error(`mart no data source: neither ${tmpMartDir} nor ${localMartDir} exists (upload lost? rolling back)`)
    }
    return []
  }
  const mart = (name: string): any[] => martPaths(name).flatMap((p) => JSON.parse(fs.readFileSync(p, 'utf8')))

  const now = new Date().toISOString()
  const counts: Record<string, number> = {}

  // ── 维度表:每次全量重建。三元组 = [mart 文件, DB 表(=响应计数键), 列白名单(snake_case)+ 映射] ──
  const dims: [string, string, string[], (r: any) => Row][] = [
    ['provinces', 'provinces', ['code', 'name'], (r) => ({ code: r.code, name: r.name })],
    ['cities', 'cities', ['name', 'province'], (r) => ({ name: r.name, province: r.province })],
    ['districts', 'districts', ['name', 'city', 'province'], (r) => ({ name: r.name, city: r.city, province: r.province })],
    ['designated_employers', 'designated_employers', ['name', 'province', 'location', 'is_tech', 'source'],
      (r) => ({ name: r.name, province: r.province, location: r.location, is_tech: r.isTech, source: r.source })],
    ['noc_categories', 'noc_categories', ['broad', 'mid', 'fine', 'teer'], (r) => ({ broad: r.broad, mid: r.mid, fine: r.fine, teer: r.teer })],
    ['sources', 'sources', ['name'], (r) => ({ name: r.name })],
    ['experience_levels', 'experience_levels', ['name'], (r) => ({ name: r.name })],
    ['pnp_occupations', 'pnp_occupations', ['province', 'stream', 'label', 'type', 'noc', 'name', 'gta_restricted', 'url', 'fetched'],
      (r) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gta_restricted: r.gtaRestricted, url: r.url, fetched: r.fetched })],
    ['pnp_draws', 'pnp_draws', ['province', 'kind', 'draw_date', 'stream', 'score', 'scale', 'invitations', 'note', 'label', 'url', 'fetched'],
      (r) => ({ province: r.province, kind: r.kind, draw_date: r.drawDate, stream: r.stream, score: r.score, scale: r.scale, invitations: r.invitations, note: r.note, label: r.label, url: r.url, fetched: r.fetched })],
    ['ee_categories', 'ee_categories', ['category', 'label', 'noc', 'teer', 'title', 'url', 'fetched', 'draw_crs', 'draw_date', 'draw_size'],
      (r) => ({ category: r.category, label: r.label, noc: r.noc, teer: r.teer, title: r.title, url: r.url, fetched: r.fetched, draw_crs: r.drawCrs, draw_date: r.drawDate, draw_size: r.drawSize })],
    ['noc_descriptions', 'noc_descriptions', ['noc', 'title', 'duties', 'requirements', 'fetched'],
      (r) => ({ noc: r.noc, title: r.title, duties: r.duties, requirements: r.requirements, fetched: r.fetched })],
    // E12-03 PGWP 可申 DLI 子集(院校级,IRCC 官方名单)
    ['dli', 'dli', ['province', 'name', 'dli_number', 'city', 'campuses', 'is_public', 'grad_program', 'url', 'fetched'],
      (r) => ({ province: r.province, name: r.name, dli_number: r.dliNumber, city: r.city, campuses: r.campuses, is_public: r.isPublic, grad_program: r.gradProgram, url: r.url, fetched: r.fetched })],
    // E12-06 官方移民新闻(近 60 条滚动;body_zh/summary_zh=预留列照灌,前端暂不渲)
    ['news', 'news', ['region', 'title', 'date', 'slug', 'url', 'og_image', 'excerpt', 'importance', 'importance_note', 'body_en', 'body_zh', 'summary_zh', 'citation', 'fetched'],
      (r) => ({ region: r.region, title: r.title, date: r.date, slug: r.slug, url: r.url, og_image: r.ogImage, excerpt: r.excerpt, importance: r.importance, importance_note: r.importanceNote, body_en: r.bodyEn, body_zh: r.bodyZh, summary_zh: r.summaryZh, citation: r.citation, fetched: r.fetched })],
    // E4-04 字段级来源 / E5-02 榜单 / E5-04 地区统计(坑 2:白名单必须显式列全字段)
    ['field_sources', 'field_sources', ['field', 'kind', 'publisher', 'url', 'title', 'description', 'status', 'fetched', 'note'],
      (r) => ({ field: r.field, kind: r.kind, publisher: r.publisher, url: r.url, title: r.title, description: r.description, status: r.status, fetched: r.fetched, note: r.note })],
    ['rankings', 'rankings',
      ['slug', 'rank', 'kind', 'external_id', 'title', 'company', 'company_slug', 'city', 'province', 'noc', 'teer', 'score', 'salary_text', 'salary_annual', 'pnp_stream', 'ee_category', 'date_posted', 'apply_url', 'official_url', 'open_jobs', 'named_jobs', 'avg_score', 'lmia_positions', 'lmia_quarter'],
      (r) => ({ slug: r.slug, rank: r.rank, kind: r.kind, external_id: r.externalId, title: r.title, company: r.company, company_slug: r.companySlug, city: r.city, province: r.province, noc: r.noc, teer: r.teer, score: r.score, salary_text: r.salaryText, salary_annual: r.salaryAnnual, pnp_stream: r.pnpStream, ee_category: r.eeCategory, date_posted: r.datePosted, apply_url: r.applyUrl, official_url: r.officialUrl, open_jobs: r.openJobs, named_jobs: r.namedJobs, avg_score: r.avgScore, lmia_positions: r.lmiaPositions, lmia_quarter: r.lmiaQuarter })],
    ['stats', 'stats',
      ['province', 'broad', 'open_jobs', 'new7d', 'median_wage_annual', 'median_salary_annual', 'named_jobs', 'stream_labels', 'aip_jobs', 'top_cities', 'fetched'],
      (r) => ({ province: r.province, broad: r.broad, open_jobs: r.openJobs, new7d: r.new7d, median_wage_annual: r.medianWageAnnual, median_salary_annual: r.medianSalaryAnnual, named_jobs: r.namedJobs, stream_labels: r.streamLabels, aip_jobs: r.aipJobs, top_cities: r.topCities, fetched: r.fetched })],
  ]

  // 单连接 + 单事务:任一步失败整体回滚,不再有半写状态(老逐行版没有原子性)
  const client: PgClient = await (payload.db as any).pool.connect()
  let closed = 0
  try {
    await client.query('BEGIN')

    // ── 维度表:清空 + 批量插入(先清 locked_documents_rels 关联列,B7 教训:漏了会整事务炸) ──
    for (const [file, table, cols, map] of dims) {
      // E12-03 防线升级(22c8d6a 空灌事故防线的延伸):mart **文件缺失** = 该表本轮没上传(新表未产出/分表上传)
      // → 跳过保留现有行,不再「清空+重灌 0 行」。要真清空一张维度表 = 上传内容为 [] 的文件(显式意图)。
      if (martPaths(file).length === 0) { counts[table] = -1; continue }   // -1 = skipped(本轮无该表上传)
      const rows = (await mart(file)).map(map).filter((d) => Object.values(d).some((v) => v !== undefined && v !== null && v !== ''))
      await client.query(`DELETE FROM payload_locked_documents_rels WHERE ${table}_id IS NOT NULL`)
      await client.query(`DELETE FROM ${table}`)
      await insertBatch(client, table, [...cols, 'created_at', 'updated_at'],
        rows.map((r) => ({ ...r, created_at: now, updated_at: now })))
      counts[table] = rows.length
    }

    if (reset) {
      await client.query('DELETE FROM payload_locked_documents_rels WHERE jobs_id IS NOT NULL OR companies_id IS NOT NULL')
      await client.query('DELETE FROM jobs')
      await client.query('DELETE FROM companies')
    }

    // ── 事实表:companies 批量 upsert(按 slug),RETURNING 建 slug→id 映射给 jobs 关联 ──
    const companyRows: Row[] = []
    const seenSlug = new Set<string>()
    for (const c of await mart('companies')) {
      if (!c.slug || seenSlug.has(c.slug)) continue // 同一语句撞唯一键会整批报错,JS 侧兜底去重
      seenSlug.add(c.slug)
      companyRows.push({
        slug: c.slug, name: c.name ?? c.slug, website: c.website, website_source: c.websiteSource, email: c.email, region: c.region,
        sectors: c.sectors, address: c.address, description: c.description, source: c.source,
        lmia_positions: c.lmiaPositions, lmia_lmias: c.lmiaLmias,
        lmia_last_quarter: c.lmiaLastQuarter, lmia_streams: c.lmiaStreams,
        created_at: now, updated_at: now,
      })
    }
    const companyCols = ['slug', 'name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'created_at', 'updated_at']
    const companyUpdate = ['name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'updated_at']
      .map((c) => `${c}=EXCLUDED.${c}`).join(',')
    const companyId: Record<string, number> = {}
    for (const r of await insertBatch(client, 'companies', companyCols, companyRows,
      `ON CONFLICT (slug) DO UPDATE SET ${companyUpdate} RETURNING id, slug`)) companyId[r.slug] = r.id
    counts.companies = companyRows.length

    // ── 事实表:jobs 批量 upsert(按 external_id) ──
    // 更新分支不碰 first_seen/created_at;last_seen=抓取时间(mart 透传),mart 没给则保留旧值;
    // 插入分支 last_seen 缺就留空(宁可留空,下轮抓到自然回填)。
    const seenIds: string[] = []
    const seenExt = new Set<string>()
    const jobCols = ['external_id', 'company_id', 'title', 'noc', 'category', 'teer', 'broad', 'mid', 'fine',
      'description', 'country', 'province', 'city', 'district', 'address', 'apply_url', 'official_url',
      'salary', 'salary_annual', 'salary_text', 'wage_med_hourly', 'wage_med_annual', 'wage_low_hourly',
      'wage_low_annual', 'wage_high_hourly', 'wage_high_annual', 'wage_year', 'date_posted', 'source',
      'source_label', 'origin', 'accessibility', 'score', 'pnp_eligible', 'pnp_stream', 'ee_category', 'aip',
      'employment_term', 'employment_hours', 'certificates', 'education',
      'status', 'closed_at', 'first_seen', 'last_seen', 'created_at', 'updated_at']
    const jobUpdate = jobCols
      .filter((c) => !['external_id', 'first_seen', 'last_seen', 'created_at'].includes(c))
      .map((c) => `${c}=EXCLUDED.${c}`).join(',')
    counts.jobs = 0
    // 逐片处理:一片 parse→映射→入库→引用释放,内存峰值=单片而非全量(27k 行整解析在 512MB 实例 OOM 实撞)
    for (const shard of martPaths('jobs')) {
      const jobRows: Row[] = []
      for (const j of JSON.parse(fs.readFileSync(shard, 'utf8'))) {
        if (!j.externalId || seenExt.has(j.externalId)) continue
        seenExt.add(j.externalId)
        seenIds.push(j.externalId)
        jobRows.push({
          external_id: j.externalId, company_id: companyId[j.companySlug] ?? null, title: j.title ?? '',
          noc: j.noc, category: j.category, teer: j.teer, broad: j.broad, mid: j.mid, fine: j.fine,
          description: j.description, country: j.country, province: j.province, city: j.city, district: j.district, address: j.address,
          apply_url: j.applyUrl, official_url: j.officialUrl,
          salary: j.salary, salary_annual: j.salaryAnnual, salary_text: j.salaryText,
          wage_med_hourly: j.wageMedHourly, wage_med_annual: j.wageMedAnnual,
          wage_low_hourly: j.wageLowHourly, wage_low_annual: j.wageLowAnnual,
          wage_high_hourly: j.wageHighHourly, wage_high_annual: j.wageHighAnnual, wage_year: j.wageYear,
          date_posted: isoDate(j.datePosted), source: j.source, source_label: j.sourceLabel,
          origin: j.origin, accessibility: j.accessibility, score: j.score,
          pnp_eligible: !!j.pnpEligible, pnp_stream: j.pnpStream, ee_category: j.eeCategory, aip: !!j.aip,
          // 雇佣形态+入职要求(E6-06/E6-07A);certificates 是 jsonb,pg 参数须传 JSON 字符串
          employment_term: j.employmentTerm, employment_hours: j.employmentHours,
          certificates: j.certificates ? JSON.stringify(j.certificates) : null, education: j.education,
          status: 'open', closed_at: null, first_seen: now, last_seen: j.lastSeen ?? null,
          created_at: now, updated_at: now,
        })
      }
      await insertBatch(client, 'jobs', jobCols, jobRows,
        `ON CONFLICT (external_id) DO UPDATE SET ${jobUpdate}, last_seen=COALESCE(EXCLUDED.last_seen, jobs.last_seen)`)
      counts.jobs += jobRows.length
    }

    // ── 下架(非 reset):只下架「本次未见 且 发布已超 EXPIRE_DAYS 天」的岗 ──
    // 不用「本次没出现就 closed」对账:增量抓取只含最近几天,会误杀仍在招的旧岗(实测 805,见 docs/source-framework.md)
    const EXPIRE_DAYS = 30
    // seenIds 为空(jobs mart 缺/空)时跳过:空清单会把所有 30 天以上的旧岗一锅端下架
    if (!reset && seenIds.length > 0) {
      const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400000).toISOString()
      const r = await client.query(
        `UPDATE jobs SET status='closed', closed_at=$1, updated_at=$1
         WHERE status='open' AND date_posted < $2 AND NOT (external_id = ANY($3))`,
        [now, cutoff, seenIds])
      closed = r.rowCount ?? 0
    }

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }

  return Response.json({ ok: true, reset, counts, closed, updatedAt: now })
}
