import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import Jobs, { BANNER_COOKIE } from './Jobs'
import { COLS_COOKIE } from './columns.shared'
import { COLW_COOKIE, DEFAULT_COLW_SEED, parseColWidthSeed, type ColWidthSeed } from './colWidths.shared'
import { parseJobFilters, toSearchParams } from './filters.shared'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { normalizeProfile, hasProfile } from '@/lib/jobs'
import { fetchJobRows, fetchJobsPage, fetchSsrDims, fetchTotalAndProof, type SsrDims } from '@/lib/jobs/server'
import { dbOf } from '@/lib/db/database'

// 首屏行数(2026-07-05 用户拍板):SSR 只带最近 N 行秒开,全量 /api/jobs-data 后台拉(拉完筛选/搜索照旧)
const FIRST_SCREEN_ROWS = 50

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canadian jobs with immigration signals — PNP · EE · wages | Offer2PR',
  description: 'Daily-updated job board across all 10 provinces: PNP named streams, EE categories, wages vs ESDC median, profile matching. 全加拿大日更职位板:省提名通道/EE 类别/工资对比/档案匹配。',
}

// 维度进程内缓存(2026-07-28 Frank「职位板返回有时候老慢了」的根因之一):
// 首屏 SSR 每次都重拉 8 张维度表(pnp-occupations ≤5000 行 + ee-categories 2000 + noc-categories 1000…),
// 0.25CPU 小库上就是 1-2 秒 —— 这与 /api/jobs 里那层缓存治的是同一个病(2026-07-19「排序 3-4 秒」),
// 当时只治了排序那条路,没治首页。串行实测旁证:同为动态页的 /pricing TTFB 0.13s,职位板 1.6~3.4s。
// 维度表随 seed 小时级更新,10 分钟陈旧完全可接受;Render 单实例,进程缓存即全局缓存。
// **只缓存与用户无关的维度**:职位行/总数/更新时间照常每次现查(页头「更新时间」不能陈旧)。
let ssrDimsCache: { dims: SsrDims; ts: number } | null = null
const SSR_DIMS_TTL = 10 * 60_000

async function getDimsCached(pool: any): Promise<SsrDims> {
  if (ssrDimsCache && Date.now() - ssrDimsCache.ts < SSR_DIMS_TTL) return ssrDimsCache.dims
  const dims = await fetchSsrDims(pool)
  ssrDimsCache = { dims, ts: Date.now() }
  return dims
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const payload = await getPayload({ config: await config })

  // 筛选在 SSR 就生效(2026-08-03):地址栏带 ?prov=/?broad= 时首帧直接渲筛选后的板 ——
  // 原来只有水合后的客户端读 URL,首帧永远是「全部」,于是刷新先抖一下。映射见 filters.shared。
  const urlSearchParams = toSearchParams(await searchParams)
  const filters = parseJobFilters(urlSearchParams)
  const initialMatchView = urlSearchParams.get('view') === 'match'
  const filtered = Object.keys(filters).length > 0

  // 分层(E3-05):Pro 列(工资中位对比三件套 + 匹配)在 SELECT 源头裁掉 —— 免费用户的数据不进浏览器
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  // 列表查询在 lib/jobs/queries.ts(与 /api/jobs-data 共用);首屏只取 FIRST_SCREEN_ROWS 行 + 总数
  const pool = dbOf(payload)

  const dims = await getDimsCached(pool)

  // 首屏 50 行 + 总数(E10-01 P3:筛选/翻页由客户端打 /api/jobs 分页,同一查询层 lib/jobs/queries 同序)
  // 匹配只吃省提名清单(AIP 背书清单是另一条路,见 lib/jobs/queries.pnpOnly);展示维度仍是全量
  const matchDims = { pnpOccupations: dims.pnpOccupations.filter((r) => r.program === 'PNP'), eeCategories: dims.eeCategories }
  // 差异化证言数字(第 5 轮 #14):省提名清单命中岗 + 有外劳记录雇主数 —— 首屏 3 秒讲清与聚合站的区别
  // 有筛选就走 fetchJobsPage(与 /api/jobs 同一条查询路径 → SSR 与水合后客户端逐行一致,不会换一次内容);
  // 没筛选照旧走 fetchJobRows(全站首屏,total 用全站数)。
  const listP = filtered
    ? fetchJobsPage(pool, { pro, profile, profileOk, matchDims, filters, page: 0, pageSize: FIRST_SCREEN_ROWS })
      .then((r) => ({ jobs: r.jobs, updatedAt: r.updatedAt, total: r.total as number | null }))
    : fetchJobRows(pool, { pro, profile, profileOk, matchDims, limit: FIRST_SCREEN_ROWS })
      .then((r) => ({ jobs: r.jobs, updatedAt: r.updatedAt, total: null as number | null }))
  const [list, tp] = await Promise.all([listP, fetchTotalAndProof(pool)])
  const { jobs, updatedAt } = list
  const totalCount: number = list.total ?? (tp.total || jobs.length)   // 筛选后 0 条也得是 0,不能退回全站数
  const proof = { named: tp.named, lmia: tp.lmia }

  // 列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,零闪烁。客户端选列时写这个 cookie。
  let initialCols: string[] | undefined
  let initialColW: ColWidthSeed | null = null
  let initialBanner = true
  try {
    const jar = await cookies()
    const raw = jar.get(COLS_COOKIE)?.value
    if (raw) { const arr = JSON.parse(decodeURIComponent(raw)); if (Array.isArray(arr)) initialCols = arr.filter((x) => typeof x === 'string') }
    // 列宽比例也从 cookie 读:SSR 就把 colgroup 渲成上次算好的比例,水合后换像素时看不出变化
    // (原来首屏走浏览器自动布局,量完再换固定布局 → 表格明显抻一下,实测 CLS 0.087)
    initialColW = parseColWidthSeed(jar.get(COLW_COOKIE)?.value) ?? DEFAULT_COLW_SEED   // 头回来的人用默认比例兜底
    if (jar.get(BANNER_COOKIE)?.value) initialBanner = false  // 关过横幅 → SSR 首帧即不渲(不再等水合后才弹)
  } catch { /* 无 cookie/解析失败 → 用默认列 */ }

  // plan(E3-05/E5-00):分层态与档案传给前端 —— 展示引导用;gate 本身在服务端(上方 SELECT/匹配范围)已生效
  const plan = {
    isPro: pro,
    loggedIn: !!user,
    profileOk,
    profile: profileOk ? profile : null,   // 本人档案(弹框端重算依据链用)
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
    // #84:身份四件 SSR 直传(账户钮零闪,不再等客户端 /api/users/me)
    email: (user as any)?.email ?? null,
    displayName: (user as any)?.displayName ?? null,
    avatar: (user as any)?.avatar ?? null,
    proUntil: String((user as any)?.proUntil || '').slice(0, 10),
  }
  // 推荐横幅槽位预判内联脚本随推荐条一并删除(2026-07-31):没有横幅就没有 CLS 要防
  return <>
    <Jobs jobs={jobs} updatedAt={updatedAt} dims={dims} initialCols={initialCols} initialColW={initialColW} plan={plan}
      initialBanner={initialBanner} totalCount={totalCount} proof={proof} initialFilters={filters}
      initialMatchView={initialMatchView} deferFull />
  </>
}
