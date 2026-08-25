/**
 * 会话域的行为:「这个请求有没有会话身份」这一件事。
 * 认「人是谁」(解 token → 用户)在 quota 的 getUser —— 那是连库的事;
 * 本域只看票据在不在,首帧 SSR 用它决定渲染登录态壳还是匿名壳,零连库。
 * (2026-08-23 Frank 拍板单独立域:auth 不并进 quota —— 配额是「放不放行」,会话是「是谁来了」。)
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

import { cookies } from 'next/headers'
import { AUTH_LOG, log } from '../log'
import { getFieldsToSign, getPayload, jwtSign } from 'payload'
import config from '@/payload.config'
import {
  BEARER_PREFIX, CALLBACK_PATH, CONSENT_STATIC, COOKIE_PREFIX_DEFAULT, COOKIE_RE_HEAD, COOKIE_RE_TAIL, EMAIL_NONE,
  FLOW_COOKIE_TAIL, FORM_MIME, GOOGLE_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL, GRANT_AUTH_CODE, HTTPONLY_TAIL, HTTPS_PREFIX, KV_EQ, LI_PAIR, METHOD_POST,
  K_FAIL, K_OK, LOG_CONSENT, LOG_EMAIL, LOG_ENV_MISSING, LOG_LOGIN, LOG_NO_CODE, LOG_STATE, LOG_TOKEN,
  PARAM_CLIENT_ID, PARAM_REDIRECT, PARAM_STATE, PROVIDER_GOOGLE, RETURN_RE, ROOT_PATH, SECURE_TAIL,
  HEX_PAD, HEX_SEP, SECURE_TAIL_NONE, SESSION_COOKIE_TAIL, SITE, SSR_TOKEN_COOKIE, TOKEN_NAME_TAIL, USERS,
} from './constants'
import type {
  AliveFn, CallbackOut, GoogleCallbackIn, Clock, ConfigWithPrefix, ExchangeIn, GoogleLogin, GoogleLoginIn, GoogleLoginOut, GoogleUserOut,
  HasSessionOut, MaybeCookie, MaybeToken, OauthCookieIn, ReadCookieIn, SessionCookieList, SessionEntry,
  TokenBody, UserinfoBody,
} from './types'

/**
 * 首帧有没有会话票据。取不到 cookie 的极端情形按匿名占位 ——
 * 匿名是绝大多数流量,猜错的代价最小。
 *
 * @returns 有票据 true。
 */
