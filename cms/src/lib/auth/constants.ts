/**
 * 会话域的死值:票据 cookie 名。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

/**
 * Payload 会话 cookie 名。payload.config 未配 cookiePrefix → 用默认名;
 * 改名要连 api/auth/google/callback 的 Set-Cookie 一起改(那条自己签同名 token)。
 */
export const SSR_TOKEN_COOKIE = 'payload-token'
