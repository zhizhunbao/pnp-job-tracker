// 职位列表查询层(SSR 首屏与 /api/jobs-data 共用;从 page.tsx 提出,老坑 5:列名耦合 Payload snake_case)。
// 首屏拆分(2026-07-05 用户拍板「默认最近 50」):page.tsx limit=50 秒开,全量走 /api/jobs-data 后台拉。
import { match, type MatchDims, type MatchJob, type MatchProfile } from './match'
import { FREE_MATCH_JOBS_PER_DAY } from './plan'
import type { JobRow } from '@/app/(frontend)/jobs/JobsTable'

// 维度行映射(match 引擎口径;/api/jobs-data 自取维度时与 page.tsx 同一把尺)
export const mapPnpOcc = (r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })
export const mapEeCat = (r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字

export type JobsListOpts = {
  pro: boolean
  profile: MatchProfile
  profileOk: boolean
  matchDims: MatchDims
  limit: number
}

/**
 * 列表读取走原始 SQL:payload.find 会把每个 doc 过一遍读取管线(access/hooks),2000+ 行要十几秒。
 * 公开只读列表直接 select + join 公司名。排序与前端默认序一致(发布时间↓,同日评分↓,id↓ 唯一兜底
 * —— 并列行顺序定死,LIMIT 50 与全量两次查询严格同序,否则换入时并列组内会换位):
 * 免费匹配「前 N 岗」(E5-00)才等于用户看到的前 N 行;首屏 50 与全量取同一序,后台换入无跳变。
 * Pro 列(工资中位三件套)SELECT 全量(免费用户的匹配计算也要用),免费用户在映射层剥离 —— 数据不进浏览器。
 */
export async function fetchJobRows(pool: any, { pro, profile, profileOk, matchDims, limit }: JobsListOpts): Promise<{ jobs: JobRow[]; updatedAt: string }> {
  const { rows } = await pool.query(`
    SELECT j.id, j.title, c.name AS company_name, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
      c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams,
      j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip,
      j.country, j.province, j.city, j.district, j.address, j.region,
      j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
      j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
      j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at
    FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
    ORDER BY j.date_posted DESC NULLS LAST, j.score DESC NULLS LAST, j.id DESC LIMIT $1`, [limit])

  // 档案匹配(E5-00):服务端按人逐行 join(规则在 lib/match.ts 一处)。
  // Pro=全量;免费=默认序前 N 岗(激活钩子,plan.ts);未建档/未登录不算。
  const matchOf = (j: any, idx: number): JobRow['match'] => {
    if (!profileOk) return null
    if (!pro && idx >= FREE_MATCH_JOBS_PER_DAY) return null
    const mj: MatchJob = {
      noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
      pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
      lmiaPositions: num(j.lmia_positions), lmiaLastQuarter: j.lmia_last_quarter ?? '',
    }
    return match(profile, mj, matchDims).level
  }

  const jobs: JobRow[] = rows.map((j: any, idx: number) => ({
    match: matchOf(j, idx),
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
    // Pro 列数据(E3-05):免费用户置空 —— 不进浏览器,前端在列位显示锁标(改 cookie/偏好绕不过)
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
  }))

  const updatedAt = rows.reduce((m: string, j: any) => { const ls = iso(j.last_seen); return ls > m ? ls : m }, '')
  return { jobs, updatedAt }
}
