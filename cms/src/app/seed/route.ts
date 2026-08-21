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
import { dbOf } from '@/lib/db/server'
import { SQL, type DbClient, type SqlParam } from '@/lib/db'   // 固定语句在那儿;按列现拼的片段仍在本文件

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH = 300 // 行/语句:jobs 43 列 × 300 行 ≈ 1.3 万参数(PG 上限 65535),JD 正文大也控住单语句体积

const isoDate = (s?: string) => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// mart 文件里一格的值:JSON 放得下的任意形(jsonb 列真会是对象/数组)。原先写 unknown,
// 2026-08-21 禁 unknown 后照实声明 —— 本文件是 raw JSON → DB 的边界,值的真形状就是 JSON。
type MartValue = string | number | boolean | null | MartValue[] | { [k: string]: MartValue }
type Row = Record<string, MartValue>
type PgClient = DbClient   // 形状归 lib/db 的 types 管;本文件的事务体照旧不动(它已有 BEGIN/COMMIT/ROLLBACK/finally release)

// 分批多行 INSERT(可带 ON CONFLICT 子句);返回 RETURNING 的行(未写 RETURNING 则为空)
async function insertBatch(client: PgClient, table: string, cols: string[], rows: Row[], suffix = ''): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const params: MartValue[] = []
    const values = chunk
      .map((r, ri) => '(' + cols.map((c, ci) => { params.push(r[c] ?? null); return `$${ri * cols.length + ci + 1}` }).join(',') + ')')
      .join(',')
    // 跨边界断言:jsonb 列的绑定值是对象/数组,不在 SqlParam 的标量联合里 —— pg 会按列类型
    // 序列化收下。SqlParam 不为 seed 一个调用方扩容,断言留在边界这一行。
    const res = await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${suffix}`, params as SqlParam[])
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
    ['designated_employers', 'designated_employers', ['name', 'province', 'location', 'is_tech', 'source', 'nocs', 'url', 'fetched'],
      (r) => ({ name: r.name, province: r.province, location: r.location, is_tech: r.isTech, source: r.source, nocs: r.nocs ?? '', url: r.url ?? '', fetched: r.fetched ?? '' })],
    // RCIP/FCIP 试点社区(E6-11):**先在生产跑 docs/sql/e6-11-pilot.sql**(建表 + 锁表补列)
    ['pilot_communities', 'pilot_communities', ['name', 'province', 'type', 'cities', 'url', 'fetched'],
      (r) => ({ name: r.name, province: r.province, type: r.type ?? '', cities: r.cities ?? '', url: r.url ?? '', fetched: r.fetched ?? '' })],
    // 社区 × 职业清单(E6-11 批B):**先跑 docs/sql/e6-11-pilot-b.sql**
    ['pilot_occupations', 'pilot_occupations', ['community', 'province', 'type', 'noc', 'title', 'sector_only', 'url', 'fetched'],
      (r) => ({ community: r.community, province: r.province ?? '', type: r.type ?? '', noc: r.noc ?? '', title: r.title ?? '', sector_only: !!r.sectorOnly, url: r.url ?? '', fetched: r.fetched ?? '' })],
    // 社区名额状态(旧账立项 2026-08-15):**先在生产跑 docs/sql/pilot-quota.sql**(建表 + 锁表补列)
    // ⚠️ first_come/per_intake/remaining 保持可空 —— 空 = 官网没写,不是 0/false,禁 `?? 0` / `!!`
    ['pilot_quota', 'pilot_quota',
      ['community', 'province', 'type', 'noc', 'status', 'first_come', 'first_come_quote', 'first_come_url', 'per_intake', 'per_intake_quote', 'per_intake_url', 'remaining', 'remaining_quote', 'remaining_url', 'quote', 'url', 'as_of'],
      (r) => ({ community: r.community, province: r.province ?? '', type: r.type ?? '', noc: r.noc ?? '', status: r.status ?? '',
        first_come: r.firstCome ?? null, first_come_quote: r.firstComeQuote ?? '', first_come_url: r.firstComeUrl ?? '',
        per_intake: r.perIntake ?? null, per_intake_quote: r.perIntakeQuote ?? '', per_intake_url: r.perIntakeUrl ?? '',
        remaining: r.remaining ?? null, remaining_quote: r.remainingQuote ?? '', remaining_url: r.remainingUrl ?? '',
        quote: r.quote ?? '', url: r.url ?? '', as_of: r.asOf ?? '' })],
    // 职业在招量聚合(2026-08-12):**先在生产跑 docs/sql/noc-openings.sql**(建表 + 补
    // payload_locked_documents_rels 的列),否则这段 INSERT 撞 42P01/42703 → 整个 seed 事务回滚
    ['noc_openings', 'noc_openings', ['noc', 'open', 'eligible', 'median_salary', 'broad', 'title', 'title_zh', 'title_zh_short', 'title_ko_short', 'title_en_short'],
      (r) => ({ noc: r.noc, open: r.open, eligible: r.eligible, median_salary: r.medianSalary, broad: r.broad, title: r.title, title_zh: r.titleZh, title_zh_short: r.titleZhShort, title_ko_short: r.titleKoShort, title_en_short: r.titleEnShort })],
    ['noc_categories', 'noc_categories', ['broad', 'mid', 'fine', 'teer', 'broad_en', 'broad_ko', 'mid_en', 'mid_ko', 'fine_en', 'fine_ko'],
      (r) => ({ broad: r.broad, mid: r.mid, fine: r.fine, teer: r.teer, broad_en: r.broadEn, broad_ko: r.broadKo, mid_en: r.midEn, mid_ko: r.midKo, fine_en: r.fineEn, fine_ko: r.fineKo })],
    ['sources', 'sources', ['name'], (r) => ({ name: r.name })],
    ['experience_levels', 'experience_levels', ['name'], (r) => ({ name: r.name })],
    ['pnp_occupations', 'pnp_occupations', ['province', 'stream', 'label', 'type', 'program', 'noc', 'name', 'gta_restricted', 'applies_to', 'url', 'fetched'],
      (r) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, program: r.program || 'PNP', noc: r.noc, name: r.name, gta_restricted: r.gtaRestricted, applies_to: r.appliesTo ?? '', url: r.url, fetched: r.fetched })],
    // ⚠️ stream_zh 是 #280 新列:必须先在生产跑 docs/sql/pnp-draws-stream-zh.sql,
    // 否则这一段撞 42703 → 整个 seed 事务回滚(表现为 /seed 500、无 body)
    ['pnp_draws', 'pnp_draws', ['province', 'kind', 'draw_date', 'stream', 'stream_zh', 'score', 'scale', 'invitations', 'note', 'label', 'url', 'fetched'],
      (r) => ({ province: r.province, kind: r.kind, draw_date: r.drawDate, stream: r.stream, stream_zh: r.streamZh ?? null, score: r.score, scale: r.scale, invitations: r.invitations, note: r.note, label: r.label, url: r.url, fetched: r.fetched })],
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
    // G9 联邦官方计分表(决策引擎事实表,不是 /jobs 筛选维度):CRS 排名分 + FSW 67 分选择因素同表,grid 列分
    // ⚠️ 建表必须先在生产跑 docs/sql/g9-ee-points-grid.sql(含 payload_locked_documents_rels.ee_points_grid_id),
    //    否则这一段撞 42703 → 整个 seed 事务回滚(表现为 /seed 500、无 body)
    // ⚠️ points 保持可空 —— 官方「n/a」「Not eligible to apply」一律 null + points_text 存原文,禁 `?? 0`
    // ⚠️ 列名 table_no / column_label:官方那两个字段叫 table / column,两个都是 SQL 保留字
    ['ee_points_grid', 'ee_points_grid',
      ['grid', 'section', 'section_label', 'kind', 'table_no', 'heading', 'factor', 'criterion', 'column_label', 'points', 'points_text', 'seq', 'url', 'fetched'],
      (r) => ({ grid: r.grid, section: r.section, section_label: r.sectionLabel, kind: r.kind, table_no: r.tableNo, heading: r.heading, factor: r.factor, criterion: r.criterion, column_label: r.columnLabel, points: r.points ?? null, points_text: r.pointsText, seq: r.seq, url: r.url, fetched: r.fetched })],
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
      // E13-02 v3(把脉首页):new30d/new30d_prev/mom30d/new14d_prev/mom14d/closed30d/net30d/avg_days_open/pulse_score
      // ——改列后同样要清 seed_state('stats_occupation')
      // E13-05:pnp_provs(真口径可提名省份,只在 province='all' 行有值)——同样要清 seed_state('stats_occupation')
      // E13-07:channel_tier(通道档 both/prov/fed/ee/employer,全国行有值)
      // E13-08:dead_provs(完全无路可走的省,全国行;空串=处处有路,NULL=TEER 未分类不判)
      // E13-09:pnp_provs 收紧为「拿 offer 即可」;pnp_provs_cond=「先省内工作 6 个月」
      // E14-02:担保率四列(sponsor_pos_q/sponsor_pos_skilled_q=担保侧分子,jvws_vac_q=JVWS 官方空缺分母,
      // sponsor_rate=分子/分母 0-1 小数)——改列后同样要清 seed_state('stats_occupation')
      ['noc', 'province', 'title_zh', 'title_zh_short', 'title_en', 'teer', 'broad', 'mid', 'fine', 'open_jobs', 'new7d', 'median_wage_annual', 'wage_low_annual', 'wage_high_annual', 'median_salary_annual', 'salary_n', 'named_jobs', 'fetched', 'new30d', 'new30d_prev', 'mom30d', 'new14d', 'new14d_prev', 'mom14d', 'closed30d', 'net30d', 'avg_days_open', 'pulse_score', 'pnp_provs', 'channel_tier', 'dead_provs', 'pnp_provs_cond', 'sponsor_pos_q', 'sponsor_pos_skilled_q', 'jvws_vac_q', 'sponsor_rate', 'sponsor_evidence'],
      (r) => ({ noc: r.noc, province: r.province, title_zh: r.titleZh, title_zh_short: r.titleZhShort, title_en: r.titleEn, teer: r.teer, broad: r.broad, mid: r.mid, fine: r.fine,
                open_jobs: r.openJobs, new7d: r.new7d, median_wage_annual: r.medianWageAnnual, wage_low_annual: r.wageLowAnnual, wage_high_annual: r.wageHighAnnual, median_salary_annual: r.medianSalaryAnnual,
                salary_n: r.salaryN, named_jobs: r.namedJobs, fetched: r.fetched,
                new30d: r.new30d ?? null, new30d_prev: r.new30dPrev ?? null, mom30d: r.mom30d ?? null,
                new14d: r.new14d ?? null, new14d_prev: r.new14dPrev ?? null, mom14d: r.mom14d ?? null,
                closed30d: r.closed30d ?? null, net30d: r.net30d ?? null,
                avg_days_open: r.avgDaysOpen ?? null, pulse_score: r.pulseScore ?? null,
                pnp_provs: r.pnpProvs ?? null, channel_tier: r.channelTier ?? null, dead_provs: r.deadProvs ?? null,
                pnp_provs_cond: r.pnpProvsCond ?? null,
                sponsor_pos_q: r.sponsorPosQ ?? null, sponsor_pos_skilled_q: r.sponsorPosSkilledQ ?? null,
                jvws_vac_q: r.jvwsVacQ ?? null, sponsor_rate: r.sponsorRate ?? null, sponsor_evidence: r.sponsorEvidence ?? null })],
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
  const client: PgClient = await dbOf(payload).connect()
  let closed = 0
  let closedDead = 0   // 实测判死立即下架的条数(与上面「本次未见+30天」那条分开计,好在响应里看清谁在干活)
  try {
    await client.query('BEGIN')
    // #118 表级哈希态(响应计数:-1=本轮无上传跳过,-2=内容与上轮一致跳过,-3=表还没建/DDL 未跑)
    await client.query('CREATE TABLE IF NOT EXISTS seed_state (name text PRIMARY KEY, hash text NOT NULL)')
    const prevHash: Record<string, string> = {}
    for (const r of (await client.query(SQL.SEED_STATE_ALL)).rows) prevHash[r.name] = r.hash
    const markState = (name: string, hash: string) =>
      client.query(SQL.SEED_STATE_UPSERT, [name, hash])

    // ── 维度表:清空 + 批量插入(先清 locked_documents_rels 关联列,B7 教训:漏了会整事务炸) ──
    for (const [file, table, cols, map] of dims) {
      // E12-03 防线升级(22c8d6a 空灌事故防线的延伸):mart **文件缺失** = 该表本轮没上传(新表未产出/分表上传)
      // → 跳过保留现有行,不再「清空+重灌 0 行」。要真清空一张维度表 = 上传内容为 [] 的文件(显式意图)。
      if (martPaths(file).length === 0) { counts[table] = -1; continue }   // -1 = skipped(本轮无该表上传)
      // -3 = **表还没建**(DDL 与部署有先后)。seed 整个跑在一个事务里,撞 42P01 会让**这一轮全部回滚** ——
      // 一张新表的 SQL 还没在生产跑,就能把每小时一次的灌库整个停掉。to_regclass 查不到只返回 null,
      // 不抛错、也不污染事务(2026-08-12 随 noc_openings 新表一并加的闸)。
      if (!(await client.query(SQL.TABLE_EXISTS, [table])).rows[0]?.t) { counts[table] = -3; continue }
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
        median_salary_annual: r.medianSalaryAnnual, named_jobs: r.namedJobs, closed: r.closed ?? null,
        created_at: now, updated_at: now,
      })).filter((r) => r.date && r.province)
      await insertBatch(client, 'stats_daily',
        ['date', 'province', 'broad', 'open_jobs', 'new7d', 'median_salary_annual', 'named_jobs', 'closed', 'created_at', 'updated_at'],
        dailyRows,
        `ON CONFLICT (date, province, broad) DO UPDATE SET open_jobs=EXCLUDED.open_jobs, new7d=EXCLUDED.new7d,
         median_salary_annual=EXCLUDED.median_salary_annual, named_jobs=EXCLUDED.named_jobs, closed=EXCLUDED.closed, updated_at=EXCLUDED.updated_at`)
      counts.stats_daily = dailyRows.length
    }

    // ── news:按 slug upsert(E12-06 P1f)──────────────────────────
    // 懒翻译/速读缓存列(body_zh/body_ko/summary_zh/summary_ko/summary_en)由 /api/news-translate、
    // /api/news-summarize 线上写入,seed 不许碰——除非该条 body_en 变了(重抽正文)才连带清缓存(防错位陈译)。
    // 滚出 60 条窗口的行删除;mart 缺文件=跳过(与 dims 同防线)。预翻批若恢复(budget>0)需同步调整此块。
    if (martPaths('news').length > 0 && prevHash['news'] === martHash('news')) { counts.news = -2 }
    else if (martPaths('news').length > 0) {
      const newsRows = (await mart('news')).filter((r: any) => r.slug).map((r: any) => ({
        region: r.region, title: r.title, title_zh: r.titleZh ?? null, date: r.date, slug: r.slug, url: r.url, og_image: r.ogImage,
        excerpt: r.excerpt, importance: r.importance, importance_note: r.importanceNote,
        body_en: r.bodyEn, citation: r.citation, fetched: r.fetched, created_at: now, updated_at: now,
      }))
      const newsCols = ['region', 'title', 'title_zh', 'date', 'slug', 'url', 'og_image', 'excerpt', 'importance', 'importance_note', 'body_en', 'citation', 'fetched', 'created_at', 'updated_at']
      const newsUpdate = newsCols.filter((c) => !['slug', 'created_at'].includes(c)).map((c) => `${c}=EXCLUDED.${c}`).join(',')
      const staleClear = ['body_zh', 'body_ko', 'summary_zh', 'summary_ko', 'summary_en']
        .map((c) => `${c}=CASE WHEN news.body_en IS DISTINCT FROM EXCLUDED.body_en THEN NULL ELSE news.${c} END`).join(',')
      await client.query(SQL.NEWS_UNLOCK_ALL)
      if (newsRows.length) await client.query(SQL.NEWS_DELETE_MISSING, [newsRows.map((r) => r.slug)])
      await insertBatch(client, 'news', newsCols, newsRows,
        `ON CONFLICT (slug) DO UPDATE SET ${staleClear}, ${newsUpdate}`)
      await markState('news', martHash('news'))
      counts.news = newsRows.length
    } else { counts.news = -1 }

    if (reset) {
      await client.query(SQL.RESET_UNLOCK_JOBS_COMPANIES)
      await client.query(SQL.RESET_DELETE_JOBS)
      await client.query(SQL.RESET_DELETE_COMPANIES)
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
        // B4 时间窗(近 4/2/1 季;docs/sql/b4-lmia-windows.sql 先行)
        lmia_positions_4q: c.lmiaPositions4q, lmia_positions_2q: c.lmiaPositions2q, lmia_positions_1q: c.lmiaPositions1q,
        // #286 职业拆分(近两年 NOC→岗位数 JSON 串;docs/sql/se286-lmia-nocs.sql 先行)
        lmia_nocs: c.lmiaNocs ?? null,
        // E12-08:担保档(药丸)+ 四维档明细(jsonb);盒过渡期缺键 → COALESCE 保旧值(GAP1 惯例)
        sponsor_grade: c.sponsorGrade ?? null,
        score_detail: c.scoreDetail ? JSON.stringify(c.scoreDetail) : null,
        created_at: now, updated_at: now,
      })
    }
    const companyCols = ['slug', 'name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled', 'lmia_positions_4q', 'lmia_positions_2q', 'lmia_positions_1q', 'lmia_nocs', 'sponsor_grade', 'score_detail', 'created_at', 'updated_at']
    // 跳过未变行(2026-07-25):upsert 原本无条件重写每一行(含没变的),companies 2.6万 + jobs 4.3万
    // 全量重写把整轮从秒级抬到 100s+,必撞代理 ~100s 上限 —— 客户端每轮记「seed 失败」,alerts 连带停摆。
    // DO UPDATE 加 WHERE「任一业务列真变了才写」:普通列比 EXCLUDED,COALESCE 列比 COALESCE 后的终值
    // (与 SET 子句一一对应);updated_at 不参与比较,数据没变就不该跳。语义与原版唯一差异:
    // 未变行的 updated_at 不再逐轮刷新 —— 全库无按 jobs/companies.updated_at 排序/过滤的查询,已核。
    const companyPlain = ['name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source',
      'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled', 'lmia_positions_4q', 'lmia_positions_2q', 'lmia_positions_1q', 'lmia_nocs']
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
    for (const r of (await client.query(SQL.COMPANIES_IDS_BY_SLUGS,
      [Array.from(seenSlug)])).rows) companyId[r.slug] = r.id
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
      'source_label', 'origin', 'accessibility', 'score', 'grade_channel', 'score_detail', 'pnp_eligible', 'pnp_stream', 'ee_category', 'aip', 'pilot', 'pilot_community', 'pilot_employer', 'pilot_occ', 'apprentice_friendly',
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
          pilot: j.pilot ?? '', pilot_community: j.pilotCommunity ?? '', pilot_employer: !!j.pilotEmployer, pilot_occ: j.pilotOcc ?? '',
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
        await client.query(SQL.TEMP_DEAD_EXT)
        await insertBatch(client, 'dead_ext', ['external_id', 'closed_at'], deadRows)
        await client.query('ANALYZE dead_ext')
        const r = await client.query(
          SQL.CLOSE_DEAD_EXT, [now])
        closedDead = r.rowCount ?? 0
      }
    }

    // ── 「本轮见过」名单(2026-08-04 数据销毁修)──
    // 病根:seenIds 原来 = mart.jobs 的 externalId,而 mart.jobs 已被 09 的**展示去重**(company|title,
    // 不含城市)砍过一刀;被砍掉的帖因此退出「见过」集,满 30 天被下面那条规则静默 closed —— 可它们
    // 在官方仍在招(抽样 60%),在 DB 里也不算重复(DB 判重是 company×title×city)。展示去重与下架对账
    // 从此解耦:09 另出一张 seen_ids(本轮源数据里真实见到、未判死的全部 posting id)。
    // ⚠️ 防线(最危险的回归:名单缺失把全库下架):**只做并集,不做替换**——
    //   ① seen_ids 文件缺失/为空 → 集合退回等于 mart.jobs 的 id(= 修改前的老行为),不会变空;
    //   ② seen_ids 在 → 集合是老行为的超集,只可能少下架、绝不可能多下架;
    //   ③ 集合为空仍走下面 `size > 0` 的老闸门,直接跳过下架。
    //   任何一步读文件失败都会抛错 → 整事务回滚(martPaths 对「目录都不存在」也是抛错不是空表)。
    for (const p of martPaths('seen_ids')) {
      for (const id of JSON.parse(fs.readFileSync(p, 'utf8')) as string[]) {
        if (id && !seenExt.has(id)) { seenExt.add(id); seenIds.push(id) }
      }
    }
    counts.seen_ids = seenIds.length

    // ── 下架(非 reset):只下架「本次未见 且 发布已超 EXPIRE_DAYS 天」的岗 ──
    // 不用「本次没出现就 closed」对账:增量抓取只含最近几天,会误杀仍在招的旧岗(实测 805,见 docs/source-framework.md)
    const EXPIRE_DAYS = 30
    // seenIds 为空(jobs + seen_ids 两张 mart 都缺/空)时跳过:空清单会把所有 30 天以上的旧岗一锅端下架
    if (!reset && seenIds.length > 0) {
      const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400000).toISOString()
      // 本次见到的 external_id 灌进带主键的临时表,下架走 NOT EXISTS 反连接。
      // 原 `NOT (external_id = ANY($seenIds))`:5.2 万元素数组对每个候选行线性搜(≈ 待检行 × 5.2万),
      // 库涨到 5 万岗后超线性变慢 → seed 整轮撞 180s 超时(mart 已传但灌不进库)。
      // 临时表主键让反连接走索引/哈希探测,下架从超时降到秒级;ON COMMIT DROP 随本事务清理。
      await client.query(SQL.TEMP_SEEN_EXT)
      // 单列表灌 5 万行走 unnest 一条语句(原 insertBatch 300 行/句 ≈ 164 次往返;并入 seen_ids 后名单从
      // 3.4 万涨到 4.9 万,别把往返数也一起涨)。数组参数只占 1 个占位符,不碰 65535 上限。
      await client.query(SQL.SEEN_EXT_INSERT, [seenIds])
      await client.query('ANALYZE seen_ext')  // 临时表无自动统计,喂给规划器选反连接计划
      const r = await client.query(
        SQL.CLOSE_STALE,
        [now, cutoff])
      closed = r.rowCount ?? 0
    }

    // #125(批C 修正):重复(同 公司×岗名×城市)跨轮累积在 DB——同岗重发 externalId 会换,单轮 mart
    // 快照内每岗唯一,ETL 侧标记恒 0(首跑实锤)→ 改本事务内窗口全量重算(open ~42k 行实测 ~6s,
    // 每轮一次服务端,非请求路径;IS DISTINCT FROM 守卫只写真变化的行)。保最新:date_posted 新者,同日 id 大者
    await client.query(SQL.MARK_DUPS)
    await client.query(SQL.CLEAR_DUPS_CLOSED)

    // 2026-07-26:ETL 心跳 —— 每轮 seed 成功都写一笔,前端「最近核对」读它(docs/sql/etl-heartbeat.sql)。
    // 与 max(last_seen) 的区别:数据没变也照样动,回答的是「刚核对过官方来源」而不是「数据变过」。
    // 表未落地(部署时序)→ 42P01 忽略,不能让心跳把整轮灌库回滚。
    await client.query(SQL.HEARTBEAT_UPSERT).catch((e: any) => {
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
