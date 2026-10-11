/**
 * 收件箱域的**服务端**门:HTTP 芯、收信回调的处理(投递域那个冻结的回调口转进来)、投递要用的回复地址。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

export { inboxAddressOf, receiveInbound } from './functions'
export { RECV_FETCH } from './constants'
export { inboxCountRoute, inboxPrefsRoute, inboxReadRoute, inboxReplyRoute, inboxRoute, inboxThreadRoute } from './routes'
export type { MailToFn } from './types'
