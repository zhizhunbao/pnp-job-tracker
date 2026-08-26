/**
 * 发信基建叶的死值:Resend 接缝与退订 token 机制的常量。
 * 2026-08-23 Frank 拍板 alerts(业务)/mail(机制)两域分开「方便我理解」,
 * 推翻 08-22「两个都叫 mail 合并」—— 提醒编排的全部文案与窗口随业务去了 lib/alerts。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */

/**
 * 有没有配发信密钥(没配 = dry-run)。
 */
export const MAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

/**
 * 发件人(未配走 Resend 沙箱名)。
 */
export const FROM = process.env.RESEND_FROM || 'Offer2PR <onboarding@resend.dev>'

/**
 * 退订 token 的 HMAC 输入前缀。
 */
export const UNSUB_PREFIX = 'unsub:'

/**
 * 退订 token 的摘要算法。
 */
export const HMAC_ALGO = 'sha256'

/**
 * 退订 token 的输出编码。
 */
export const HEX_ENC = 'hex'

/**
 * 退订 token 截多少位 hex(sha256 出 64 位,只取前 16 位进链接):
 * 够长到猜不着,又短到能塞进一行退订 URL。改这个数会让**已发出去的**退订链接全部失效,
 * 改前先想清楚存量邮件。
 */
export const UNSUB_TOKEN_LEN = 16

/**
 * Resend 发信端点。
 */
export const RESEND_URL = 'https://api.resend.com/emails'

/**
 * 发信请求的方法。
 */
export const METHOD_POST = 'POST'

/**
 * 鉴权头前缀(带尾空格)。
 */
export const BEARER_PREFIX = 'Bearer '

/**
 * 发信请求的内容类型。
 */
export const JSON_MIME = 'application/json'

/**
 * 发信失败时,Resend 回的报文进日志截多少字:留痕要够看清是哪种拒绝(域名没验、
 * 收件人被拒、限流),又不能把整段 HTML 错误页灌进日志。
 */
export const ERR_BODY_LEN = 200

/**
 * 签名密钥没配时的空密钥:`PAYLOAD_SECRET` 缺席时 HMAC 用空串当 key。
 * 空 key 的 HMAC 照样算得出一个 16 位 hex,所以退订链接不会当场 500,但它与真密钥
 * 签出来的 token 对不上 —— 也就是说这条链接只在同一个「没配密钥」的环境里自洽
 * (本地 dev),换到配了密钥的生产就验不过。留空而不是塞一个假密钥,是为了不让
 * 「密钥没配」这件事被一个能用的默认值盖住。
 */
export const HMAC_KEY_NONE = ''

