/**
 * GET /api/auth/google/callback — Google 登录 · 第 2 跳(E11-03):
 * code 换 token → userinfo → 关联/创建用户并签会话(编排全在 lib/auth)→ 302 回原页。
 * 任何失败 → /?login=1&oauth=fail(原因留痕在 AUTH_LOG)。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */
import {
  FAIL_PATH, GOOGLE_CLIENT_ID, HDR_COOKIE, PARAM_CODE, PARAM_ERROR, PARAM_STATE, RETURN_COOKIE, SITE,
  STATE_COOKIE, exchangeCode, fetchGoogleUser, loginWithGoogle, oauthCookie, readCookie, safeReturnPath,
  sessionCookies,
} from '@/lib/auth/server'
import { FOUND, HDR_LOCATION, HDR_SET_COOKIE } from '@/lib/http'
import { AUTH_LOG, log } from '@/lib/log'

/**
 * 强制动态渲染。
 */
export const dynamic = 'force-dynamic'

/**
 * 跑在 node 运行时(要连库签会话)。
 */
export const runtime = 'nodejs'

/**
 * 统一失败出口:留痕 + 302 回首页带 oauth=fail,顺手清 state cookie。
 *
 * @param why 失败原因(只进日志,不见客)。
 * @returns 302。
 */
function fail(why: string): Response {
  log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + why })
  return new Response(null, {
    status: FOUND,
    headers: {
      [HDR_LOCATION]: SITE + FAIL_PATH,
      [HDR_SET_COOKIE]: oauthCookie({ name: STATE_COOKIE, value: '', maxAge: 0 }),
    },
  })
}

/**
 * 第 2 跳:换 token、取 userinfo、登录、302 回原页。
 *
 * @param req 回调请求(code/state 在 searchParams,state/return 在 cookie)。
 * @returns 302(成功种会话 cookie;失败带 oauth=fail)。
 */
export async function GET(req: Request): Promise<Response> {
  if (GOOGLE_CLIENT_ID === '') {
    return fail('env missing')
  }
  const sp = new URL(req.url).searchParams
  const code = sp.get(PARAM_CODE)
  if (sp.get(PARAM_ERROR) != null || code == null || code === '') {
    let why = sp.get(PARAM_ERROR)
    if (why == null) {
      why = 'no code'
    }
    return fail('consent error: ' + why)
  }
  const cookieHeader = req.headers.get(HDR_COOKIE)
  const cookieState = readCookie({ header: cookieHeader, name: STATE_COOKIE })
  if (cookieState == null || sp.get(PARAM_STATE) !== cookieState) {
    return fail('state mismatch')
  }
  const accessToken = await exchangeCode({ code })
  if (accessToken == null) {
    return fail('token exchange failed')
  }
  const gu = await fetchGoogleUser(accessToken)
  if (gu == null) {
    return fail('email missing/unverified')
  }
  let session: Awaited<ReturnType<typeof loginWithGoogle>>
  try {
    session = await loginWithGoogle(gu)
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    return fail('login failed: ' + why)
  }
  let rtRaw = readCookie({ header: cookieHeader, name: RETURN_COOKIE })
  if (rtRaw != null) {
    rtRaw = decodeURIComponent(rtRaw)
  }
  const rt = safeReturnPath(rtRaw)
  const [tokenCookie, traceCookie] = sessionCookies(session)
  return new Response(null, {
    status: FOUND,
    headers: [
      [HDR_LOCATION, SITE + rt],
      [HDR_SET_COOKIE, tokenCookie],
      [HDR_SET_COOKIE, traceCookie],
      [HDR_SET_COOKIE, oauthCookie({ name: STATE_COOKIE, value: '', maxAge: 0 })],
      [HDR_SET_COOKIE, oauthCookie({ name: RETURN_COOKIE, value: '', maxAge: 0 })],
    ],
  })
}
