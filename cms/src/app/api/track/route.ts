/**
 * POST /api/track — 第一方漏斗计数(主线 M2 / E7-05)。
 * body: { event: string, prop?: string }  → 白名单归一(lib/funnel)后按天 UPSERT 到 funnel_events。
 * 为什么不复用 umami:免费档不开放 API 拉数,且它的脚本会被广告拦截器挡掉 —— 锁区曝光那一步
 * 带着未知拦截率的数字没法拿来做 M3 的分叉判断。
 * 隐私:只加一个计数,不写 IP / UA / user id / session —— 请求体之外的东西一概不碰。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */
import { SQL } from '@/lib/db'
import { getDb } from '@/lib/db/server'
import { isLocalHost, toFunnelHit } from '@/lib/funnel'
import type { TrackValue } from '@/lib/funnel'

/**
 * 强制动态渲染(计数端点没有可缓存的东西)。
 */
export const dynamic = 'force-dynamic'

/**
 * 跑在 node 运行时(要连库)。
 */
export const runtime = 'nodejs'

/**
 * 统一应答:埋点永远不该让页面看见错误 —— 白名单外、库没表、写失败都一样 204。
 *
 * @returns 空体 204。
 */
function ok(): Response {
  return new Response(null, { status: 204 })
}

/**
 * 请求体里本端点读的两格(原料:类型不可信,判定在 toFunnelHit)。
 */
type TrackBody = {
  /**
   * 站内埋点名。
   */
  event: TrackValue

  /**
   * 低基数分组。
   */
  prop: TrackValue
}

/**
 * 取请求的 host(优先 origin 头;头不合法就按线上算 —— 宁可多记一条,也不静默丢线上流量)。
 *
 * @param req 请求。
 * @returns host 串;取不到给空串(空串不是本机)。
 */
function hostOf(req: Request): string {
  try {
    const origin = req.headers.get('origin')
    if (origin != null && origin !== '') {
      return new URL(origin).host
    }
    const host = req.headers.get('host')
    if (host != null) {
      return host
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * 收一条埋点。json 坏体 / 白名单外 / 本机流量 / 库抖动(表还没建)一律静默 204 ——
 * 埋点丢一次比页面报错强,判据与理由见 lib/funnel。
 *
 * @param req 请求(body: { event, prop })。
 * @returns 恒 204。
 */
export async function POST(req: Request): Promise<Response> {
  let body: TrackBody = { event: null, prop: null }
  try {
    body = await req.json()
  } catch {
    return ok()
  }
  let name: TrackValue = null
  if (typeof body.event !== 'undefined') {
    name = body.event
  }
  let prop: TrackValue = null
  if (typeof body.prop !== 'undefined') {
    prop = body.prop
  }
  const hit = toFunnelHit({ name: name, prop: prop })
  if (hit == null) {
    return ok()
  }
  if (isLocalHost(hostOf(req))) {
    return ok()
  }
  try {
    const db = await getDb()
    await db.query(SQL.FUNNEL_EVENT_UPSERT, [hit.event, hit.prop])
  } catch {}
  return ok()
}
