/**
 * GET /api/market-stats — 统计主图(MarketChart)四份数据:occ/city/rows/channels。
 * 从 /start、/stats 的 SSR 拆出来(手法照 /api/dims 拆 /api/jobs-data):occ ~3400 行是 HTML 里最大一坨
 * (实测 /start 直出 1.85MB,手机端解析重),与用户无关、mart 日更 —— 改挂载后后台拉,SSR 不再背它。
 * 进程内 10 分钟缓存(与 start/page.tsx homeCache 同 TTL 手法;Render 单实例,进程缓存即全局缓存),
 * 浏览器侧再叠 5 分钟 + SWR(同 /api/dims:过期先用旧的再后台换新,页间往返不重付)。
 */
import { loadChannelNocs, loadCityStats, loadOccStats, loadStats } from '@/app/(frontend)/stats/lib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cache: { v: object; ts: number } | null = null
const TTL = 10 * 60_000

export async function GET() {
  if (!cache || Date.now() - cache.ts >= TTL) {
    // 每份独立 .catch 空值(同 start 页红线):一张表缺只丢它自己,前端拿到空数组整节不渲,绝不 500
    const [occ, city, rows, channels] = await Promise.all([
      loadOccStats().catch(() => []),
      loadCityStats().catch(() => []),
      loadStats('', [], { withMid: true }).catch(() => []),   // withMid:图表下钻要中类行(与两页原口径一致)
      loadChannelNocs().catch(() => ({ pnp: [], ee: [] })),
    ])
    cache = { v: { occ, city, rows, channels }, ts: Date.now() }
  }
  return Response.json(cache.v, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } })
}
