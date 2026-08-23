/**
 * 漏斗域的 HTTP 芯（第十一抽屉）：/api/track 的取参与统一 204。
 * 隐私：只加一个计数，不写 IP / UA / user id / session —— 请求体之外的东西一概不碰。
 * 顶层只有 handler（闸 routes-shape）：判定与写库全在 functions。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */
import { getDb } from '../db/server'
import { HDR_HOST, HDR_ORIGIN, NO_CONTENT } from '../http'
import { isLocalHost, recordHit, siteHostOf, toFunnelHit } from './functions'
import type { TrackBody, TrackValue } from './types'

/**
 * POST /api/track：收一条埋点。json 坏体 / 白名单外 / 本机流量 / 库抖动
 * 一律静默 204 —— 埋点丢一次比页面报错强，判据与理由见本域 functions。
 *
 * @param req 请求（body: { event, prop }）。
 * @returns 恒 204。
 */
export async function trackRoute(req: Request): Promise<Response> {
  let body: TrackBody = { event: null, prop: null }
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: NO_CONTENT })
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
    return new Response(null, { status: NO_CONTENT })
  }
  if (isLocalHost(siteHostOf({ origin: req.headers.get(HDR_ORIGIN), host: req.headers.get(HDR_HOST) }))) {
    return new Response(null, { status: NO_CONTENT })
  }
  await recordHit({ db: await getDb(), hit: hit })
  return new Response(null, { status: NO_CONTENT })
}
