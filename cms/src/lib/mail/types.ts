/**
 * 发信基建叶的形状:一封信的入参与结果、用户 id。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */

/**
 * 用户 id(payload 的主键两形)。
 */
export type MailUserId = string | number

/**
 * `sendMail` 的返回(发出去了 true)。
 */
export type SentOut = Promise<boolean>

/**
 * `sendMail` 的入参。
 */
export type SendMailIn = {
  /**
   * 收件地址。
   */
  to: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文 HTML。
   */
  html: string
}

/**
 * 一个附件(Resend 的 attachments 一项)。
 */
export type MailAttachment = {
  /**
   * 收件人看到的文件名。
   */
  filename: string

  /**
   * 文件内容(base64)。
   */
  content: string
}

/**
 * `postMail` 的入参(2026-10-07 代投批:附件、回复地址、发件人、纯文本、幂等键)。
 */
export type PostMailIn = {
  /**
   * 收件地址。
   */
  to: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文 HTML。
   */
  html: string

  /**
   * 纯文本正文(给不渲 HTML 的收件端;空串 = 不带)。
   */
  text: string

  /**
   * 发件人(显示名 + 地址);空串 = 用默认 FROM。
   */
  from: string

  /**
   * 回复地址;空串 = 不设。
   */
  replyTo: string

  /**
   * 附件(没有给空数组)。
   */
  attachments: MailAttachment[]

  /**
   * 幂等键;空串 = 不带(同一个键 24 小时内重放只发一封)。
   */
  idemKey: string
}

/**
 * `postMail` 的结果。
 */
export type PostMailFact = {
  /**
   * 发出去了。
   */
  ok: boolean

  /**
   * Resend 回的邮件 id(退信回调按它对账;失败给空串)。
   */
  id: string

  /**
   * 失败原因(成功给空串;没配密钥 = disabled;HTTP 失败 = 状态码与回包头 200 字)。
   */
  why: string
}

/**
 * `postMail` 的返回。
 */
export type PostMailOut = Promise<PostMailFact>

/**
 * Resend 发信接口的回包(只读 id 一格)。
 */
export type ResendRespJson = {
  /**
   * 邮件 id;失败时缺席。
   */
  id?: string
}

/**
 * Resend 发信接口的请求体(线格式:可选格缺席 = 不设)。
 */
export type ResendBodyJson = {
  /**
   * 发件人。
   */
  from: string

  /**
   * 收件人。
   */
  to: string[]

  /**
   * 标题。
   */
  subject: string

  /**
   * HTML 正文。
   */
  html: string

  /**
   * 纯文本正文。
   */
  text?: string

  /**
   * 回复地址。
   */
  reply_to?: string

  /**
   * 附件。
   */
  attachments?: MailAttachment[]
}

/**
 * Resend 请求头(头名 → 值)。
 */
export type ResendHeaders = Record<string, string>

