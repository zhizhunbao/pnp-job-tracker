/**
 * 提醒域的 HTTP 芯（第十一抽屉）：/api/alerts/run 与 /api/alerts/unsub。
 * 顶层只有 handler（闸 routes-shape）；本文件是域内边缘，唯一允许借别域 server 门取数。
 * fetchHits 内联闭包里的 `as JobsFilters` 是跨边界断言：保存的筛选是 payload 里的
 * 自由 json，loadAlertHits 自己按白名单收。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDb } from '../db/server'
import { loadAlertHits, loadMatchDims } from '../jobs/server'
import type { JobsFilters } from '../jobs/server'
import {
  HDR_CONTENT_TYPE_LC, HDR_SEED_TOKEN, MIME_HTML, TEXT_UNAUTHORIZED, UNAUTHORIZED,
} from '../http'
import { fill } from '../template'
import {
  K_PREVIEW, PARAM_NONE, P_DRY, P_FORCE, P_LANG, P_PREVIEW, P_TOKEN, P_USER, QUIET_RANGE, SWITCH_ON,
} from './constants'
import { isDryRun, quietInfo, runAlerts, unsubApply, unsubPageHtml } from './functions'
import type { LoadHitsFn } from './types'

/**
 * GET /api/alerts/run：跑一轮提醒(2026-08-23 两域拍板后 alerts 即正名,URL↔名机械映射;
 * 当日上午的 mail/run 方向作废)。x-seed-token 鉴权;dry/preview/lang/force 见 functions 头。
 * 静默窗口内（非 dry/preview/force）整轮不发，返回 deferred 说明。
 *
 * @param req 触发请求。
 * @returns 计数 json；preview 时是邮件 HTML。
 */
export async function alertsRunRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  const sp = new URL(req.url).searchParams
  const dry = isDryRun(sp.get(P_DRY))
  let preview = PARAM_NONE
  const previewParam = sp.get(P_PREVIEW)
  if (previewParam != null) {
    preview = previewParam
  }
  const q = quietInfo()
  if (q.inQuiet && dry === false && preview === '' && sp.get(P_FORCE) !== SWITCH_ON) {
    return Response.json({ ok: true, deferred: true, quietHours: fill({ tpl: QUIET_RANGE, params: { qs: q.qs, qe: q.qe } }), etHour: q.etHour })
  }
  const payload = await getPayload({ config: await config })
  const pool = await getDb()
  let previewLang = PARAM_NONE
  const langParam = sp.get(P_LANG)
  if (langParam != null) {
    previewLang = langParam
  }
  const fetchHits: LoadHitsFn = function fetchHits(input) {
    return loadAlertHits({ db: pool, filters: input.filters as JobsFilters, since: input.since })
  }
  const result = await runAlerts({
    db: pool, dry: dry, preview: preview, previewLang: previewLang,
    dims: await loadMatchDims(pool), fetchHits: fetchHits, payload: payload,
  })
  if (result.kind === K_PREVIEW) {
    return new Response(result.html, { headers: { [HDR_CONTENT_TYPE_LC]: MIME_HTML } })
  }
  return Response.json(result.counts)
}

/**
 * GET /api/alerts/unsub：周报一键退订。判定与落库在 functions 的 unsubApply，
 * 页面文案在 constants；这里只取参、拼 text/html 响应。
 *
 * @param req 退订请求（u=用户 id，t=token）。
 * @returns 双语确认页。
 */
export async function alertsUnsubRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let u = PARAM_NONE
  const uParam = sp.get(P_USER)
  if (uParam != null) {
    u = uParam
  }
  let t = PARAM_NONE
  const tParam = sp.get(P_TOKEN)
  if (tParam != null) {
    t = tParam
  }
  const payload = await getPayload({ config: await config })
  const state = await unsubApply({ payload: payload, u: u, t: t })
  return new Response(unsubPageHtml(state), { headers: { [HDR_CONTENT_TYPE_LC]: MIME_HTML } })
}
