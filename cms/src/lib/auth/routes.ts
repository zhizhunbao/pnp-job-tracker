/**
 * 会话域的 HTTP 芯（第十一抽屉）：Google 登录两跳的取参与 302 拼装。
 * 判定链整条在 functions 的 googleCallback（失败留痕也在那）；
 * 顶层只有 handler（闸 routes-shape）。
 * 2026-09-26 /fe Frank:当场建号(session.created)在这里给第一方漏斗记一笔 signup(google)——
 * 建号只有服务端知道;写法照漏斗路由(toFunnelHit + recordHit,池由本芯注入),本机来源不计。
 * 2026-11-07 账户设置(Frank「先做 5 条必备」第 5 条,只留改邮箱、改密码):POST /api/auth/password、
 * POST /api/auth/email(发确认信,发信函数由本芯注入)、GET /api/auth/email/confirm(点信里的链接,302 回账户设置)。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { isLocalHost, toFunnelHit } from '../funnel'
import { recordHit, siteHostOf } from '../funnel/server'
import {
  BAD_REQUEST, FOUND, HDR_HOST, HDR_LOCATION, HDR_ORIGIN, HDR_SET_COOKIE, NOT_FOUND, UNAUTHORIZED,
} from '../http'
import { sendMail } from '../mail'
import { getUserOrNull } from '../quota/server'
import {
  COOKIE_DEL_VALUE, EVENT_SIGNUP, FAIL_PATH, FLOW_COOKIE_AGE, GOOGLE_CLIENT_ID, HDR_COOKIE, K_FAIL, MSG_NOT_CONFIGURED,
  PARAM_CODE, PARAM_ERROR, PARAM_RETURN_TO, PARAM_STATE, PROVIDER_GOOGLE, RETURN_COOKIE, RETURN_NONE, RETURN_RE, SITE,
  STATE_COOKIE, E_BODY, E_SIGNED_OUT, K_OK, P_E, P_T, P_TS, P_U, SETTINGS_BACK_PATH,
} from './constants'
import {
  changePassword, confirmEmailChange, googleCallback, googleConsentUrl, oauthCookie, paramOf, readCookie,
  requestEmailChange, sessionCookies, statusOfCode, toSettingsBody,
} from './functions'
import type { MaybeSettingsBodyJson, SettingsBodyJson } from './types'

/**
 * GET /api/auth/google：第 1 跳，302 到 Google 同意屏（E11-03 #54）。
 * env 未配 = 404（前端钮同门控不渲染，本路由只是兑底）；state cookie 防 CSRF；
 * 回跳目标随行（E9-04b）：只收站内路径，不合法=忽略照旧回首页。
 *
 * @param req 请求（searchParams.returnTo = 登录后回跳的站内路径）。
 * @returns 302；env 未配 404。
 */
export async function googleStartRoute(req: Request): Promise<Response> {
  if (GOOGLE_CLIENT_ID === '') {
    return new Response(MSG_NOT_CONFIGURED, { status: NOT_FOUND })
  }
  const state = crypto.randomUUID()
  const headers: [string, string][] = [
    [HDR_LOCATION, googleConsentUrl(state)],
    [HDR_SET_COOKIE, oauthCookie({ name: STATE_COOKIE, value: state, maxAge: FLOW_COOKIE_AGE })],
  ]
  let rt = new URL(req.url).searchParams.get(PARAM_RETURN_TO)
  if (rt == null) {
    rt = RETURN_NONE
  }
  if (RETURN_RE.test(rt)) {
    headers.push([HDR_SET_COOKIE, oauthCookie({ name: RETURN_COOKIE, value: encodeURIComponent(rt), maxAge: FLOW_COOKIE_AGE })])
  }
  return new Response(null, { status: FOUND, headers })
}

/**
 * GET /api/auth/google/callback：第 2 跳 —— 取参 → googleCallback 判定链 → 按 kind 拼 302。
 * 2026-09-26 /fe Frank:成功且当场建号 = 第一方漏斗记一笔 signup(google);老账号再登录不记,
 * 本机来源不计(dev 直连生产库,同漏斗路由口径);不进 Umami(服务端没有 window.umami)。
 *
 * @param req 回调请求（code/state 在 searchParams，state/return 在 cookie）。
 * @returns 302（成功种会话 cookie；失败带 oauth=fail）。
 */
