/**
 * 会话域的 HTTP 芯（第十一抽屉）：Google 登录两跳的取参与 302 拼装。
 * 判定链整条在 functions 的 googleCallback（失败留痕也在那）；
 * 顶层只有 handler（闸 routes-shape）。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */
import { FOUND, HDR_LOCATION, HDR_SET_COOKIE, NOT_FOUND } from '../http'
import {
  FAIL_PATH, FLOW_COOKIE_AGE, GOOGLE_CLIENT_ID, HDR_COOKIE, K_FAIL, MSG_NOT_CONFIGURED, PARAM_CODE, PARAM_ERROR,
  PARAM_RETURN_TO, PARAM_STATE, RETURN_COOKIE, RETURN_RE, SITE, STATE_COOKIE,
} from './constants'
import { googleCallback, googleConsentUrl, oauthCookie, readCookie, sessionCookies } from './functions'

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
    rt = ''
  }
  if (RETURN_RE.test(rt)) {
    headers.push([HDR_SET_COOKIE, oauthCookie({ name: RETURN_COOKIE, value: encodeURIComponent(rt), maxAge: FLOW_COOKIE_AGE })])
  }
  return new Response(null, { status: FOUND, headers })
}

/**
 * GET /api/auth/google/callback：第 2 跳 —— 取参 → googleCallback 判定链 → 按 kind 拼 302。
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
        [HDR_SET_COOKIE]: oauthCookie({ name: STATE_COOKIE, value: '', maxAge: 0 }),
      },
    })
  }
  const [tokenCookie, traceCookie] = sessionCookies(outcome.session)
  return new Response(null, {
    status: FOUND,
    headers: [
      [HDR_LOCATION, SITE + outcome.rt],
      [HDR_SET_COOKIE, tokenCookie],
      [HDR_SET_COOKIE, traceCookie],
      [HDR_SET_COOKIE, oauthCookie({ name: STATE_COOKIE, value: '', maxAge: 0 })],
      [HDR_SET_COOKIE, oauthCookie({ name: RETURN_COOKIE, value: '', maxAge: 0 })],
    ],
  })
}
