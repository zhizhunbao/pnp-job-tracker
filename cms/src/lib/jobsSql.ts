// 职位数据访问层(DAL)—— 一领域一文件:职位相关的**所有 SQL + 行映射 + match** 都在这里,
// 路由/页面/提醒只调函数、不写裸 SQL(E10-01 收拢;Frank「所有职位 SQL 拆一个文件」)。
// 列名是 Payload snake_case(老坑 5):改 Jobs schema 只动这里。
import { match, matchRank, type MatchDims, type MatchJob, type MatchProfile } from './match'
import { FREE_MATCH_JOBS_PER_DAY } from './plan'
import type { JobRow } from '@/app/(frontend)/jobs/JobsTable'

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字

// ═══════════════════════════════════════════════════════════════════════════
// 1) 筛选/排序 → SQL 片段(E5-03 邮件提醒 + E10-01 列表 共用的单一 WHERE 真相)
//    键名 = /jobs 前端筛选 state 原样(fProv/fCity/q/directOnly…);阈值逐字对齐旧前端谓词。
// ═══════════════════════════════════════════════════════════════════════════

const PROV_CODE: Record<string, string> = {
  'Ontario': 'ON', 'British Columbia': 'BC', 'Alberta': 'AB', 'Quebec': 'QC', 'Manitoba': 'MB',
  'Saskatchewan': 'SK', 'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
  'Prince Edward Island': 'PE',
}

// 搜索覆盖面:核心列(E10-01 拍板)——职位/公司/省市区/NOC 码/来源标签;分类中文标签后续 query→码补。
// 2026-07-19 搜索提速(Frank「搜索要 7-8 秒」,API 实测 3-5s):
// ① c.name 从 OR 里挪出改 company_id IN 子查询——跨表 OR 谓词让 planner 只能全表扫;
// ② province 存 2 字码,q>2 时 '%q%' 不可能命中,砍掉该分支(不可索引的死分支会毁位图 OR 计划);
// ③ 剩余分支配 pg_trgm GIN(docs/sql/search-trgm-indexes.sql,生产 DDL)→ 位图 OR 走索引。
const SEARCH_COLS = ['j.title', 'j.city', 'j.district', 'j.noc', 'j.source_label']

export type JobsWhere = { sql: string; params: unknown[]; skipped: string[] }

/** q 搜索公司名分支预解析:不限 LIMIT 保语义等价(全量 2 万公司的极端泛词也就 ~2 万 int,ANY 哈希扛得住) */
export async function resolveQCompanyIds(pool: any, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
  const q = typeof filters.q === 'string' ? filters.q.trim() : ''
  if (!q) return filters
  const { rows } = await pool.query(`SELECT id FROM companies WHERE name ILIKE $1`, [`%${q}%`])   // 不转义:与 jobs 侧 ILIKE 分支同口径
  return { ...filters, qCompanyIds: rows.map((r: any) => Number(r.id)) }
}

