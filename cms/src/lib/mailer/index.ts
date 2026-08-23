/**
 * 发信域的桶(服务端消费:alerts/run 等定时役)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

export { MAIL_ENABLED } from './constants'
export { sendMail, unsubToken } from './functions'
