/**
 * 发信域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

/**
 * 退订 token 的主体(payload 主键,数字或串)。
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
