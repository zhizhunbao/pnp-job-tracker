/**
 * 发信基建叶的门:发一封、退订 token、发信开关(alerts 域从这取)。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */
export { MAIL_BTN, MAIL_ENABLED, MAIL_H1, MAIL_P, WHY_DISABLED } from './constants'
export { confirmToken, noticeHtmlOf, noticeTextOf, postMail, sendMail, shellOf, unsubToken } from './functions'
export type {
  ConfirmTokenIn, MailAttachment, MailUserId, NoticeIn, PostMailFact, PostMailIn, SendMailIn, SentOut, ShellIn,
} from './types'
