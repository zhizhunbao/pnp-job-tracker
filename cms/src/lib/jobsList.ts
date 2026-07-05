// /jobs 列表查询单点(E7-04):SELECT 列清单 / 行映射(含 Pro 列剥离)/ 排序白名单 / 分页查询。
// /jobs SSR(page.tsx)与 /api/jobs 共用 —— 列表读取走原始 SQL(payload.find 读取管线太慢,老决策),
// 列名是 Payload snake_case(老坑 5):改 Jobs schema 同步这里 + lib/jobsQuery.ts。
// 筛选翻译在 lib/jobsQuery(mode='full');免费匹配「默认序前 N 岗」语义(E5-00)在这里落实。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { buildJobsWhere, PROV_NAME_SQL, DIRECT_SQL } from './jobsQuery'
import { loadMatchDims } from './matchDims'
import { match, matchRank, type MatchProfile, type MatchJob, type MatchLevel } from './match'
import { FREE_MATCH_JOBS_PER_DAY } from './plan'
import type { JobRow } from '@/app/(frontend)/jobs/JobsTable'

export const JOBS_PAGE_SIZE = 200      // 首屏 SSR 与 API 每页行数(D2)
const HARD_CAP = 20000                 // 全量上限(沿用原 SSR LIMIT;match 排序特殊路径用)

// 与前端默认序一致(发布时间↓,同日评分↓);id 兜底保证 offset 分页确定性(D4)
const DEFAULT_ORDER = 'j.date_posted DESC NULLS LAST, j.score DESC NULLS LAST, j.id DESC'

const SELECT_COLS = `j.id, j.title, c.name AS company_name, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
  c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams,
  j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip,
  j.country, j.province, j.city, j.district, j.address, j.region,
  j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
  j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
  j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at`

const FROM_JOBS = `FROM jobs j LEFT JOIN companies c ON c.id = j.company_id`

// 排序白名单:ColKey → SQL 表达式,语义与前端 sortVal 一致(缺值→NULL 排末尾;'未分类'/'unknown' 视同缺值)
const ORDER_SQL: Record<string, string> = {
  score: 'j.score',
  salary: 'j.salary_annual', salaryYr: 'j.salary_annual',
  wageMedHr: 'j.wage_med_hourly', wageMedYr: 'j.wage_med_annual',
  vsMedian: '(j.salary_annual::float / NULLIF(j.wage_med_annual, 0))',
  direct: `(CASE WHEN ${DIRECT_SQL} THEN 1 ELSE 0 END)`,
  pnp: '(CASE WHEN j.pnp_eligible THEN 1 ELSE 0 END)',
  ee: `NULLIF(j.ee_category, '')`,
  aip: '(CASE WHEN j.aip THEN 1 ELSE 0 END)',
  lmia: 'c.lmia_positions',
  address: `COALESCE(NULLIF(j.address,''), NULLIF(c.address,''))`,
  teer: 'j.teer',
  datePosted: 'j.date_posted', lastSeen: 'j.last_seen', closedAt: 'j.closed_at',
  broad: `NULLIF(NULLIF(j.broad,''),'未分类')`, mid: `NULLIF(NULLIF(j.mid,''),'未分类')`, fine: `NULLIF(NULLIF(j.fine,''),'未分类')`,
  noc: `NULLIF(j.noc,'')`,
  accessibility: `NULLIF(NULLIF(j.accessibility,''),'unknown')`,
  company: `NULLIF(c.name,'')`, title: `NULLIF(j.title,'')`,
  source: `NULLIF(j.source_label,'')`,
  origin: `(CASE j.origin WHEN 'jobbank' THEN 'Job Bank' WHEN 'ats' THEN 'ATS' WHEN 'directory' THEN '社区名单' ELSE NULLIF(j.origin,'') END)`,
  status: `(CASE WHEN j.status = 'closed' THEN 1 ELSE 0 END)`,
  country: `NULLIF(COALESCE(NULLIF(j.country,''), CASE WHEN COALESCE(j.province,'') <> '' THEN 'Canada' END),'')`,
  province: `NULLIF(${PROV_NAME_SQL},'')`,
  city: `NULLIF(j.city,'')`, district: `NULLIF(j.district,'')`,
}
// Pro 列排序对免费用户回默认序(现状:免费该列数据全空,排序本就退化)
const PRO_SORT = new Set(['match', 'vsMedian', 'wageMedHr', 'wageMedYr'])

function buildOrderBy(sort: string | undefined, dir: 'asc' | 'desc', pro: boolean): string {
  if (!sort || !ORDER_SQL[sort] || (!pro && PRO_SORT.has(sort))) return DEFAULT_ORDER
  const d = dir === 'asc' ? 'ASC' : 'DESC'
  const tie = sort === 'score' ? 'j.id DESC' : 'j.score DESC NULLS LAST, j.id DESC'
  return `${ORDER_SQL[sort]} ${d} NULLS LAST, ${tie}`
}

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字

// 匹配输入(规则引擎只看这几个字段;E5-00)
const matchJobOf = (j: any): MatchJob => ({
  noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
  pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
  lmiaPositions: num(j.lmia_positions), lmiaLastQuarter: j.lmia_last_quarter ?? '',
})

