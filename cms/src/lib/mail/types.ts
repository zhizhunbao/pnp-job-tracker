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