// 契约:返回 { sql(条件串,无 WHERE 前缀,空=TRUE), params, skipped };startIndex=占位符起始($N)。
export function buildJobsWhere(filters: Record<string, unknown>, startIndex = 1): JobsWhere {
  const conds: string[] = []
  const params: unknown[] = []
  const skipped: string[] = []
  const param = (v: unknown) => { params.push(v); return `$${startIndex + params.length - 1}` }
  const s = (k: string) => (typeof filters[k] === 'string' ? (filters[k] as string).trim() : '')
  const isOn = (k: string) => filters[k] === true || filters[k] === 'true' || filters[k] === '1'

  if (s('q')) {
    const ph = param(`%${s('q')}%`)
    const cols = s('q').length <= 2 ? [...SEARCH_COLS, 'j.province'] : SEARCH_COLS
    const branches = cols.map((c) => `${c} ILIKE ${ph}`)
    // 公司名分支:qCompanyIds=调用方经 resolveQCompanyIds 预查(companies trgm 索引,ms 级)——
    // `= ANY(数组)` 才能与 trgm 分支一起进位图 OR;IN(子查询) 计划期不可索引,整个 OR 退化全表扫(EXPLAIN 实锤)。
    const ids = filters.qCompanyIds
    if (Array.isArray(ids)) { if (ids.length) branches.push(`j.company_id = ANY(${param(ids)})`) }
    else branches.push(`j.company_id IN (SELECT id FROM companies WHERE name ILIKE ${ph})`)   // 未预查回退(语义同,慢)
    conds.push(`(${branches.join(' OR ')})`)
  }

  if (s('company')) conds.push(`c.name = ${param(s('company'))}`)   // 精确公司名(advisor「同公司在榜岗」用)
  if (s('fCountry')) conds.push(`j.country = ${param(s('fCountry'))}`)
  if (s('fProv')) conds.push(`j.province = ${param(PROV_CODE[s('fProv')] || s('fProv'))}`)
  if (s('fCity')) conds.push(`j.city = ${param(s('fCity'))}`)
  if (s('fDistrict')) conds.push(`j.district = ${param(s('fDistrict'))}`)

  if (s('fBroad')) conds.push(`j.broad = ${param(s('fBroad'))}`)
  if (s('fMid')) conds.push(`j.mid = ${param(s('fMid'))}`)
  if (s('fFine')) conds.push(`j.fine = ${param(s('fFine'))}`)
  if (s('fTeer')) {
    if (s('fTeer') === '未分类') conds.push(`j.teer IS NULL`)
    else { const m = /(\d)/.exec(s('fTeer')); if (m) conds.push(`j.teer = ${param(Number(m[1]))}`) }
  }

  if (s('fSource')) conds.push(`j.source_label = ${param(s('fSource'))}`)
  if (s('fAcc')) conds.push(`j.accessibility = ${param(s('fAcc'))}`)

  if (s('fPnp') === 'yes') conds.push(`COALESCE(j.pnp_eligible,false) = true`)
  else if (s('fPnp') === 'no') conds.push(`COALESCE(j.pnp_eligible,false) = false AND COALESCE(j.province,'') <> 'QC'`)
  if (s('fAip') === 'yes') conds.push(`COALESCE(j.aip,false) = true`)
  else if (s('fAip') === 'no') conds.push(`COALESCE(j.aip,false) = false`)

  if (s('fStatus')) conds.push(`COALESCE(j.status,'open') = ${param(s('fStatus'))}`)
  if (s('fOrigin')) conds.push(`j.origin = ${param(s('fOrigin'))}`)

  if (s('fScore') === 'high') conds.push(`j.score >= 75`)
  else if (s('fScore') === 'mid') conds.push(`j.score >= 50 AND j.score < 75`)
  else if (s('fScore') === 'low') conds.push(`j.score < 50`)

  if (s('fSal') === 'ge100') conds.push(`j.salary_annual >= 100000`)
  else if (s('fSal') === '80') conds.push(`j.salary_annual >= 80000 AND j.salary_annual < 100000`)
  else if (s('fSal') === '60') conds.push(`j.salary_annual >= 60000 AND j.salary_annual < 80000`)
  else if (s('fSal') === 'u60') conds.push(`j.salary_annual < 60000`)

  if (s('fVs') === 'above' || s('fVs') === 'above20' || s('fVs') === 'below') {
    const guard = `j.salary_annual IS NOT NULL AND j.wage_med_annual IS NOT NULL AND j.wage_med_annual <> 0`
    const cmp = s('fVs') === 'above' ? `j.salary_annual >= j.wage_med_annual`
      : s('fVs') === 'above20' ? `j.salary_annual >= 1.2 * j.wage_med_annual`
        : `j.salary_annual < j.wage_med_annual`
    conds.push(`(${guard} AND ${cmp})`)
  }

  if (s('fEmp') === 'full' || s('fEmp') === 'part') conds.push(`j.employment_hours = ${param(s('fEmp'))}`)
  else if (s('fEmp') === 'gig') conds.push(`(j.employment_hours = 'part' OR j.employment_term IN ('casual','seasonal'))`)

  if (isOn('directOnly')) conds.push(`(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')`)

  // GAP1③:排除 JD 明确不担保/须 PR 的岗(红旗=数据层 visa_flag 检测;未检出=通过,宁可漏不误伤)
  if (s('fElig') === 'ok') conds.push(`COALESCE(j.eligibility_flag,'') = ''`)

  return { sql: conds.length ? conds.join(' AND ') : 'TRUE', params, skipped }
}