export async function ssrHasSession(): HasSessionOut {
  try {
    const hit = (await cookies()).get(SSR_TOKEN_COOKIE)
    if (hit == null || hit.value === '') {
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Google 同意屏 URL(第 1 跳的 302 目标)。redirect_uri 显式取 SITE。
 *
 * @param state 防 CSRF 的随机串(路由生成并种 cookie,回调核对)。
 * @returns 同意屏完整 URL。
 */
export function googleConsentUrl(state: string): string {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set(PARAM_CLIENT_ID, GOOGLE_CLIENT_ID)
  url.searchParams.set(PARAM_REDIRECT, SITE + CALLBACK_PATH)
  for (const [k, v] of CONSENT_STATIC) {
    url.searchParams.set(k, v)
  }
  url.searchParams.set(PARAM_STATE, state)
  return url.toString()
}

/**
 * https 站点的 cookie 追加 Secure(本地 http 不加,否则种不上)。
 *
 * @returns cookie 尾缀。
 */
function secureSuffix(): string {
  if (SITE.startsWith(HTTPS_PREFIX)) {
    return SECURE_TAIL
  }
  return SECURE_TAIL_NONE
}

/**
 * 造一条 OAuth 流程 cookie(HttpOnly + Lax)。
 *
 * @param input cookie 名与值(值已按需 encode;maxAge 秒,0 = 立删)。
 * @returns Set-Cookie 串。
 */
export function oauthCookie(input: OauthCookieIn): string {
  return input.name + KV_EQ + input.value + FLOW_COOKIE_TAIL + input.maxAge + secureSuffix()
}

/**
 * 会话两条 cookie(payload-token + 登录迹象)的 Set-Cookie 串。
 * 迹象 cookie 不带 HttpOnly —— 它存在的意义就是给前端 JS 读(见 LI_COOKIE 的注释)。
 *
 * @param input 签好的 token 三件。
 * @returns 两条 Set-Cookie 串(token 在前)。
 */
export function sessionCookies(input: GoogleLogin): SessionCookieList {
  const tail = SESSION_COOKIE_TAIL + input.tokenExpiration + secureSuffix()
  return [
    input.cookiePrefix + TOKEN_NAME_TAIL + KV_EQ + input.token + HTTPONLY_TAIL + tail,
    LI_PAIR + tail,
  ]
}

/**
 * 从 Cookie 头里读一个值(没有给 null)。
 *
 * @param input 头原文与 cookie 名。
 * @returns 值;没有是 null。
 */
export function readCookie(input: ReadCookieIn): MaybeCookie {
  if (input.header == null) {
    return null
  }
  const hit = new RegExp(COOKIE_RE_HEAD + input.name + COOKIE_RE_TAIL).exec(input.header)
  if (hit == null) {
    return null
  }
  return hit[1]
}

/**
 * 回跳目标收窄:只收站内路径(防 open redirect),不合法回首页。
 *
 * @param raw cookie 里带回来的原料;没有是 null。
 * @returns 安全的站内路径。
 */
export function safeReturnPath(raw: MaybeCookie): string {
  if (raw != null && RETURN_RE.test(raw)) {
    return raw
  }
  return ROOT_PATH
}

/**
 * code 换 access_token(任一步失败给 null,原因由路由留痕后统一 302 fail)。
 *
 * @param input 授权码。
 * @returns access_token 或 null。
 */
export async function exchangeCode(input: ExchangeIn): MaybeToken {
  let res: Response | null = null
  try {
    res = await fetch(GOOGLE_TOKEN_URL, {
      method: METHOD_POST, headers: { 'Content-Type': FORM_MIME },
      body: new URLSearchParams({
        code: input.code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: SITE + CALLBACK_PATH, grant_type: GRANT_AUTH_CODE,
      }),
    })
  } catch {
    return null
  }
  if (res.ok === false) {
    return null
  }
  let tok: TokenBody = { access_token: null }
  try {
    tok = await res.json()
  } catch {
    return null
  }
  if (typeof tok.access_token === 'string' && tok.access_token !== '') {
    return tok.access_token
  }
  return null
}

/**
 * userinfo(openid 标准端点)。红线:只认 email_verified === true —— 邮箱没验证的一律 null。
 *
 * @param accessToken 换来的 access_token。
 * @returns 本域要的三格;任一步失败或邮箱未验证给 null。
 */
export async function loadGoogleUser(accessToken: string): GoogleUserOut {
  let res: Response | null = null
  try {
    res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: BEARER_PREFIX + accessToken } })
  } catch {
    return null
  }
  if (res.ok === false) {
    return null
  }
  let ui: UserinfoBody
  try {
    ui = await res.json()
  } catch {
    return null
  }
  let email = EMAIL_NONE
  if (typeof ui.email === 'string') {
    email = ui.email.toLowerCase()
  }
  if (email === '' || ui.email_verified !== true) {
    return null
  }
  let name: string | null = null
  if (typeof ui.name === 'string' && ui.name !== '') {
    name = String(ui.name).slice(0, 40)
  }
  let picture: string | null = null
  if (typeof ui.picture === 'string' && ui.picture !== '') {
    picture = ui.picture
  }
  return { email: email, name: name, picture: picture }
}

/**
 * 按已验证邮箱查找/创建用户并签会话(镜像 Payload 3.85 login op:getFieldsToSign+sid+jwtSign,
 * useSessions 默认开,无 sid 的 token 会被 jwt 策略拒收)。
 * 红线:已存在的邮箱账号按邮箱关联登录,**不动其密码**(不用改密来借道 login);
 * 关联登录只补空头像/昵称,不覆盖用户已设的。新用户 loginProvider=google + 随机密码
 * (用户不持有,走 Google 或忘记密码自设)。失败抛,由路由统一 302 fail。
 * 体内三张 no-explicit-any 特批牌都是同一个接缝:payload 用户的生成型跟 collection 走,
 * 本域只读 id/avatar/displayName/sessions 几格。
 *
 * @param input 已验证的三格。
 * @returns token 与种 cookie 要的两样。
 */
