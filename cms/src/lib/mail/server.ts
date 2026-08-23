/**
 * 邮件域的**服务端**门（发信要密钥、编排要连库，浏览器一概不拿）。
 * 门里只有转发（闸 door-forward-only）。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { isDryRun, quietInfo, runAlerts, sendMail, unsubToken } from './functions'
export { alertsUnsubRoute, mailRunRoute } from './routes'
export { MAIL_ENABLED } from './constants'
export type { FetchHitsFn, RunIn, RunResult } from './types'