export async function googleCallbackRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const cookieHeader = req.headers.get(HDR_COOKIE)
  let rtRaw = readCookie({ header: cookieHeader, name: RETURN_COOKIE })
  if (rtRaw != null) {
    rtRaw = decodeURIComponent(rtRaw)
  }
  const outcome = await googleCallback({
    code: sp.get(PARAM_CODE), error: sp.get(PARAM_ERROR), stateParam: sp.get(PARAM_STATE),
    cookieState: readCookie({ header: cookieHeader, name: STATE_COOKIE }), rtRaw: rtRaw,
  })
  if (outcome.kind === K_FAIL) {
    return new Response(null, {
      status: FOUND,
      headers: {
        [HDR_LOCATION]: SITE + FAIL_PATH,
        [HDR_SET_COOKIE]: oauthCookie({ name: STATE_COOKIE, value: COOKIE_DEL_VALUE, maxAge: 0 }),
      },
    })
  }
  if (outcome.session.created) {
    const host = siteHostOf({ origin: req.headers.get(HDR_ORIGIN), host: req.headers.get(HDR_HOST) })
    const hit = toFunnelHit({ name: EVENT_SIGNUP, prop: PROVIDER_GOOGLE })
    if (hit != null && isLocalHost(host) === false) {
      await recordHit({ db: await getDb(), hit: hit })
    }
  }
  const [tokenCookie, traceCookie] = sessionCookies(outcome.session)
  return new Response(null, {
    status: FOUND,
    headers: [
      [HDR_LOCATION, SITE + outcome.rt],
      [HDR_SET_COOKIE, tokenCookie],
      [HDR_SET_COOKIE, traceCookie],
      [HDR_SET_COOKIE, oauthCookie({ name: STATE_COOKIE, value: COOKIE_DEL_VALUE, maxAge: 0 })],
      [HDR_SET_COOKIE, oauthCookie({ name: RETURN_COOKIE, value: COOKIE_DEL_VALUE, maxAge: 0 })],
    ],
  })
}

/**
 * GET /api/auth/email/confirm:点确认信里的链接(免登录)。判定在 functions 的 confirmEmailChange;
 * 不论成败都 302 回「我的」账户设置,结果码挂在 `email=` 上,页面据此出提示。
 *
 * @param req 请求(u、e、ts、t 四个参数)。
 * @returns 302。
 */
export async function authEmailConfirmRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const code = await confirmEmailChange({
    u: paramOf(sp.get(P_U)), e: paramOf(sp.get(P_E)), ts: paramOf(sp.get(P_TS)), t: paramOf(sp.get(P_T)),
  })
  return new Response(null, { status: FOUND, headers: { [HDR_LOCATION]: SITE + SETTINGS_BACK_PATH + code } })
}

/**
 * POST /api/auth/email:申请改登录邮箱(登录态;体 { email, current })。判定在 functions 的 requestEmailChange,
 * 发信函数从这里注入。
 *
 * @param req 请求。
 * @returns { ok };没登录 401、体不合形 400、邮箱被占 409、信没发出去 502、其余不过关 400(error 是结果码)。
 */
export async function authEmailRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_SIGNED_OUT }, { status: UNAUTHORIZED })
  }
  let raw: MaybeSettingsBodyJson = null
  try {
    raw = await req.json() as SettingsBodyJson
  } catch {
    raw = null
  }
  const body = toSettingsBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const code = await requestEmailChange({ userId: user.id, email: body.email, password: body.current, send: sendMail })
  if (code === K_OK) {
    return Response.json({ ok: true })
  }
  return Response.json({ error: code }, { status: statusOfCode(code) })
}

/**
 * POST /api/auth/password:改密码(登录态;体 { current, next })。判定在 functions 的 changePassword。
 *
 * @param req 请求。
 * @returns { ok };没登录 401、体不合形 400、其余不过关 400(error 是结果码)。
 */
export async function authPasswordRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_SIGNED_OUT }, { status: UNAUTHORIZED })
  }
  let raw: MaybeSettingsBodyJson = null
  try {
    raw = await req.json() as SettingsBodyJson
  } catch {
    raw = null
  }
  const body = toSettingsBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const code = await changePassword({ userId: user.id, current: body.current, next: body.next })
  if (code === K_OK) {
    return Response.json({ ok: true })
  }
  return Response.json({ error: code }, { status: statusOfCode(code) })
}
