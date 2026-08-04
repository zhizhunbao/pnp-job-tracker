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
import crypto from 'crypto'
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
  // 第25轮 #118:表级内容哈希(裸字节,parse 前)——与上轮一致的 dims/news 整表跳过(不 parse 不重灌),
  // 压 seed 耗时出代理 ~100s 危险区。哈希存 seed_state 表,随本事务提交,回滚不留脏哈希。
  const martHash = (name: string): string => {
    const h = crypto.createHash('md5')
    for (const p of martPaths(name)) h.update(fs.readFileSync(p))
    return h.digest('hex')
  }

  const now = new Date().toISOString()
  const counts: Record<string, number> = {}

  // ── 维度表:每次全量重建。三元组 = [mart 文件, DB 表(=响应计数键), 列白名单(snake_case)+ 映射] ──
  const dims: [string, string, string[], (r: any) => Row][] = [
    ['provinces', 'provinces', ['code', 'name', 'info'], (r) => ({ code: r.code, name: r.name, info: r.info ?? null })],
    ['cities', 'cities', ['name', 'province', 'name_zh', 'name_ko'], (r) => ({ name: r.name, province: r.province, name_zh: r.nameZh, name_ko: r.nameKo })],
    ['districts', 'districts', ['name', 'city', 'province'], (r) => ({ name: r.name, city: r.city, province: r.province })],
    ['designated_employers', 'designated_employers', ['name', 'province', 'location', 'is_tech', 'source'],
      (r) => ({ name: r.name, province: r.province, location: r.location, is_tech: r.isTech, source: r.source })],
    ['noc_categories', 'noc_categories', ['broad', 'mid', 'fine', 'teer', 'broad_en', 'broad_ko', 'mid_en', 'mid_ko', 'fine_en', 'fine_ko'],
      (r) => ({ broad: r.broad, mid: r.mid, fine: r.fine, teer: r.teer, broad_en: r.broadEn, broad_ko: r.broadKo, mid_en: r.midEn, mid_ko: r.midKo, fine_en: r.fineEn, fine_ko: r.fineKo })],
    ['sources', 'sources', ['name'], (r) => ({ name: r.name })],
    ['experience_levels', 'experience_levels', ['name'], (r) => ({ name: r.name })],
    ['pnp_occupations', 'pnp_occupations', ['province', 'stream', 'label', 'type', 'program', 'noc', 'name', 'gta_restricted', 'url', 'fetched'],
      (r) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, program: r.program || 'PNP', noc: r.noc, name: r.name, gta_restricted: r.gtaRestricted, url: r.url, fetched: r.fetched })],
    ['pnp_draws', 'pnp_draws', ['province', 'kind', 'draw_date', 'stream', 'score', 'scale', 'invitations', 'note', 'label', 'url', 'fetched'],
      (r) => ({ province: r.province, kind: r.kind, draw_date: r.drawDate, stream: r.stream, score: r.score, scale: r.scale, invitations: r.invitations, note: r.note, label: r.label, url: r.url, fetched: r.fetched })],
    ['pnp_score_factors', 'pnp_score_factors', ['province', 'system', 'factor', 'kind', 'seq', 'label', 'points', 'xor_prev', 'rule', 'factor_max', 'factor_group', 'group_max', 'pass_mark', 'max_total', 'guide_effective', 'url', 'fetched'],
      (r) => ({ province: r.province, system: r.system, factor: r.factor, kind: r.kind, seq: r.seq, label: r.label, points: r.points, xor_prev: r.xorPrev, rule: r.rule, factor_max: r.factorMax, factor_group: r.factorGroup, group_max: r.groupMax, pass_mark: r.passMark, max_total: r.maxTotal, guide_effective: r.guideEffective, url: r.url, fetched: r.fetched })],
    // E13-01 省提名官方门槛(规则引擎):一行一条,subject 区分申请人/雇主,applies_* 是适用条件
    ['pnp_requirements', 'pnp_requirements',
      // ⚠️ applies_condition 是 G6 新列:**必须先在生产跑 docs/sql/g6-pnp-requirements-condition.sql**,
      // 否则这条 INSERT 撞 42703 → 整个 seed 事务回滚(表现为 /seed 500、无 body)
      ['province', 'program', 'stream', 'subject', 'factor', 'op', 'value', 'value_text', 'unit', 'applies_teer', 'applies_noc', 'excludes_noc', 'applies_area', 'applies_condition', 'applies_family_size', 'basis', 'label', 'section', 'seq', 'effective', 'url', 'page_url', 'fetched'],
      (r) => ({ province: r.province, program: r.program, stream: r.stream, subject: r.subject, factor: r.factor, op: r.op, value: r.value, value_text: r.valueText, unit: r.unit, applies_teer: r.appliesTeer, applies_noc: r.appliesNoc, excludes_noc: r.excludesNoc, applies_area: r.appliesArea, applies_condition: r.appliesCondition, applies_family_size: r.familySize, basis: r.basis, label: r.label, section: r.section, seq: r.seq, effective: r.effective, url: r.url, page_url: r.pageUrl, fetched: r.fetched })],
    // G5 三省运营统计(对话即产品 §三 lookupOps):配额/已用/待处理/积压游标/EOI 池/处理周数/SIRS 分数段
    // ⚠️ value 保持可空 —— 官方隐私抑制值(AB「Less than 10」、BC「<5」)与不适用一律 null + value_text 存原文,禁 `?? 0`
    ['pnp_ops_stats', 'pnp_ops_stats',
      ['province', 'program', 'metric', 'scope', 'scope_kind', 'stream_key', 'label', 'value', 'value_text', 'unit', 'as_of', 'period', 'url', 'fetched', 'section', 'seq'],
      (r) => ({ province: r.province, program: r.program, metric: r.metric, scope: r.scope, scope_kind: r.scopeKind, stream_key: r.streamKey, label: r.label, value: r.value ?? null, value_text: r.valueText, unit: r.unit, as_of: r.asOf, period: r.period, url: r.url, fetched: r.fetched, section: r.section, seq: r.seq })],
    ['ee_categories', 'ee_categories', ['category', 'label', 'noc', 'teer', 'title', 'url', 'fetched', 'draw_crs', 'draw_date', 'draw_size'],
      (r) => ({ category: r.category, label: r.label, noc: r.noc, teer: r.teer, title: r.title, url: r.url, fetched: r.fetched, draw_crs: r.drawCrs, draw_date: r.drawDate, draw_size: r.drawSize })],
    ['noc_descriptions', 'noc_descriptions', ['noc', 'title', 'title_zh', 'title_zh_short', 'title_ko', 'title_ko_short', 'title_en_short', 'duties', 'requirements', 'fetched'],
      (r) => ({ noc: r.noc, title: r.title, title_zh: r.titleZh, title_zh_short: r.titleZhShort, title_ko: r.titleKo,
        title_ko_short: r.titleKoShort, title_en_short: r.titleEnShort,
        duties: r.duties, requirements: r.requirements, fetched: r.fetched })],
    // E12-03 PGWP 可申 DLI 子集(院校级,IRCC 官方名单)
    ['dli', 'dli', ['province', 'name', 'dli_number', 'city', 'campuses', 'is_public', 'grad_program', 'url', 'fetched'],
      (r) => ({ province: r.province, name: r.name, dli_number: r.dliNumber, city: r.city, campuses: r.campuses, is_public: r.isPublic, grad_program: r.gradProgram, url: r.url, fetched: r.fetched })],
    // E12-06 news 不走 dims 清空重灌 —— 懒翻译/速读缓存(body_zh/ko、summary_*)是线上按需写入的,
    // DELETE+重灌每小时抹一次缓存(P1f 实撞发现);改专用 upsert 块见下(dims 循环之后)。
    // E4-04 字段级来源 / E5-02 榜单 / E5-04 地区统计(坑 2:白名单必须显式列全字段)
    ['field_sources', 'field_sources', ['field', 'kind', 'publisher', 'url', 'title', 'description', 'status', 'fetched', 'note'],
      (r) => ({ field: r.field, kind: r.kind, publisher: r.publisher, url: r.url, title: r.title, description: r.description, status: r.status, fetched: r.fetched, note: r.note })],
    ['rankings', 'rankings',
      ['slug', 'rank', 'kind', 'external_id', 'title', 'company', 'company_slug', 'city', 'province', 'noc', 'teer', 'score', 'salary_text', 'salary_annual', 'pnp_stream', 'ee_category', 'date_posted', 'apply_url', 'official_url', 'open_jobs', 'named_jobs', 'avg_score', 'lmia_positions', 'lmia_quarter'],
      (r) => ({ slug: r.slug, rank: r.rank, kind: r.kind, external_id: r.externalId, title: r.title, company: r.company, company_slug: r.companySlug, city: r.city, province: r.province, noc: r.noc, teer: r.teer, score: r.score, salary_text: r.salaryText, salary_annual: r.salaryAnnual, pnp_stream: r.pnpStream, ee_category: r.eeCategory, date_posted: r.datePosted, apply_url: r.applyUrl, official_url: r.officialUrl, open_jobs: r.openJobs, named_jobs: r.namedJobs, avg_score: r.avgScore, lmia_positions: r.lmiaPositions, lmia_quarter: r.lmiaQuarter })],
    // E8-14 主图两个新粒度(当下状态 → 照常清空重灌;历史那张 stats_daily 在下面单独 UPSERT)
    ['stats_occupation', 'stats_occupation',
      // wage_low/high_annual(2026-07-31 范围拍板):改列后已清 seed_state(坑:表级哈希会让新列静默跳过)
      ['noc', 'province', 'title_zh', 'title_zh_short', 'title_en', 'teer', 'broad', 'mid', 'fine', 'open_jobs', 'new7d', 'median_wage_annual', 'wage_low_annual', 'wage_high_annual', 'median_salary_annual', 'salary_n', 'named_jobs', 'fetched'],
      (r) => ({ noc: r.noc, province: r.province, title_zh: r.titleZh, title_zh_short: r.titleZhShort, title_en: r.titleEn, teer: r.teer, broad: r.broad, mid: r.mid, fine: r.fine,
                open_jobs: r.openJobs, new7d: r.new7d, median_wage_annual: r.medianWageAnnual, wage_low_annual: r.wageLowAnnual, wage_high_annual: r.wageHighAnnual, median_salary_annual: r.medianSalaryAnnual,
                salary_n: r.salaryN, named_jobs: r.namedJobs, fetched: r.fetched })],
    ['stats_city', 'stats_city',
      ['city', 'province', 'open_jobs', 'new7d', 'median_wage_annual', 'median_salary_annual', 'salary_n', 'named_jobs', 'fetched'],
      (r) => ({ city: r.city, province: r.province, open_jobs: r.openJobs, new7d: r.new7d,
                median_wage_annual: r.medianWageAnnual, median_salary_annual: r.medianSalaryAnnual,
                salary_n: r.salaryN, named_jobs: r.namedJobs, fetched: r.fetched })],
    ['stats', 'stats',
      ['province', 'broad', 'mid', 'open_jobs', 'new7d', 'median_wage_annual', 'median_salary_annual', 'named_jobs', 'stream_labels', 'aip_jobs', 'top_cities', 'fetched', 'difficulty'],
      (r) => ({ province: r.province, broad: r.broad, mid: r.mid ?? 'all', open_jobs: r.openJobs, new7d: r.new7d, median_wage_annual: r.medianWageAnnual, median_salary_annual: r.medianSalaryAnnual, named_jobs: r.namedJobs, stream_labels: r.streamLabels, aip_jobs: r.aipJobs, top_cities: r.topCities, fetched: r.fetched, difficulty: r.difficulty ?? null })],
  ]

  // 单连接 + 单事务:任一步失败整体回滚,不再有半写状态(老逐行版没有原子性)
  const client: PgClient = await (payload.db as any).pool.connect()
  let closed = 0
  let closedDead = 0   // 实测判死立即下架的条数(与上面「本次未见+30天」那条分开计,好在响应里看清谁在干活)
  try {
    await client.query('BEGIN')
    // #118 表级哈希态(响应计数:-1=本轮无上传跳过,-2=内容与上轮一致跳过)
    await client.query('CREATE TABLE IF NOT EXISTS seed_state (name text PRIMARY KEY, hash text NOT NULL)')
    const prevHash: Record<string, string> = {}
    for (const r of (await client.query('SELECT name, hash FROM seed_state')).rows) prevHash[r.name] = r.hash
    const markState = (name: string, hash: string) =>
      client.query('INSERT INTO seed_state (name, hash) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET hash=EXCLUDED.hash', [name, hash])

    // ── 维度表:清空 + 批量插入(先清 locked_documents_rels 关联列,B7 教训:漏了会整事务炸) ──
    for (const [file, table, cols, map] of dims) {
      // E12-03 防线升级(22c8d6a 空灌事故防线的延伸):mart **文件缺失** = 该表本轮没上传(新表未产出/分表上传)
      // → 跳过保留现有行,不再「清空+重灌 0 行」。要真清空一张维度表 = 上传内容为 [] 的文件(显式意图)。
      if (martPaths(file).length === 0) { counts[table] = -1; continue }   // -1 = skipped(本轮无该表上传)
      const hash = martHash(file)
      if (prevHash[table] === hash) { counts[table] = -2; continue }   // -2 = 内容与上轮一致,整表免重灌
      const rows = (await mart(file)).map(map).filter((d) => Object.values(d).some((v) => v !== undefined && v !== null && v !== ''))
      await client.query(`DELETE FROM payload_locked_documents_rels WHERE ${table}_id IS NOT NULL`)
      await client.query(`DELETE FROM ${table}`)
      await insertBatch(client, table, [...cols, 'created_at', 'updated_at'],
        rows.map((r) => ({ ...r, created_at: now, updated_at: now })))
      await markState(table, hash)
      counts[table] = rows.length
    }

    // ── E8-14 stats_daily:**只追加,永不清空** ────────────────────────
    // 趋势图的唯一数据来源。ETL 每轮只产出当天的行 → 按 (date,province,broad) UPSERT:
    // 一天多跑几轮只更新今天这批,往前的日期一律不动。走 dims 的「清空+重灌」会把历史抹掉,所以单独一段。
    // 不做表级哈希跳过 —— 行数很小(百来行),而且 date 每天都变,跳过没意义。
    if (martPaths('stats_daily').length > 0) {
      const dailyRows = (await mart('stats_daily')).map((r: any) => ({
        date: r.date, province: r.province, broad: r.broad, open_jobs: r.openJobs, new7d: r.new7d,
        median_salary_annual: r.medianSalaryAnnual, named_jobs: r.namedJobs,
        created_at: now, updated_at: now,
      })).filter((r) => r.date && r.province)
      await insertBatch(client, 'stats_daily',
        ['date', 'province', 'broad', 'open_jobs', 'new7d', 'median_salary_annual', 'named_jobs', 'created_at', 'updated_at'],
        dailyRows,
        `ON CONFLICT (date, province, broad) DO UPDATE SET open_jobs=EXCLUDED.open_jobs, new7d=EXCLUDED.new7d,
         median_salary_annual=EXCLUDED.median_salary_annual, named_jobs=EXCLUDED.named_jobs, updated_at=EXCLUDED.updated_at`)
      counts.stats_daily = dailyRows.length
    }

    // ── news:按 slug upsert(E12-06 P1f)──────────────────────────
    // 懒翻译/速读缓存列(body_zh/body_ko/summary_zh/summary_ko/summary_en)由 /api/news-translate、
    // /api/news-summarize 线上写入,seed 不许碰——除非该条 body_en 变了(重抽正文)才连带清缓存(防错位陈译)。
    // 滚出 60 条窗口的行删除;mart 缺文件=跳过(与 dims 同防线)。预翻批若恢复(budget>0)需同步调整此块。
    if (martPaths('news').length > 0 && prevHash['news'] === martHash('news')) { counts.news = -2 }
    else if (martPaths('news').length > 0) {
      const newsRows = (await mart('news')).filter((r: any) => r.slug).map((r: any) => ({
        region: r.region, title: r.title, date: r.date, slug: r.slug, url: r.url, og_image: r.ogImage,
        excerpt: r.excerpt, importance: r.importance, importance_note: r.importanceNote,
        body_en: r.bodyEn, citation: r.citation, fetched: r.fetched, created_at: now, updated_at: now,
      }))
      const newsCols = ['region', 'title', 'date', 'slug', 'url', 'og_image', 'excerpt', 'importance', 'importance_note', 'body_en', 'citation', 'fetched', 'created_at', 'updated_at']
      const newsUpdate = newsCols.filter((c) => !['slug', 'created_at'].includes(c)).map((c) => `${c}=EXCLUDED.${c}`).join(',')
      const staleClear = ['body_zh', 'body_ko', 'summary_zh', 'summary_ko', 'summary_en']
        .map((c) => `${c}=CASE WHEN news.body_en IS DISTINCT FROM EXCLUDED.body_en THEN NULL ELSE news.${c} END`).join(',')
      await client.query(`DELETE FROM payload_locked_documents_rels WHERE news_id IS NOT NULL`)
      if (newsRows.length) await client.query(`DELETE FROM news WHERE NOT (slug = ANY($1))`, [newsRows.map((r) => r.slug)])
      await insertBatch(client, 'news', newsCols, newsRows,
        `ON CONFLICT (slug) DO UPDATE SET ${staleClear}, ${newsUpdate}`)
      await markState('news', martHash('news'))
      counts.news = newsRows.length
    } else { counts.news = -1 }

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
        lmia_positions_skilled: c.lmiaPositionsSkilled,   // B4-02:技能股(High Wage/GTS/PR-only),match/名录分档用
        // E12-08:担保档(药丸)+ 四维档明细(jsonb);盒过渡期缺键 → COALESCE 保旧值(GAP1 惯例)
        sponsor_grade: c.sponsorGrade ?? null,
        score_detail: c.scoreDetail ? JSON.stringify(c.scoreDetail) : null,
        created_at: now, updated_at: now,
      })
    }
    const companyCols = ['slug', 'name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled', 'sponsor_grade', 'score_detail', 'created_at', 'updated_at']
    // 跳过未变行(2026-07-25):upsert 原本无条件重写每一行(含没变的),companies 2.6万 + jobs 4.3万
    // 全量重写把整轮从秒级抬到 100s+,必撞代理 ~100s 上限 —— 客户端每轮记「seed 失败」,alerts 连带停摆。
    // DO UPDATE 加 WHERE「任一业务列真变了才写」:普通列比 EXCLUDED,COALESCE 列比 COALESCE 后的终值
    // (与 SET 子句一一对应);updated_at 不参与比较,数据没变就不该跳。语义与原版唯一差异:
    // 未变行的 updated_at 不再逐轮刷新 —— 全库无按 jobs/companies.updated_at 排序/过滤的查询,已核。
    const companyPlain = ['name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled']
    const companyUpdate = [...companyPlain, 'updated_at']
      .map((c) => `${c}=EXCLUDED.${c}`).join(',')
      + ', sponsor_grade=COALESCE(EXCLUDED.sponsor_grade, companies.sponsor_grade)'
      + ', score_detail=COALESCE(EXCLUDED.score_detail, companies.score_detail)'
    const companyChanged = companyPlain.map((c) => `companies.${c} IS DISTINCT FROM EXCLUDED.${c}`)
      .concat(['sponsor_grade', 'score_detail'].map((c) => `companies.${c} IS DISTINCT FROM COALESCE(EXCLUDED.${c}, companies.${c})`))
      .join(' OR ')
    // 被 WHERE 跳过的行不进 RETURNING → slug→id 映射改为 upsert 后单独 SELECT 全量取(一条语句,秒级)
    const companyId: Record<string, number> = {}
    await insertBatch(client, 'companies', companyCols, companyRows,
      `ON CONFLICT (slug) DO UPDATE SET ${companyUpdate} WHERE ${companyChanged}`)
    for (const r of (await client.query('SELECT id, slug FROM companies WHERE slug = ANY($1)',
      [companyRows.map((r) => r.slug)])).rows) companyId[r.slug] = r.id
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
      'source_label', 'origin', 'accessibility', 'score', 'grade_channel', 'score_detail', 'pnp_eligible', 'pnp_stream', 'ee_category', 'aip', 'apprentice_friendly',
      'employment_term', 'employment_hours', 'certificates', 'education',
      'eligibility_flag', 'eligibility_quote',
      'status', 'closed_at', 'first_seen', 'last_seen', 'created_at', 'updated_at']
    // GAP1③:预筛两列缺值(ETL 盒未拉新代码的过渡期)保留旧值不清空——COALESCE 兜底;E12-08 两档列同款
    const jobCoalesce = ['description', 'eligibility_flag', 'eligibility_quote', 'grade_channel', 'score_detail']
    const jobUpdate = jobCols
      .filter((c) => !['external_id', 'first_seen', 'last_seen', 'created_at', ...jobCoalesce].includes(c))
      .map((c) => `${c}=EXCLUDED.${c}`).join(',')
      // #123:description 也 COALESCE——mart 为空(05b 没抓到=聚合帖)时保留懒抓写回的正文,不冲缓存
      + ', description=COALESCE(EXCLUDED.description, jobs.description)'
      + ', eligibility_flag=COALESCE(EXCLUDED.eligibility_flag, jobs.eligibility_flag)'
      + ', eligibility_quote=COALESCE(EXCLUDED.eligibility_quote, jobs.eligibility_quote)'
      + ', grade_channel=COALESCE(EXCLUDED.grade_channel, jobs.grade_channel)'
      + ', score_detail=COALESCE(EXCLUDED.score_detail, jobs.score_detail)'
    // 跳过未变行(同 companies 块注释):last_seen 归 COALESCE 组——增量抓取只重抓最近几天的帖,
    // 每轮带新 lastSeen 的是少数,老帖 lastSeen 原样透传比不出差异 → 大多数行整行免写
    const jobChanged = jobCols
      .filter((c) => !['external_id', 'first_seen', 'last_seen', 'created_at', 'updated_at', ...jobCoalesce].includes(c))
      .map((c) => `jobs.${c} IS DISTINCT FROM EXCLUDED.${c}`)
      .concat([...jobCoalesce, 'last_seen'].map((c) => `jobs.${c} IS DISTINCT FROM COALESCE(EXCLUDED.${c}, jobs.${c})`))
      .join(' OR ')
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
          grade_channel: j.gradeChannel ?? null, score_detail: j.scoreDetail ? JSON.stringify(j.scoreDetail) : null,
          pnp_eligible: !!j.pnpEligible, pnp_stream: j.pnpStream, ee_category: j.eeCategory, aip: !!j.aip,
          apprentice_friendly: !!j.apprenticeFriendly,   // B1-3:官方标「不要经验/带训」或学徒标题(05e)
          // 雇佣形态+入职要求(E6-06/E6-07A);certificates 是 jsonb,pg 参数须传 JSON 字符串
          employment_term: j.employmentTerm, employment_hours: j.employmentHours,
          certificates: j.certificates ? JSON.stringify(j.certificates) : null, education: j.education,
          eligibility_flag: j.eligibilityFlag ?? null, eligibility_quote: j.eligibilityQuote ?? null,
          status: 'open', closed_at: null, first_seen: now, last_seen: j.lastSeen ?? null,
          created_at: now, updated_at: now,
        })
      }
      await insertBatch(client, 'jobs', jobCols, jobRows,
        `ON CONFLICT (external_id) DO UPDATE SET ${jobUpdate}, last_seen=COALESCE(EXCLUDED.last_seen, jobs.last_seen) WHERE ${jobChanged}`)
      counts.jobs += jobRows.length
    }

    // ── 实测判死 → 立即下架(2026-08-03),不受下面那条 30 天规则约束 ──
    // 为什么单开一条:老规则的保守是给「本次没抓到」这种**推断**兜底的(805 误杀教训);而 closed_jobs
    // 是 verify_expired 逐帖 GET 拿到 410/「Job posting expired」的**事实**,不需要拿 30 天去对冲。
    // 之前只把死帖剔出 mart,遇上 28 天前就死掉的岗,要再等两天才下架 —— 这两天里用户点申请全撞过期页
    // (Fort Qu'Appelle 那位从 Google 招聘富结果进来、注册、点了两次申请)。closedAt 用判死时刻,
    // 详情页 JSON-LD 的 validThrough 直接吃它,过期岗才不会继续以「有效招聘」的身份喂给 Google。
    if (!reset && martPaths('closed_jobs').length > 0) {
      const seen = new Set<string>()
      const deadRows = mart('closed_jobs')
        .filter((r: any) => r?.externalId && !seen.has(r.externalId) && seen.add(r.externalId))
        .map((r: any) => ({ external_id: r.externalId, closed_at: r.closedAt || now }))
      if (deadRows.length > 0) {
        await client.query('CREATE TEMP TABLE dead_ext (external_id text PRIMARY KEY, closed_at timestamptz) ON COMMIT DROP')
        await insertBatch(client, 'dead_ext', ['external_id', 'closed_at'], deadRows)
        await client.query('ANALYZE dead_ext')
        const r = await client.query(
          `UPDATE jobs SET status='closed', closed_at=COALESCE(jobs.closed_at, d.closed_at), updated_at=$1
           FROM dead_ext d WHERE d.external_id = jobs.external_id AND jobs.status='open'`, [now])
        closedDead = r.rowCount ?? 0
      }
    }

    // ── 下架(非 reset):只下架「本次未见 且 发布已超 EXPIRE_DAYS 天」的岗 ──
    // 不用「本次没出现就 closed」对账:增量抓取只含最近几天,会误杀仍在招的旧岗(实测 805,见 docs/source-framework.md)
    const EXPIRE_DAYS = 30
    // seenIds 为空(jobs mart 缺/空)时跳过:空清单会把所有 30 天以上的旧岗一锅端下架
    if (!reset && seenIds.length > 0) {
      const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400000).toISOString()
      // 本次见到的 external_id 灌进带主键的临时表,下架走 NOT EXISTS 反连接。
      // 原 `NOT (external_id = ANY($seenIds))`:5.2 万元素数组对每个候选行线性搜(≈ 待检行 × 5.2万),
      // 库涨到 5 万岗后超线性变慢 → seed 整轮撞 180s 超时(mart 已传但灌不进库)。
      // 临时表主键让反连接走索引/哈希探测,下架从超时降到秒级;ON COMMIT DROP 随本事务清理。
      await client.query('CREATE TEMP TABLE seen_ext (external_id text PRIMARY KEY) ON COMMIT DROP')
      await insertBatch(client, 'seen_ext', ['external_id'], seenIds.map((id) => ({ external_id: id })))
      await client.query('ANALYZE seen_ext')  // 临时表无自动统计,喂给规划器选反连接计划
      const r = await client.query(
        `UPDATE jobs SET status='closed', closed_at=$1, updated_at=$1
         WHERE status='open' AND date_posted < $2
           AND NOT EXISTS (SELECT 1 FROM seen_ext s WHERE s.external_id = jobs.external_id)`,
        [now, cutoff])
      closed = r.rowCount ?? 0
    }

    // #125(批C 修正):重复(同 公司×岗名×城市)跨轮累积在 DB——同岗重发 externalId 会换,单轮 mart
    // 快照内每岗唯一,ETL 侧标记恒 0(首跑实锤)→ 改本事务内窗口全量重算(open ~42k 行实测 ~6s,
    // 每轮一次服务端,非请求路径;IS DISTINCT FROM 守卫只写真变化的行)。保最新:date_posted 新者,同日 id 大者
    await client.query(`UPDATE jobs SET is_dup = x.dup FROM (
      SELECT id, (row_number() OVER (PARTITION BY company_id, lower(title), coalesce(city, '')
        ORDER BY date_posted DESC NULLS LAST, id DESC) > 1) AS dup
      FROM jobs WHERE status = 'open') x
      WHERE jobs.id = x.id AND jobs.is_dup IS DISTINCT FROM x.dup`)
    await client.query(`UPDATE jobs SET is_dup = false WHERE status <> 'open' AND is_dup`)

    // 2026-07-26:ETL 心跳 —— 每轮 seed 成功都写一笔,前端「最近核对」读它(docs/sql/etl-heartbeat.sql)。
    // 与 max(last_seen) 的区别:数据没变也照样动,回答的是「刚核对过官方来源」而不是「数据变过」。
    // 表未落地(部署时序)→ 42P01 忽略,不能让心跳把整轮灌库回滚。
    await client.query(`INSERT INTO etl_heartbeat (id, last_seed) VALUES (1, now())
      ON CONFLICT (id) DO UPDATE SET last_seed = now()`).catch((e: any) => {
      if (e?.code !== '42P01') throw e
    })

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }

  return Response.json({ ok: true, reset, counts, closed, closedDead, updatedAt: now })
}