// 原始行 → 前端 JobRow。Pro 列(E3-05)在这里剥离:免费用户的数据不进浏览器,改 cookie/偏好绕不过。
export function mapJobRow(j: any, pro: boolean, matchLevel: MatchLevel | null): JobRow {
  return {
    match: matchLevel,
    id: j.id,
    title: j.title ?? '',
    company: j.company_name ?? '',
    companyDescription: j.company_description ?? '',
    companySectors: j.company_sectors ?? '',
    // LMIA 外劳雇佣记录(E6-02,免费信号——信任层):历史事实,展示带股别/季度语境
    lmiaPositions: num(j.lmia_positions),
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
    pnpEligible: !!j.pnp_eligible,
    pnpStream: j.pnp_stream ?? '',
    eeCategory: j.ee_category ?? '',
    aip: !!j.aip,
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
    officialUrl: j.official_url ?? '',
    applyUrl: j.apply_url ?? '',
    datePosted: iso(j.date_posted),
    firstSeen: iso(j.first_seen),
    lastSeen: iso(j.last_seen),
    status: j.status ?? 'open',
    closedAt: iso(j.closed_at),
  }
}

async function getPool(): Promise<any> {
  const payload = await getPayload({ config: await config })
  return (payload.db as any).pool
}

// 免费层匹配「默认序前 N 岗」(E5-00 激活钩子):算出 id→level,任何筛选/排序/翻页视图里命中即显示。
// 与改前语义逐位一致 —— 改前也是对未筛选默认序的前 N 行算匹配,筛选后这些行出现在哪就带到哪。
async function freeTopMatchMap(pool: any, profile: MatchProfile): Promise<Map<any, MatchLevel>> {
  const dims = await loadMatchDims()
  const { rows } = await pool.query(`
    SELECT j.id, j.noc, j.teer, j.province, j.pnp_eligible, j.pnp_stream, j.ee_category,
      j.salary_annual, j.wage_med_annual, c.lmia_positions, c.lmia_last_quarter
    ${FROM_JOBS} ORDER BY ${DEFAULT_ORDER} LIMIT ${FREE_MATCH_JOBS_PER_DAY}`)
  const map = new Map<any, MatchLevel>()
  for (const j of rows) map.set(j.id, match(profile, matchJobOf(j), dims).level)
  return map
}

export type JobsPageArgs = {
  filters: Record<string, unknown>
  sort?: string
  dir?: 'asc' | 'desc'
  offset?: number
  limit?: number
  pro: boolean
  profile: MatchProfile
  profileOk: boolean
  company?: string        // 内部参数(D11):「公司信息」弹框查该公司在招,精确 c.name 匹配
}

export async function queryJobsPage(args: JobsPageArgs): Promise<{ rows: JobRow[]; total: number }> {
  const { filters, pro, profile, profileOk } = args
  const dir = args.dir === 'asc' ? 'asc' : 'desc'
  const offset = Math.min(Math.max(args.offset ?? 0, 0), HARD_CAP)
  const limit = Math.min(Math.max(args.limit ?? JOBS_PAGE_SIZE, 1), 500)
  const pool = await getPool()

  const where = buildJobsWhere(filters ?? {}, 1, { mode: 'full', pro })
  const conds = [where.sql]
  const params: unknown[] = [...where.params]
  if (args.company) { conds.push(`c.name = $${params.length + 1}`); params.push(args.company) }
  const whereSql = conds.join(' AND ')

  // 匹配排序(D6,Pro+建档):match 是 JS 规则引擎,SQL 排不了 → 取全量命中行内存排序后切页。
  // 数据不出服务器,响应仍是一页;改前 page.tsx 对全表逐行算过 match,成本已知。
  if (args.sort === 'match' && pro && profileOk) {
    const dims = await loadMatchDims()
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLS} ${FROM_JOBS} WHERE ${whereSql} ORDER BY ${DEFAULT_ORDER} LIMIT ${HARD_CAP}`, params)
    const scored = rows.map((j: any) => {
      const level = match(profile, matchJobOf(j), dims).level
      return { j, level, rank: matchRank(level) }
    })
    const sgn = dir === 'asc' ? 1 : -1
    scored.sort((a: any, b: any) => (a.rank - b.rank) * sgn || (num(b.j.score) ?? -Infinity) - (num(a.j.score) ?? -Infinity))
    return {
      rows: scored.slice(offset, offset + limit).map(({ j, level }: any) => mapJobRow(j, pro, level)),
      total: scored.length,
    }
  }

  const orderBy = buildOrderBy(args.sort, dir, pro)
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}, count(*) OVER() AS _total ${FROM_JOBS} WHERE ${whereSql} ORDER BY ${orderBy} OFFSET ${offset} LIMIT ${limit}`,
    params)
  let total = rows.length ? Number(rows[0]._total) : 0
  if (!rows.length && offset > 0) {  // 翻过末页:窗口函数拿不到计数,单独补一枪
    const r = await pool.query(`SELECT count(*)::int AS n ${FROM_JOBS} WHERE ${whereSql}`, params)
    total = r.rows[0]?.n ?? 0
  }

  // 匹配列(E5-00):Pro=本页每行都算;免费=默认序前 N 岗 map 命中才有;未建档/未登录全 null
  let levelOf: (j: any) => MatchLevel | null = () => null
  if (profileOk && pro) {
    const dims = await loadMatchDims()
    levelOf = (j) => match(profile, matchJobOf(j), dims).level
  } else if (profileOk && !pro) {
    const topMap = await freeTopMatchMap(pool, profile)
    levelOf = (j) => topMap.get(j.id) ?? null
  }
  return { rows: rows.map((j: any) => mapJobRow(j, pro, levelOf(j))), total }
}

// 页头元信息:总岗位数(未筛选)+ 全表最近更新时间(改前 = SSR 全量行的 max(last_seen))
export async function queryJobsMeta(): Promise<{ grandTotal: number; updatedAt: string }> {
  const pool = await getPool()
  const { rows } = await pool.query(`SELECT count(*)::int AS n, max(last_seen) AS m FROM jobs`)
  return { grandTotal: rows[0]?.n ?? 0, updatedAt: iso(rows[0]?.m) }
}