// 排序白名单(列 key → SQL 列/表达式):防注入,未知 key 回退发布时间。默认序=发布时间↓,同序评分↓、id↓ 兜底唯一。
// 2026-07-18 Frank 报「字段排序不好使」修:E10 服务端化时这里只搬了 9 个 key,前端表头却全列可点,
// 白名单外的列静默回退发布时间序=看着像坏了——按前端 COLUMNS 补齐;match 列无 SQL 语义不进白名单。
const SORT_COLUMNS: Record<string, string> = {
  // E12-08:评分列改「通道」——排序主键=通道档,orderBy tail 的 j.score DESC 兜底同档内次序
  datePosted: 'j.date_posted', score: 'j.grade_channel', salary: 'j.salary_annual', salaryYr: 'j.salary_annual',
  lastSeen: 'j.last_seen', title: 'j.title', company: 'c.name', province: 'j.province', city: 'j.city',
  broad: 'j.broad', mid: 'j.mid', fine: 'j.fine', teer: 'j.teer', noc: 'j.noc',
  accessibility: 'j.accessibility', country: 'j.country', district: 'j.district', address: 'j.address',
  source: 'j.source_label', origin: 'j.origin',
  direct: `(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')`,   // 与 directOnly 筛选同一谓词
  pnp: 'j.pnp_eligible', ee: 'j.ee_category', aip: 'j.aip', lmia: 'c.lmia_positions',
  eligibility: `COALESCE(j.eligibility_flag,'')`,   // GAP1③:红旗岗聚一起看

  status: 'j.status', closedAt: 'j.closed_at',
  empHours: `COALESCE(j.employment_hours,'')`, empTerm: `COALESCE(j.employment_term,'')`,   // J1 两列(#73 教训:前端可点列必须进白名单)
  wageMedHr: 'j.wage_med_hourly', wageMedYr: 'j.wage_med_annual',
  vsMedian: '(j.salary_annual::float / NULLIF(j.wage_med_annual, 0))',
}
// Pro 数据列(中位三件套):免费用户数据已剥离,若仍按它排序=锁列信息从行序泄露 → 非 Pro 回退默认序
const PRO_SORTS = new Set(['wageMedHr', 'wageMedYr', 'vsMedian'])
export function orderByClause(sortKey?: string, dir?: string, pro = true): string {
  const key = sortKey && (pro || !PRO_SORTS.has(sortKey)) ? sortKey : undefined
  const col = (key && SORT_COLUMNS[key]) || 'j.date_posted'
  const d = dir === 'asc' ? 'ASC' : 'DESC'
  const tail = col === 'j.score' ? 'j.id DESC' : 'j.score DESC NULLS LAST, j.id DESC'
  return `ORDER BY ${col} ${d} NULLS LAST, ${tail}`
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) 列集 / FROM / 行映射 / match(读库口径,列表与首屏共用)
// ═══════════════════════════════════════════════════════════════════════════

// 维度行映射(match 引擎口径;/api/jobs-data 自取维度时与 page.tsx 同一把尺)
export const mapPnpOcc = (r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })
export const mapEeCat = (r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })

const JOB_COLUMNS = `j.id, j.title, c.name AS company_name, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
  c.website AS company_website, c.website_source,
  c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams, c.lmia_positions_skilled, c.sponsor_grade,
  j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.grade_channel, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip,
  j.employment_term, j.employment_hours, j.certificates, j.education, j.eligibility_flag, j.eligibility_quote,
  j.country, j.province, j.city, j.district, j.address, j.region,
  j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
  j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
  j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at`
const JOB_FROM = `FROM jobs j LEFT JOIN companies c ON c.id = j.company_id`

