/**
 * POST /api/track — 第一方漏斗计数(主线 M2 / E7-05)。
 * body: { event: string, prop?: string }  → 白名单归一(lib/funnel)后按天 UPSERT 到 funnel_events。
 * 为什么不复用 umami:免费档不开放 API 拉数,且它的脚本会被广告拦截器挡掉 —— 锁区曝光那一步
 * 带着未知拦截率的数字没法拿来做 M3 的分叉判断。
 * 隐私:只加一个计数,不写 IP / UA / user id / session —— 请求体之外的东西一概不碰。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isLocalHost, toFunnelHit } from '@/lib/funnel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 埋点永远不该让页面看见错误:一律 204(白名单外、库没表、写失败都一样)
const OK = new Response(null, { status: 204 })

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { return OK }
  const hit = toFunnelHit(body?.event, body?.prop)
  if (!hit) return OK
  try {
    const origin = req.headers.get('origin') || ''
    const host = origin ? new URL(origin).host : (req.headers.get('host') || '')
    if (isLocalHost(host)) return OK   // 本机开发流量不计(判据与理由见 lib/funnel)
  } catch { /* 头不合法就按线上算(宁可多记一条,也不静默丢线上流量) */ }
  try {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as any).pool
    await pool.query(
      `INSERT INTO funnel_events (day, event, prop, n) VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (day, event, prop) DO UPDATE SET n = funnel_events.n + 1`,
      [hit.event, hit.prop],
    )
  } catch { /* 表还没建 / 库抖动:埋点丢一次比页面报错强 */ }
  return OK
}
