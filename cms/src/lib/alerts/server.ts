/**
 * 提醒域的**服务端**门(编排要连库、要 payload,浏览器一概不拿)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */

export { isDryRun, quietInfo, runAlerts } from './functions'
export { alertsRunRoute, alertsUnsubRoute } from './routes'
export type { LoadHitsFn, RunIn, RunResult } from './types'
