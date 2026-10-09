/**
 * 智能投递域的**服务端**门:HTTP 芯(要连库、请模型,浏览器不该拿到)。门里只有转发(闸 door-forward-only)。
 * 本域没有 index 门:没有浏览器要用的东西。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */

export { queueCoverRoute, queuePrefsRoute, queueRoute, queueRunRoute } from './routes'
export type { QueueRowFact, QueueView } from './types'
