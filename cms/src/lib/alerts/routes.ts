/**
 * 提醒域的 HTTP 芯（第十一抽屉）：/api/alerts/run 与 /api/alerts/unsub。
 * 2026-10-10 批 2「新岗推送」:加 /api/alerts/confirm(换收件邮箱的确认链接)与 /api/alerts/prefs(GET 读 / POST 存推送设置);
 * run 往编排里注入今日推荐取数(lib/myjobs 的 loadPicks + picksViewOf,每日推送用)。
 * 顶层只有 handler（闸 routes-shape）；本文件是域内边缘，唯一允许借别域 server 门取数。
 * fetchHits 内联闭包里的 `as JobsFilters` 是跨边界断言：保存的筛选是 payload 里的
 * 自由 json，loadAlertHits 自己按白名单收。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { loadAlertHits, loadMatchDims } from '../jobs/server'
import { loadPicks, picksViewOf } from '../myjobs/server'
import { getUserOrNull } from '../quota/server'
import type { JobsFilters } from '../jobs/server'
import {
  BAD_REQUEST, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE_LC, HDR_SEED_TOKEN, MIME_HTML, TEXT_UNAUTHORIZED, UNAUTHORIZED,
} from '../http'
import { fill } from '../template'
import {
  CACHE_PRIVATE, EMAIL_MAX_LEN, EMAIL_RE, E_AUTH, E_BODY, E_EMAIL, FREQS, K_PREVIEW, PARAM_NONE, P_DRY, P_FORCE, P_LANG, P_PREVIEW,
  P_TOKEN, P_USER, QUIET_RANGE, SWITCH_ON,
} from './constants'
import {
  confirmApply, confirmPageHtml, isDryRun, loadDigestPrefs, quietInfo, runAlerts, saveDigestPrefs, unsubApply, unsubPageHtml,
} from './functions'
import type { LoadHitsFn, LoadPicksFn, MailPick, PicksForIn, PrefsBodyJson } from './types'

/**
 * GET /api/alerts/confirm:换收件邮箱的确认链接(免登录;u=用户 id,t=token)。判定与落库在 functions 的 confirmApply。
 *
 * @param req 确认请求。
 * @returns 双语确认页。
 */
export async function alertsConfirmRoute(req: Request): Promise<Response> {
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
  const state = await confirmApply({ db: await getDb(), u, t })
  return new Response(confirmPageHtml(state), { headers: { [HDR_CONTENT_TYPE_LC]: MIME_HTML } })
}

/**
 * GET /api/alerts/prefs:本人的新岗推送设置(频率、实际收件邮箱、待确认的新邮箱)。
 *
 * @param _req 请求。
 * @returns { freq, email, pending };未登录 401。
 */
export async function alertsPrefsGetRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const prefs = await loadDigestPrefs({ db: await getDb(), userId: user.id, account: user.email })
  return Response.json(prefs, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * POST /api/alerts/prefs:存新岗推送设置 { freq, email }。换成新邮箱先发确认信,点了才生效。
 *
 * @param req 请求(json 体)。
 * @returns { result: saved / pending / mail };未登录 401,体不合形 400。
 */
export async function alertsPrefsPostRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const body = await req.json() as PrefsBodyJson
  let freq = PARAM_NONE
  for (const f of FREQS) {
    if (body.freq === f) {
      freq = f
    }
  }
  if (freq === PARAM_NONE || body.email == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const email = body.email.trim().toLowerCase()
  if (email.length > EMAIL_MAX_LEN || EMAIL_RE.test(email) === false) {
    return Response.json({ error: E_EMAIL }, { status: BAD_REQUEST })
  }
  const result = await saveDigestPrefs({ db: await getDb(), userId: user.id, account: user.email, freq, email })
  return Response.json({ result }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

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
  const loadPicksFor: LoadPicksFn = async function loadPicksFor(x: PicksForIn): Promise<MailPick[]> {
    const rows = await loadPicks({ db: pool, userId: x.userId, prov: PARAM_NONE })
    return picksViewOf({ rows, pro: x.pro }).picks
  }
  const result = await runAlerts({
    db: pool, dry: dry, preview: preview, previewLang: previewLang,
    dims: await loadMatchDims(pool), fetchHits: fetchHits, payload: payload, loadPicks: loadPicksFor,
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
  const state = await unsubApply({ payload: payload, db: await getDb(), u: u, t: t })
  return new Response(unsubPageHtml(state), { headers: { [HDR_CONTENT_TYPE_LC]: MIME_HTML } })
}