export async function loginWithGoogle(input: GoogleLoginIn): GoogleLoginOut {
  const payload = await getPayload({ config: await config })
  const found = await payload.find({
    collection: USERS, where: { email: { equals: input.email } }, limit: 1,
    overrideAccess: true, showHiddenFields: true,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(理由见函数 JSDoc)
  let user = found.docs[0] as any
  const backfill: Record<string, string> = {}
  if (user == null) {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(24)), toHex).join(HEX_SEP)
    const data: Record<string, string> = { email: input.email, password: rand, loginProvider: PROVIDER_GOOGLE }
    if (input.name != null) {
      data.displayName = input.name
    }
    if (input.picture != null) {
      data.avatar = input.picture
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(理由见函数 JSDoc)
    user = await payload.create({ collection: USERS, overrideAccess: true, data: data as any })
  } else {
    if ((user.avatar == null || user.avatar === '') && input.picture != null) {
      backfill.avatar = input.picture
    }
    if ((user.displayName == null || user.displayName === '') && input.name != null) {
      backfill.displayName = input.name
    }
  }
  const collectionConfig = payload.collections.users.config
  const tokenExpiration = collectionConfig.auth.tokenExpiration || 7200
  const now = new Date()
  const sid = crypto.randomUUID()
  let sessions: SessionEntry[] = []
  if (Array.isArray(user.sessions)) {
    sessions = user.sessions.filter(makeAliveFilter(now))
  }
  sessions.push({ id: sid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + tokenExpiration * 1000).toISOString() })
  const data: Record<string, string | SessionEntry[]> = { sessions: sessions }
  for (const k of Object.keys(backfill)) {
    data[k] = backfill[k]
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(理由见函数 JSDoc)
  await payload.update({ collection: USERS, id: user.id, overrideAccess: true, data: data as any })
  const fieldsToSign = getFieldsToSign({ collectionConfig, email: input.email, sid, user: Object.assign({}, user, { collection: USERS }) })
  const { token } = await jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration })
  let cookiePrefix: string = COOKIE_PREFIX_DEFAULT
  const cfg = payload.config as ConfigWithPrefix
  if (typeof cfg.cookiePrefix === 'string' && cfg.cookiePrefix !== '') {
    cookiePrefix = cfg.cookiePrefix
  }
  return { token: token, tokenExpiration: tokenExpiration, cookiePrefix: cookiePrefix }
}

/**
 * 随机密码字节 → 两位 hex(map 传具名函数)。
 *
 * @param b 一个字节。
 * @returns 两位 hex。
 */
function toHex(b: number): string {
  return b.toString(16).padStart(2, HEX_PAD)
}

/**
 * 过滤仍在有效期内的会话条目(filter 传具名函数;闭包住当下时刻)。
 *
 * @param now 当下。
 * @returns 判定函数。
 */
function makeAliveFilter(now: Clock): AliveFn {
  return function alive(s: SessionEntry): boolean {
    return new Date(s.expiresAt) > now
  }
}

/**
 * 登录回调的整条判定链：参数闸 → state 防 CSRF → 换 token → userinfo 红线 →
 * 关联/创建并签会话 → 校验回跳路径。每一步失败都在这里留痕（AUTH_LOG），
 * 路由只按 kind 拼响应 —— HTTP 芯里不再有判定（闸 routes-shape 的由来）。
 *
 * @param input 路由取好的五样原料。
 * @returns 成败联合产物。
 */
export async function googleCallback(input: GoogleCallbackIn): CallbackOut {
  if (GOOGLE_CLIENT_ID === '') {
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_ENV_MISSING })
    return { kind: K_FAIL }
  }
  if (input.error != null || input.code == null || input.code === '') {
    let why: string = LOG_NO_CODE
    if (input.error != null) {
      why = input.error
    }
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_CONSENT + why })
    return { kind: K_FAIL }
  }
  if (input.cookieState == null || input.stateParam !== input.cookieState) {
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_STATE })
    return { kind: K_FAIL }
  }
  const accessToken = await exchangeCode({ code: input.code })
  if (accessToken == null) {
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_TOKEN })
    return { kind: K_FAIL }
  }
  const gu = await loadGoogleUser(accessToken)
  if (gu == null) {
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_EMAIL })
    return { kind: K_FAIL }
  }
  let session: GoogleLogin
  try {
    session = await loginWithGoogle(gu)
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: AUTH_LOG.tag, text: AUTH_LOG.failed + LOG_LOGIN + why })
    return { kind: K_FAIL }
  }
  return { kind: K_OK, session: session, rt: safeReturnPath(input.rtRaw) }
}
