/**
 * 发信基建叶的门:发一封、退订 token、发信开关(alerts 域从这取)。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */
export { MAIL_ENABLED, WHY_DISABLED } from './constants'
export { postMail, sendMail, unsubToken } from './functions'
export type { MailAttachment, MailUserId, PostMailFact, PostMailIn, SendMailIn, SentOut } from './types'
