/**
 * GET /api/auth/google — Google 登录 · 第 1 跳(E11-03 #54):302 到同意屏。
 * env 未配 = 404(前端钮同门控不渲染,本路由只是兜底);state cookie 防 CSRF(回调核对)。
 * 回跳目标随行(E9-04b):只收站内路径,cookie 携带,回调核对后落地;不合法=忽略照旧回首页。
 * 编排全在 lib/auth,这里只:取参 → 造 state → 302 + 种 cookie。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */
import {
  FLOW_COOKIE_AGE, GOOGLE_CLIENT_ID, PARAM_RETURN_TO, RETURN_COOKIE, RETURN_RE, STATE_COOKIE, googleConsentUrl,
  oauthCookie,
} from '@/lib/auth/server'

/**
 * 强制动态渲染(每次都要新 state)。
 */
export const dynamic = 'force-dynamic'

/**
 * 第 1 跳:302 到 Google 同意屏。
 *
 * @param req 请求(searchParams.returnTo = 登录后回跳的站内路径)。
 * @returns 302;env 未配 404。
 */
export async function GET(req: Request): Promise<Response> {
  if (GOOGLE_CLIENT_ID === '') {
    return new Response('Google login not configured', { status: 404 })
  }
  const state = crypto.randomUUID()
  const headers: [string, string][] = [
    ['Location', googleConsentUrl(state)],
    ['Set-Cookie', oauthCookie({ name: STATE_COOKIE, value: state, maxAge: FLOW_COOKIE_AGE })],
  ]
  let rt = new URL(req.url).searchParams.get(PARAM_RETURN_TO)
  if (rt == null) {
    rt = ''
  }
  if (RETURN_RE.test(rt)) {
    headers.push(['Set-Cookie', oauthCookie({ name: RETURN_COOKIE, value: encodeURIComponent(rt), maxAge: FLOW_COOKIE_AGE })])
  }
  return new Response(null, { status: 302, headers })
}
