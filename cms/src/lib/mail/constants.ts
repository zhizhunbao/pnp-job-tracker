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
 * Resend 的幂等头名(同一个键 24 小时内重放只发一封;2026-10-07 代投批)。
 */
export const HDR_IDEMPOTENCY = 'Idempotency-Key'

/**
 * 没配发信密钥时 postMail 交回的失败原因(调用方据此出「发信未配置」,不当成发出去了)。
 */
export const WHY_DISABLED = 'disabled'

/**
 * 网络 / 运行期异常时 postMail 交回的失败原因前缀。
 */
export const WHY_THROWN = 'thrown: '

/**
 * Resend 回包里取不到 id 时的空串。
 */
export const ID_NONE = ''

/**
 * 退订 token 的 HMAC 输入前缀。
 */
export const UNSUB_PREFIX = 'unsub:'

/**
 * 换收件邮箱确认 token 的 HMAC 输入前缀(2026-10-10 批 2「新岗推送」;与退订 token 同一把钥匙,前缀分开,两种链接互不通用)。
 */
export const CONFIRM_PREFIX = 'confirm:'

/**
 * 确认 token 里用户 id 与新邮箱之间的分隔。
 */
export const CONFIRM_SEP = '|'

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

// =========================================================================
// 信的外壳与通知信(2026-11-11 自 lib/alerts/body 搬来:提醒信、改登录邮箱确认信、忘记密码信三处共用一份)
// =========================================================================

/**
 * 四种信与确认信共用的外壳(2026-11-10 Frank「现在用户看着跟诈骗网站似的」):灰底上一张白卡,
 * 顶上站名加信的种类,中间正文,底下交代为什么收到这封信、数据来源与几个链接。全英文一种语言。
 * 2026-11-11 照知识库 ui-ux/outlook/word-2007-html-and-css-rendering-capabilities.md:Outlook 桌面版不认 float,
 * 抬头右上角的小字改成两格表格;max-width 它也不认(白卡在它那里铺满窗口),圆角在它那里是直角,都接受,不加条件注释。
 */
export const MAIL_SHELL = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
    <tr><td style="padding:18px 24px;background:#2563eb;border-radius:11px 11px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left"><a href="{site}" style="font-size:20px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px">Offer2PR</a></td>
        <td align="right" style="font-size:12px;line-height:28px;color:#dbeafe">{kicker}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px">{body}</td></tr>
    <tr><td style="padding:16px 24px 20px;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 12px 12px;font-size:12px;line-height:18px;color:#6b7280">
      {reason}<br>{links}
    </td></tr>
  </table>
</td></tr></table>`

/**
 * 页脚第一段:确认信。
 */
export const MAIL_REASON_CONFIRM = 'If you did not ask for this, you can ignore this email.'

/**
 * 页脚的链接:只有站点(确认信)。
 */
export const MAIL_LINKS_SITE = '<a href="{site}" style="color:#4b5563">offer2pr.com</a>'

/**
 * 纯文本版正文(确认信)。
 */
export const MAIL_TEXT_CONFIRM = `{head}

{text}

{cta}: {href}

--
If you did not ask for this, you can ignore this email.
{site}
`

/**
 * 正文大标题。
 */
export const MAIL_H1 = '<h1 style="margin:0 0 6px;font-size:20px;line-height:28px;font-weight:700;color:#111827">{text}</h1>'

/**
 * 正文里的普通段落。
 */
export const MAIL_P = '<p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#374151">{text}</p>'

/**
 * 实心主按钮。
 */
export const MAIL_BTN = '<p style="margin:20px 0 0"><a href="{href}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">{label}</a></p>'
