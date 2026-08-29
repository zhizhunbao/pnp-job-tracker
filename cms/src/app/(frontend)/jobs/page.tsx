/**
 * 职位板的门(也是根路径的落点):取参 → 解析筛选 → 注入连接取数 → 拼组件。
 * 零前端计算 —— 排版全在 components/jobs,判断与取数全在 lib/jobs。
 *
 * 首屏行数(2026-07-05 用户拍板):SSR 只带最近 N 行秒开,筛选/翻页由客户端打 /api/jobs 分页
 * (E10-01 P3,同一查询层同序)。有筛选就走分页那条路 —— SSR 与水合后的客户端逐行一致,
 * 不会换一次内容;没筛选照旧走首屏那条(total 用全站数)。
 * 筛选在 SSR 就生效(2026-08-03):地址栏带 ?prov= / ?broad= 时首帧直接渲筛选后的板 ——
 * 原来只有水合后的客户端读 URL,首帧永远是「全部」,于是刷新先抖一下。
 * 分层(E3-05):Pro 列在 SELECT 源头裁掉 —— 免费用户的数据不进浏览器。
 * 匹配只吃省提名清单(AIP 背书清单是另一条路);展示维度仍是全量。
 * 列偏好与列宽比例都从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对,零闪烁。
 *
 * 2026-08-28 换装批收成标准形:整页外框 Frame + 顶栏 + 视图 + 页脚;顶栏那颗「我的匹配」
 * 带三态闸,所以它连闸一起是 JobsHeader 那一件。首屏维度的 10 分钟单件缓存随之下沉进
 * lib/jobs 的 getSsrDims(门里不许有函数体)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { Footer } from '@/components/footer'
import {
  COLS_COOKIE, COLW_COOKIE, DEFAULT_COLW_SEED, FIRST_SCREEN_ROWS, Jobs, JobsHeader, P_VIEW, VAL_MATCH,
  BOARD_META,
  colsFromCookie, parseColWidthSeed, parseJobFilters, toJobPlan, toSearchParams,
} from '@/components/jobs'
import { Frame } from '@/components/shell'
import { dbOf } from '@/lib/db/server'
import { hasProfile, normalizeProfile, type ProfileJson } from '@/lib/jobs'
import { getSsrDims, loadJobRows, loadJobsPage, loadTotalAndProof, pnpOnly } from '@/lib/jobs/server'
import { getUser, isPro } from '@/lib/quota/server'
import type { JobFact, SessionUser } from '@/components/jobs'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 BOARD_META,门里只一行转发 ——
 * 2026-08-29 Frank 定形:静态 B 形;导出名是框架定的,必须留在本文件)。
 */
export const metadata = BOARD_META

/**
 * 职位板的门。
 *
 * @param props Next 传进来的查询参数。
 * @returns 整页。
 */
export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = toSearchParams(await searchParams)
  const filters = parseJobFilters(sp)
  const filtered = Object.keys(filters).length > 0
  const initialMatchView = sp.get(P_VIEW) === VAL_MATCH

  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile(user?.profile as ProfileJson | null)
  const profileOk = hasProfile(profile)

  const dims = await getSsrDims(db)
  const matchDims = { pnpOccupations: pnpOnly(dims.pnpOccupations), eeCategories: dims.eeCategories }
  const proofPromise = loadTotalAndProof(db)

  let jobs: JobFact[] = []
  let updatedAt = ''
  let total: number | null = null
  if (filtered) {
    const page = await loadJobsPage({
      db, pro, profile, profileOk, matchDims, filters, sort: null, page: 0, pageSize: FIRST_SCREEN_ROWS,
    })
    jobs = page.jobs
    updatedAt = page.updatedAt
    total = page.total
  } else {
    const first = await loadJobRows({ db, pro, profile, profileOk, matchDims, limit: FIRST_SCREEN_ROWS })
    jobs = first.jobs
    updatedAt = first.updatedAt
  }
  const tp = await proofPromise

  const jar = await cookies()
  const initialColW = parseColWidthSeed(jar.get(COLW_COOKIE)?.value) ?? DEFAULT_COLW_SEED
  const plan = toJobPlan({ user: user as SessionUser | null, pro, profile, profileOk })

  return (
    <Frame>
      <JobsHeader plan={plan} matchView={initialMatchView} />
      <Jobs jobs={jobs}
        updatedAt={updatedAt}
        dims={dims}
        initialCols={colsFromCookie(jar.get(COLS_COOKIE)?.value)}
        initialColW={initialColW}
        plan={plan}
        totalCount={total ?? (tp.total || jobs.length)}
        proof={{ named: tp.named, lmia: tp.lmia }}
        initialFilters={filters}
        initialMatchView={initialMatchView} />
      <Footer />
    </Frame>
  )
}
