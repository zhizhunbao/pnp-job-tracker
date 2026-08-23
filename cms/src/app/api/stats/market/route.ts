/**
 * GET /api/stats/market — 统计主图(MarketChart)四份数据:occ/city/rows/channels。
 * 从 /start、/stats 的 SSR 拆出来(手法照 /api/jobs/dims 拆 /api/jobs-data):occ ~3400 行是 HTML 里最大一坨
 * (实测 /start 直出 1.85MB,手机端解析重),与用户无关、mart 日更 —— 改挂载后后台拉,SSR 不再背它。
 * 进程内 10 分钟缓存(与 start/page.tsx homeCache 同 TTL 手法;Render 单实例,进程缓存即全局缓存),
 * 浏览器侧再叠 5 分钟 + SWR(同 /api/jobs/dims:过期先用旧的再后台换新,页间往返不重付)。
 *
 * E13-03:把脉首页 S1-S4 的派生指标(new14d/new14d_prev/mom14d/avgDaysOpen/pulse_score,契约 v3)随 occ 一起出 ——
 * 列在 loadOccStats 里逐列探测后加,本路由是纯透传(单一真相源在 lib/stats/server.ts,别在这儿再写一份 SELECT)。
 * 列未落库时该列值为 null,前端整块不渲,本路由永不 500。
 */
import { getDb } from '@/lib/db/server'
import { loadChannelNocs, loadCityStats, loadOccStats, loadStats } from '@/lib/stats/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cache: { v: object; ts: number } | null = null
const TTL = 10 * 60_000

export async function GET() {
  if (!cache || Date.now() - cache.ts >= TTL) {
    // 每份独立 .catch 空值(同 start 页红线):一张表缺只丢它自己,前端拿到空数组整节不渲,绝不 500
    const db = await getDb()
    const [occ, city, rows, channels] = await Promise.all([
      loadOccStats(db).catch(() => []),
      loadCityStats(db).catch(() => []),
      loadStats({ db, withMid: true }).catch(() => []),   // withMid:图表下钻要中类行(与两页原口径一致)
      loadChannelNocs(db).catch(() => ({ pnp: [], ee: [] })),
    ])
    cache = { v: { occ, city, rows, channels }, ts: Date.now() }
  }
  return Response.json(cache.v, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } })
}
