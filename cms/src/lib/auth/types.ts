/**
 * 会话域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

/**
 * `ssrHasSession` 的返回(有没有票据)。
 */
export type HasSessionOut = Promise<boolean>

/**
 * Google userinfo 里本域读的几格(别人家的对象,缺席格在函数门口收)。
 */
export type GoogleUser = {
  /**
   * 已验证的邮箱(小写)。
   */
  email: string

  /**
   * 显示名;没给是 null。
   */
  name: string | null

  /**
   * 头像 URL;没给是 null。
   */
  picture: string | null
}

/**
 * userinfo 或没拿到(任一步失败给 null,原因由调用方留痕)。
 */
export type MaybeGoogleUser = GoogleUser | null

/**
 * `exchangeCode` 的入参。
 */
export type ExchangeIn = {
  /**
   * 同意屏回来的授权码。
   */
  code: string
}

/**
 * access_token 或没换到。
 */
export type MaybeToken = Promise<string | null>

/**
 * `loginWithGoogle` 的入参(userinfo 已验证过 email_verified)。
 */
export type GoogleLoginIn = {
  /**
   * 已验证邮箱(小写)。
   */
  email: string

  /**
   * 显示名;没给 null(只补空,不覆盖用户已设的)。
   */
  name: string | null

  /**
   * 头像;没给 null(同上只补空)。
   */
  picture: string | null
}

/**
 * `loginWithGoogle` 的产物:签好的会话 token 与种 cookie 要的两样。
 */
export type GoogleLogin = {
  /**
   * payload-token(与 Payload login 同形:getFieldsToSign+sid+jwtSign)。
   */
  token: string

  /**
   * token 有效期(秒;cookie Max-Age 同值)。
   */
  tokenExpiration: number

  /**
   * 会话 cookie 前缀(payload.config 未配则默认 'payload')。
   */
  cookiePrefix: string
}

/**
 * `loginWithGoogle` 的返回(失败抛,由路由统一 302 fail)。
 */
export type GoogleLoginOut = Promise<GoogleLogin>

/**
 * `readCookie` 的入参。
 */
export type ReadCookieIn = {
  /**
   * 请求的 Cookie 头原文;没有是 null。
   */
  header: string | null

  /**
   * 要读的 cookie 名。
   */
  name: string
}

/**
 * `oauthCookie` 的入参。
 */
export type OauthCookieIn = {
  /**
   * cookie 名。
   */
  name: string

  /**
   * 值(已按需 encode;清除时给空串)。
   */
  value: string

  /**
   * 有效秒数(0 = 立删)。
   */
  maxAge: number
}

/**
 * payload 会话条目里本域读写的三格。
 */
export type SessionEntry = {
  /**
   * 会话 id(签进 token 的 sid)。
   */
  id: string

  /**
   * 建立时刻(ISO)。
   */
  createdAt: string

  /**
   * 过期时刻(ISO;过期条目登录时顺手清)。
   */
  expiresAt: string
}

/**
 * 会话存活判定的函数形状(filter 用)。
 */
export type AliveFn = (s: SessionEntry) => boolean

/**
 * cookie 值或没有(readCookie 的返回;safeReturnPath 的入参同型)。
 */
export type MaybeCookie = string | null

/**
 * 会话两条 Set-Cookie 串(token 在前、迹象在后)。
 */
export type SessionCookieList = string[]

/**
 * `fetchGoogleUser` 的返回。
 */
export type GoogleUserOut = Promise<MaybeGoogleUser>

/**
 * token 端点回包里本域读的一格。
 */
export type TokenBody = {
  /**
   * access_token;没给是 null。
   */
  access_token: string | null
}

/**
 * userinfo 回包里本域读的四格(别人家的对象,逐格判后收进 GoogleUser)。
 */
export type UserinfoBody = {
  /**
   * 邮箱。
   */
  email: string | null

  /**
   * 邮箱验证过没有(红线:非 true 一律拒)。
   */
  email_verified: boolean | null

  /**
   * 显示名。
   */
  name: string | null

  /**
   * 头像 URL。
   */
  picture: string | null
}

/**
 * payload.config 里本域读的一格。
 */
export type ConfigWithPrefix = {
  /**
   * 会话 cookie 前缀;未配是 null。
   */
  cookiePrefix: string | null
}

/**
 * 时刻的本地名(库类型起本地名,签名里不出现外部类型)。
 */
export type Clock = Date

/**
 * `googleCallback` 的入参（路由取好的五样原料；判定链全在域里）。
 */
export type GoogleCallbackIn = {
  /**
   * 授权码；没有是 null。
   */
  code: string | null

  /**
   * 同意屏的 error 参数；没有是 null。
   */
  error: string | null

  /**
   * 回调 URL 里的 state；没有是 null。
   */
  stateParam: string | null

  /**
   * cookie 里种的 state；没有是 null。
   */
  cookieState: string | null

  /**
   * 回跳目标 cookie 原料（已 decode）；没有是 null。
   */
  rtRaw: string | null
}

/**
 * 登录链的产物：成功带会话与回跳路径；失败只说失败（原因已在域里留痕，
 * 路由统一 302 回首页带 oauth=fail，不向用户透细节）。
 */
export type CallbackOutcome = {
  /**
   * 哪种产物。
   */
  kind: 'fail'
} | {
  /**
   * 哪种产物。
   */
  kind: 'ok'

  /**
   * 签好的会话三件。
   */
  session: GoogleLogin

  /**
   * 校验过的站内回跳路径。
   */
  rt: string
}

/**
 * `googleCallback` 的返回。
 */
export type CallbackOut = Promise<CallbackOutcome>
