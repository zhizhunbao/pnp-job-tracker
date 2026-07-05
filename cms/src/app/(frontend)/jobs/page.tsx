import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import JobsTable from './JobsTable'
import { COLS_COOKIE } from './i18n'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { queryJobsPage, queryJobsMeta, JOBS_PAGE_SIZE } from '@/lib/jobsList'
import { PROV_NAME } from '@/lib/jobsQuery'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canadian jobs with immigration signals — PNP · EE · wages | PNP Job Tracker',
  description: 'Daily-updated job board across all 10 provinces: PNP named streams, EE categories, wages vs ESDC median, profile matching. 全加拿大日更职位板:省提名通道/EE 类别/工资对比/档案匹配。',
}

// E7-04:首屏只发默认序前 200 行,筛选/搜索/排序/滚动走 /api/jobs 增量取(查询单点 lib/jobsList)。
// ?q= ?prov= ?broad=(榜单/统计回流)在这里服务端应用 —— 落地即已筛,初始筛选经 props 注入客户端。
export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const payload = await getPayload({ config: await config })

  // 分层(E3-05):Pro 列(工资中位对比三件套 + 匹配)在查询层源头裁掉 —— 免费用户的数据不进浏览器
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''
  const initialFilters: Record<string, string> = {}
  if (one(sp.q)) initialFilters.q = one(sp.q)
  if (one(sp.prov)) initialFilters.fProv = PROV_NAME[one(sp.prov).toUpperCase()] || one(sp.prov)
  if (one(sp.broad)) initialFilters.fBroad = one(sp.broad)

  // 列表页 + 元信息 + 筛选维度(选项来自维度表,不依赖 jobs 行)同层并发 —— 少一档串行往返;
  // 弹框 6 维度走 /api/jobs/dims 懒加载(E7-04 D7)
  const [{ rows: jobs, total }, meta, provDocs, cityDocs, distDocs, nocDocs, srcDocs, expDocs] = await Promise.all([
    queryJobsPage({ filters: initialFilters, offset: 0, limit: JOBS_PAGE_SIZE, pro, profile, profileOk }),
    queryJobsMeta(),
    payload.find({ collection: 'provinces', limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 1000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'noc-categories', limit: 1000, depth: 0 }),
    payload.find({ collection: 'sources', limit: 200, depth: 0, sort: 'name' }),
    payload.find({ collection: 'experience-levels', limit: 50, depth: 0 }),
  ])
  const dims = {
    provinces: provDocs.docs.map((p: any) => ({ code: p.code, name: p.name })),
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
    nocCategories: nocDocs.docs.map((c: any) => ({ broad: c.broad, mid: c.mid, fine: c.fine, teer: typeof c.teer === 'number' ? c.teer : null })),
    sources: srcDocs.docs.map((s: any) => ({ name: s.name })),
    experienceLevels: expDocs.docs.map((e: any) => ({ name: e.name })),
    // 弹框维度(pnp/ee/aip/noc描述/来源说明)客户端 idle 懒加载合入
    pnpOccupations: [], pnpDraws: [], eeCategories: [], designatedEmployers: [], nocDescriptions: [], fieldSources: [],
  }

  // 列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,零闪烁。客户端选列时写这个 cookie。
  let initialCols: string[] | undefined
  try {
    const raw = (await cookies()).get(COLS_COOKIE)?.value
    if (raw) { const arr = JSON.parse(decodeURIComponent(raw)); if (Array.isArray(arr)) initialCols = arr.filter((x) => typeof x === 'string') }
  } catch { /* 无 cookie/解析失败 → 用默认列 */ }

  // plan(E3-05/E5-00):分层态与档案传给前端 —— 展示引导用;gate 本身在服务端(查询层 SELECT/匹配范围)已生效
  const plan = {
    isPro: pro,
    loggedIn: !!user,
    profileOk,
    profile: profileOk ? profile : null,   // 本人档案(弹框端重算依据链用)
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
  }
  return <JobsTable jobs={jobs} initialTotal={total} grandTotal={meta.grandTotal} updatedAt={meta.updatedAt}
    dims={dims} initialCols={initialCols} plan={plan} initialFilters={initialFilters} />
}
