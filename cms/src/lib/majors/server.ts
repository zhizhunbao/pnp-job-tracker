/**
 * 专业域的**服务端**门:取数与 HTTP 芯(要连库,浏览器不该拿到)。
 * getMajorBroads 给 quiz 域第 3 题(/api/quiz?major=)由路由注入。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */

export { getMajorBroads, getMajors } from './functions'
export { majorsRoute } from './routes'
