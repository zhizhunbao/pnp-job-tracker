import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import JobsTable, { type JobRow } from './JobsTable'
import { COLS_COOKIE } from './i18n'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { match, normalizeProfile, hasProfile, type MatchJob } from '@/lib/match'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canadian jobs with immigration signals — PNP · EE · wages | PNP Job Tracker',
  description: 'Daily-updated job board across all 10 provinces: PNP named streams, EE categories, wages vs ESDC median, profile matching. 全加拿大日更职位板:省提名通道/EE 类别/工资对比/档案匹配。',
}

export default async function JobsPage() {
  const payload = await getPayload({ config: await config })

  // 分层(E3-05):Pro 列(工资中位对比三件套 + 匹配)在 SELECT 源头裁掉 —— 免费用户的数据不进浏览器
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  // 列表读取走原始 SQL:payload.find 会把每个 doc 过一遍读取管线(access/hooks),2000+ 行要十几秒。
  // 公开只读列表直接 select + join 公司名,<0.5s。(列名是 Payload 的 snake_case;schema 改了要同步)
  // 工资中位列 SELECT 全量(免费用户的匹配计算也要用),但免费用户在下方映射层剥离 —— 数据不进浏览器。
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(`
    SELECT j.id, j.title, c.name AS company_name, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
      c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams,
      j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip,
      j.country, j.province, j.city, j.district, j.address, j.region,
      j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
      j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
      j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at
    FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
    ORDER BY j.date_posted DESC NULLS LAST, j.score DESC NULLS LAST LIMIT 20000`)
  // ↑ 排序与前端默认序一致(发布时间↓,同日评分↓兜底):免费匹配「前 N 岗」(E5-00)才等于用户看到的前 N 行

  // 维度表小,继续走 payload.find
  const [provDocs, cityDocs, distDocs, nocDocs, srcDocs, expDocs, pnpDocs, eeDocs, aipDocs, nocDescDocs, fieldSrcDocs] = await Promise.all([
    payload.find({ collection: 'provinces', limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 1000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'noc-categories', limit: 1000, depth: 0 }),
    payload.find({ collection: 'sources', limit: 200, depth: 0, sort: 'name' }),
    payload.find({ collection: 'experience-levels', limit: 50, depth: 0 }),
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
    payload.find({ collection: 'designated-employers', limit: 5000, depth: 0 }),
    payload.find({ collection: 'noc-descriptions', limit: 2000, depth: 0 }),
    payload.find({ collection: 'field-sources', limit: 200, depth: 0 }),
  ])
  const dims = {
    provinces: provDocs.docs.map((p: any) => ({ code: p.code, name: p.name })),
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
    nocCategories: nocDocs.docs.map((c: any) => ({ broad: c.broad, mid: c.mid, fine: c.fine, teer: typeof c.teer === 'number' ? c.teer : null })),
    sources: srcDocs.docs.map((s: any) => ({ name: s.name })),
    experienceLevels: expDocs.docs.map((e: any) => ({ name: e.name })),
    pnpOccupations: pnpDocs.docs.map((r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })),
    eeCategories: eeDocs.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })),
    designatedEmployers: aipDocs.docs.map((r: any) => ({ name: r.name, province: r.province, location: r.location, isTech: !!r.isTech })),
    nocDescriptions: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
    fieldSources: fieldSrcDocs.docs.map((r: any) => ({ field: r.field ?? '', kind: r.kind ?? '', publisher: r.publisher ?? '', url: r.url ?? '', title: r.title ?? '', description: r.description ?? '', status: r.status ?? '', fetched: r.fetched ?? '', note: r.note ?? '' })),
  }

  const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
  const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字

  // 档案匹配(E5-00):服务端按人逐行 join(规则在 lib/match.ts 一处)。
  // Pro=全量;免费=默认序前 N 岗(激活钩子,plan.ts);未建档/未登录不算。
  const matchDims = { pnpOccupations: dims.pnpOccupations, eeCategories: dims.eeCategories }
  const matchOf = (j: any, idx: number): JobRow['match'] => {
    if (!profileOk) return null
    if (!pro && idx >= FREE_MATCH_JOBS_PER_DAY) return null
    const mj: MatchJob = {
      noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
      pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
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

  // 列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,零闪烁。客户端选列时写这个 cookie。
  let initialCols: string[] | undefined
  try {
    const raw = (await cookies()).get(COLS_COOKIE)?.value
    if (raw) { const arr = JSON.parse(decodeURIComponent(raw)); if (Array.isArray(arr)) initialCols = arr.filter((x) => typeof x === 'string') }
  } catch { /* 无 cookie/解析失败 → 用默认列 */ }

  // plan(E3-05/E5-00):分层态与档案传给前端 —— 展示引导用;gate 本身在服务端(上方 SELECT/匹配范围)已生效
  const plan = {
    isPro: pro,
    loggedIn: !!user,
    profileOk,
    profile: profileOk ? profile : null,   // 本人档案(弹框端重算依据链用)
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
  }
  return <JobsTable jobs={jobs} updatedAt={updatedAt} dims={dims} initialCols={initialCols} plan={plan} />
}
