/**
 * 发信(E5-03):Resend 一个 HTTP 调用,不引 SDK(Ponytail)。
 * RESEND_API_KEY 未设 → dry-run(返回 false,调用方不回写游标,便于无密钥端到端演练)。
 * 域名未定期间 from 用 onboarding@resend.dev(Resend 测试模式:只能发给账户本人邮箱)——
 * 正式域名后换 RESEND_FROM。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 有没有配发信密钥(没配 = dry-run)。
 */
export const MAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

/**
 * 发件人(env 可换;默认 Resend 测试身份)。
 */
export const FROM = process.env.RESEND_FROM || 'Offer2PR <onboarding@resend.dev>'

/**
 * 退订 token 的 HMAC 消息前缀(api/alerts/unsub 同源校验)。
 */
export const UNSUB_PREFIX = 'unsub:'

/**
 * 退订 token 的 HMAC 算法。
 */
export const HMAC_ALGO = 'sha256'

/**
 * 退订 token 的输出编码。
 */
export const HEX_ENC = 'hex'

/**
 * Resend 发信端点(HTTP 直调,不引 SDK —— Ponytail)。
 */
export const RESEND_URL = 'https://api.resend.com/emails'

/**
 * 发信请求的 HTTP 方法。
 */
export const METHOD_POST = 'POST'

/**
 * Authorization 头的 Bearer 前缀。
 */
export const BEARER_PREFIX = 'Bearer '

/**
 * JSON 请求体的 MIME。
 */
export const JSON_MIME = 'application/json'