// 行映射(不含 match;match 由调用方按人/序算好传入)。Pro 列(工资中位三件套)免费用户置空 —— 不进浏览器。
export function mapJobRow(j: any, pro: boolean, matchLevel: JobRow['match']): JobRow {
  return {
    match: matchLevel,
    id: j.id,
    title: j.title ?? '',
    company: j.company_name ?? '',
    companyDescription: j.company_description ?? '',
    companySectors: j.company_sectors ?? '',
    companyWebsiteSrc: j.website_source ?? '',
    lmiaPositions: num(j.lmia_positions),
    lmiaPositionsSkilled: num(j.lmia_positions_skilled),
    lmiaLastQuarter: j.lmia_last_quarter ?? '',
    lmiaStreams: j.lmia_streams ?? '',
    address: j.address ?? j.company_address ?? '',
    source: j.source ?? '',
    sourceLabel: j.source_label ?? '',
    origin: j.origin ?? '',
    country: j.country ?? '',
    province: j.province ?? '',
    city: j.city ?? '',
    district: j.district ?? '',
    noc: j.noc ?? '',
    category: j.category ?? '',
    teer: num(j.teer),
    broad: j.broad ?? '未分类',
    mid: j.mid ?? '未分类',
    fine: j.fine ?? '未分类',
    accessibility: j.accessibility ?? '',
    score: num(j.score),
    // E12-08:通道档(1-5,主表「通道」列免费展示)+ 公司担保档(药丸);三维明细不进列表行(额度 API 专供)
    gradeChannel: num(j.grade_channel),
    sponsorGrade: num(j.sponsor_grade),
    pnpEligible: !!j.pnp_eligible,
    pnpStream: j.pnp_stream ?? '',
    eeCategory: j.ee_category ?? '',
    aip: !!j.aip,
    employmentTerm: j.employment_term ?? '',
    employmentHours: j.employment_hours ?? '',
    eligibilityFlag: j.eligibility_flag ?? '',
    eligibilityQuote: j.eligibility_quote ?? '',
    certificates: Array.isArray(j.certificates) ? j.certificates : [],
    education: j.education ?? '',
    salary: j.salary ?? '',
    salaryAnnual: num(j.salary_annual),
    salaryText: j.salary_text ?? '',
    wageMedHourly: pro ? num(j.wage_med_hourly) : null,
    wageMedAnnual: pro ? num(j.wage_med_annual) : null,
    wageLowHourly: pro ? num(j.wage_low_hourly) : null,
    wageLowAnnual: pro ? num(j.wage_low_annual) : null,
    wageHighHourly: pro ? num(j.wage_high_hourly) : null,
    wageHighAnnual: pro ? num(j.wage_high_annual) : null,
    wageYear: pro ? (j.wage_year ?? '') : '',
    officialUrl: j.official_url ?? j.company_website ?? '',
    applyUrl: j.apply_url ?? '',
    datePosted: iso(j.date_posted),
    firstSeen: iso(j.first_seen),
    lastSeen: iso(j.last_seen),
    status: j.status ?? 'open',
    closedAt: iso(j.closed_at),
  }
}

