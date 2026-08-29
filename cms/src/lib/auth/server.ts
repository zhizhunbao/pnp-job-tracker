/**
 * 会话域的**服务端**门(next/headers 只在服务端存在)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

export {
  exchangeCode, loadGoogleUser, googleConsentUrl, loginWithGoogle, oauthCookie, readCookie, safeReturnPath,
  sessionCookies, ssrHasSession, ssrSessionSeed,
} from './functions'
export { googleCallbackRoute, googleStartRoute } from './routes'
export {
  FAIL_PATH, FLOW_COOKIE_AGE, GOOGLE_CLIENT_ID, HDR_COOKIE, MSG_NOT_CONFIGURED, PARAM_CODE, PARAM_ERROR, PARAM_RETURN_TO,
  PARAM_STATE, RETURN_COOKIE, RETURN_RE, SITE, STATE_COOKIE,
} from './constants'