// match 计算器(规则在 lib/match.ts 一处):按人逐行算 level;免费用户仅默认序前 N 岗返回 level(激活钩子),
// 未建档/未登录返回 null。第二参 globalIdx=该行在结果序中的全局下标(分页时=page*pageSize+i),供免费 cap 判定。
type Matcher = { of: (j: any, globalIdx: number) => JobRow['match']; high: () => number; mid: () => number }
function makeMatcher(profile: MatchProfile, profileOk: boolean, matchDims: MatchDims, pro: boolean): Matcher {
  let high = 0, mid = 0
  return {
    of: (j, globalIdx) => {
      if (!profileOk) return null
      const mj: MatchJob = {
        noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
        pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
        lmiaPositions: num(j.lmia_positions), lmiaPositionsSkilled: num(j.lmia_positions_skilled), lmiaLastQuarter: j.lmia_last_quarter ?? '',
      }
      const level = match(profile, mj, matchDims).level
      if (level === 'high') high++
      else if (level === 'mid') mid++
      if (!pro && globalIdx >= FREE_MATCH_JOBS_PER_DAY) return null
      return level
    },
    high: () => high, mid: () => mid,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) 查询函数(路由/页面/提醒只调这些,不写裸 SQL)
// ═══════════════════════════════════════════════════════════════════════════

export type JobsListOpts = { pro: boolean; profile: MatchProfile; profileOk: boolean; matchDims: MatchDims; limit: number }

/** 一次性取前 limit 行:page.tsx SSR 首屏 50 行用(筛选/翻页走 /api/jobs 分页;E10-01 P5 已删旧 /api/jobs-data blob 端点)。 */
export async function fetchJobRows(pool: any, { pro, profile, profileOk, matchDims, limit }: JobsListOpts): Promise<{ jobs: JobRow[]; updatedAt: string; matchHigh: number; matchMid: number }> {
  const { rows } = await pool.query(
    `SELECT ${JOB_COLUMNS} ${JOB_FROM}
     ORDER BY j.date_posted DESC NULLS LAST, j.score DESC NULLS LAST, j.id DESC LIMIT $1`, [limit])
  const m = makeMatcher(profile, profileOk, matchDims, pro)
  const jobs = rows.map((j: any, i: number) => mapJobRow(j, pro, m.of(j, i)))
  const updatedAt = rows.reduce((acc: string, j: any) => { const ls = iso(j.last_seen); return ls > acc ? ls : acc }, '')
  return { jobs, updatedAt, matchHigh: m.high(), matchMid: m.mid() }
}

export type JobsPageOpts = {
  pro: boolean; profile: MatchProfile; profileOk: boolean; matchDims: MatchDims
  filters: Record<string, unknown>; sort?: { key?: string; dir?: string }; page: number; pageSize: number
}

// count/updatedAt 微缓存(2026-07-19「排序 3-4 秒」第二刀):换排序/翻页时 WHERE 不变,总数与全局
// 新鲜度没必要每次全表扫重算——按 WHERE 签名缓存 30s(数据小时级更新,30s 陈旧无感;Render 单实例)。
const countCache = new Map<string, { n: number; ts: number }>()
const COUNT_TTL = 30_000
let updCache: { v: string; ts: number } | null = null

/** E10-01:服务端筛选+排序+分页。返回当前页行 + 同 WHERE 总数(count)+ 全局 updatedAt(max last_seen)。 */
export async function fetchJobsPage(
  pool: any, { pro, profile, profileOk, matchDims, filters, sort, page, pageSize }: JobsPageOpts,
): Promise<{ jobs: JobRow[]; total: number; updatedAt: string }> {
  const w = buildJobsWhere(await resolveQCompanyIds(pool, filters), 1)
  const order = orderByClause(sort?.key, sort?.dir, pro)
  const limPh = `$${w.params.length + 1}`, offPh = `$${w.params.length + 2}`
  const now = Date.now()
  const cntKey = w.sql + '|' + JSON.stringify(w.params)
  const cachedCnt = countCache.get(cntKey)
  const cachedUpd = updCache && now - updCache.ts < COUNT_TTL ? updCache.v : null
  const [listRes, cntRes, updRes] = await Promise.all([
    pool.query(`SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE ${w.sql} ${order} LIMIT ${limPh} OFFSET ${offPh}`, [...w.params, pageSize, page * pageSize]),
    cachedCnt && now - cachedCnt.ts < COUNT_TTL ? null : pool.query(`SELECT count(*)::int n ${JOB_FROM} WHERE ${w.sql}`, w.params),
    cachedUpd ? null : pool.query(`SELECT max(last_seen) AS upd FROM jobs`),   // 全局新鲜度(与筛选无关)
  ])
  let total: number
  if (cntRes) {
    total = cntRes.rows[0]?.n ?? 0
    if (countCache.size > 300) countCache.clear()   // 粗暴防涨,300 组筛选签名足够日常
    countCache.set(cntKey, { n: total, ts: now })
  } else total = cachedCnt!.n
  let updatedAt: string
  if (updRes) { updatedAt = iso(updRes.rows[0]?.upd); updCache = { v: updatedAt, ts: now } }
  else updatedAt = cachedUpd!
  const m = makeMatcher(profile, profileOk, matchDims, pro)
  const base = page * pageSize
  const jobs = listRes.rows.map((j: any, i: number) => mapJobRow(j, pro, m.of(j, base + i)))
  return { jobs, total, updatedAt }
}

export type MatchPageOpts = {
  pro: boolean; profile: MatchProfile; matchDims: MatchDims; page: number; pageSize: number
  sort?: { key?: string; dir?: string }
}

// 匹配视图列排序取值器(第 21 轮续,Frank「排序点了 table 没变化」二报:普通视图 #73 已修,
// 匹配视图 fetchMatchPage 一直无视 sort——命中集在 TS 内存里,这里按列取原始行值排)
const MATCH_SORT_VAL: Record<string, (j: any) => unknown> = {
  datePosted: (j) => iso(j.date_posted), score: (j) => num(j.grade_channel), salary: (j) => num(j.salary_annual), salaryYr: (j) => num(j.salary_annual),
  lastSeen: (j) => iso(j.last_seen), title: (j) => j.title ?? '', company: (j) => j.company_name ?? '', province: (j) => j.province ?? '', city: (j) => j.city ?? '',
  broad: (j) => j.broad ?? '', mid: (j) => j.mid ?? '', fine: (j) => j.fine ?? '', teer: (j) => num(j.teer), noc: (j) => j.noc ?? '',
  accessibility: (j) => j.accessibility ?? '', country: (j) => j.country ?? '', district: (j) => j.district ?? '', address: (j) => j.address ?? '',
  source: (j) => j.source_label ?? '', origin: (j) => j.origin ?? '',
  pnp: (j) => (j.pnp_eligible ? 1 : 0), ee: (j) => j.ee_category ?? '', aip: (j) => (j.aip ? 1 : 0), lmia: (j) => num(j.lmia_positions),
  status: (j) => j.status ?? '', closedAt: (j) => iso(j.closed_at),
  wageMedHr: (j) => num(j.wage_med_hourly), wageMedYr: (j) => num(j.wage_med_annual),
  vsMedian: (j) => { const s = num(j.salary_annual); const m = num(j.wage_med_annual); return s != null && m ? s / m : null },
}

/**
 * E10-01 P3:「我的匹配」视图服务端化(替代旧 blob 客户端筛)。
 * 候选预筛(SQL 把 3 万压到只可能命中 high/mid 的:pnpEligible∪有EE类别∪NOC对口∪同小类)→ TS 跑 match() 留 high/mid
 * → 免费用户仅前 N 个可见(cap;FOMO 计数仍返全量 high/mid)→ 按 match 等级+日期序分页。
 * 预筛用并集从宽,宁可多算不漏(named-list 命中的岗基本都 pnpEligible,已被并集覆盖)。候选封顶防失控。
 */
export async function fetchMatchPage(
  pool: any, { pro, profile, matchDims, page, pageSize, sort }: MatchPageOpts,
): Promise<{ jobs: JobRow[]; total: number; matchHigh: number; matchMid: number; updatedAt: string }> {
  const nocs = profile.nocCodes || []
  const noc4 = Array.from(new Set(nocs.filter((c) => c.length === 5).map((c) => c.slice(0, 4))))
  const CAND_CAP = 12000  // 候选封顶:按新鲜度取最近 N 个候选,防全表 TS 计算失控(足够覆盖真实匹配)
  const [candRes, updRes] = await Promise.all([
    pool.query(
      `SELECT ${JOB_COLUMNS} ${JOB_FROM}
       WHERE (COALESCE(j.pnp_eligible,false) OR COALESCE(j.ee_category,'') <> '' OR j.noc = ANY($1) OR LEFT(j.noc,4) = ANY($2))
       ORDER BY j.date_posted DESC NULLS LAST, j.score DESC NULLS LAST, j.id DESC LIMIT $3`,
      [nocs, noc4, CAND_CAP]),
    pool.query(`SELECT max(last_seen) AS upd FROM jobs`),
  ])
  let matchHigh = 0, matchMid = 0
  const hits: { j: any; level: 'high' | 'mid' }[] = []
  for (const j of candRes.rows) {
    const mj: MatchJob = {
      noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
      pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
      lmiaPositions: num(j.lmia_positions), lmiaPositionsSkilled: num(j.lmia_positions_skilled), lmiaLastQuarter: j.lmia_last_quarter ?? '',
    }
    const level = match(profile, mj, matchDims).level
    if (level === 'high') { matchHigh++; hits.push({ j, level }) }
    else if (level === 'mid') { matchMid++; hits.push({ j, level }) }
  }
  // 默认排序:match 等级↓(候选已按日期↓,stable sort 保同级内日期序)
  hits.sort((a, b) => matchRank(b.level) - matchRank(a.level))
  // 免费用户:可见匹配封顶前 N(FOMO 计数仍是全量 matchHigh/matchMid)。
  // cap 必须在列排序**之前**按默认序圈定——否则免费用户换着列排就能轮换枚举整个匹配集,绕过前 N 付费墙
  const visible = pro ? hits : hits.slice(0, FREE_MATCH_JOBS_PER_DAY)
  // 列排序(表头点击):在可见集内重排;Pro 数据列非 Pro 不响应;同值按匹配度次序兜底
  const getter = sort?.key && sort.key !== 'match' && (pro || !PRO_SORTS.has(sort.key)) ? MATCH_SORT_VAL[sort.key] : null
  if (getter) {
    const d = sort!.dir === 'asc' ? 1 : -1
    visible.sort((a, b) => {
      const va = getter(a.j) as any, vb = getter(b.j) as any
      const na = va == null || va === '', nb = vb == null || vb === ''
      if (na || nb) return na && nb ? 0 : na ? 1 : -1     // 空值恒沉底
      if (va < vb) return -d
      if (va > vb) return d
      return matchRank(b.level) - matchRank(a.level)
    })
  }
  const pageItems = visible.slice(page * pageSize, page * pageSize + pageSize)
  const jobs = pageItems.map(({ j, level }) => mapJobRow(j, pro, level))
  return { jobs, total: visible.length, matchHigh, matchMid, updatedAt: iso(updRes.rows[0]?.upd) }
}

/** E8-07 详情页:按 id 取单岗(与列表同一列集/映射/Pro 剥离口径;closed 岗也返回——详情页保留可访问)。 */
export async function fetchJobById(
  pool: any, id: number, { pro, profile, profileOk, matchDims }: Omit<JobsListOpts, 'limit'>,
): Promise<JobRow | null> {
  if (!Number.isFinite(id)) return null
  const { rows } = await pool.query(`SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.id = $1 LIMIT 1`, [id])
  if (!rows.length) return null
  const m = makeMatcher(profile, profileOk, matchDims, pro)
  // 详情页单岗:免费 cap 以 0 号位判(建档免费用户在详情页能看本岗匹配级——单岗不构成枚举面)
  return mapJobRow(rows[0], pro, m.of(rows[0], 0))
}

export type RelatedJob = { id: number; title: string; company: string; city: string; province: string; salaryText: string }
const mapRelated = (r: any): RelatedJob => ({ id: Number(r.id), title: r.title ?? '', company: r.company_name ?? '', city: r.city ?? '', province: r.province ?? '', salaryText: r.salary_text ?? r.salary ?? '' })

/** E8-07 详情页「相关职位」:同公司在招 ≤3 + 同省同 NOC 小类在招 ≤3(都排除本岗;瘦行,不过 Pro 剥离——无 Pro 列)。 */
export async function fetchRelatedJobs(pool: any, job: { id: string | number; company: string; province: string; noc: string }): Promise<{ sameCompany: RelatedJob[]; sameOcc: RelatedJob[] }> {
  const REL_COLS = `j.id, j.title, c.name AS company_name, j.city, j.province, j.salary, j.salary_text`
  const [co, occ] = await Promise.all([
    job.company ? pool.query(
      `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE c.name = $1 AND j.id <> $2 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.id DESC LIMIT 3`, [job.company, job.id]) : { rows: [] },
    job.noc && job.province ? pool.query(
      `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE j.province = $1 AND LEFT(j.noc, 4) = LEFT($2, 4) AND j.id <> $3
         AND COALESCE(c.name,'') <> $4 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.id DESC LIMIT 3`, [job.province, job.noc, job.id, job.company || '']) : { rows: [] },
  ])
  return { sameCompany: co.rows.map(mapRelated), sameOcc: occ.rows.map(mapRelated) }
}

/** 头条总数 + 差异化证言数字(省提名清单命中岗 named + 有外劳记录雇主数 lmia)。原在 page.tsx 裸 SQL,收编于此。 */
export async function fetchTotalAndProof(pool: any): Promise<{ total: number; named: number; lmia: number }> {
  const { rows } = await pool.query(`SELECT count(*)::int AS n,
    count(*) FILTER (WHERE status = 'open' AND pnp_stream IS NOT NULL AND pnp_stream <> '')::int AS named,
    (SELECT count(*)::int FROM companies WHERE lmia_positions > 0) AS lmia
    FROM jobs`)
  return { total: rows[0]?.n ?? 0, named: rows[0]?.named ?? 0, lmia: rows[0]?.lmia ?? 0 }
}

export type AlertHit = { title: string; city: string; province: string; salary_text: string; apply_url: string; company_name: string }

/** 邮件提醒命中查询(E5-03):某条保存筛选自 since 起的新岗(status=open ∩ first_seen>since ∩ filters)。原在 alerts/run 裸 SQL,收编于此。 */
export async function fetchAlertHits(pool: any, filters: Record<string, unknown>, since: string): Promise<{ rows: AlertHit[]; skipped: string[] }> {
  const w = buildJobsWhere(await resolveQCompanyIds(pool, filters), 2)   // $1 留给 since
  const { rows } = await pool.query(
    `SELECT j.title, j.city, j.province, j.salary_text, j.apply_url, c.name AS company_name
     ${JOB_FROM}
     WHERE j.status = 'open' AND j.first_seen > $1 AND ${w.sql}
     ORDER BY j.score DESC NULLS LAST LIMIT 20`, [since, ...w.params])
  return { rows, skipped: w.skipped }
}
