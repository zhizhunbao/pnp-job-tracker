/**
 * 漏斗域的**服务端**门(HTTP 芯连库,浏览器不拿)。门里只有转发(闸 door-forward-only)。
 * 2026-09-26 /fe Frank:添 recordHit / siteHostOf 两名 —— Google 首次建号只有服务端知道,
 * 会话域的回调路由照本域路由的写法(toFunnelHit + recordHit,本机来源不计)直接落表。
 *
 * @author Frank
 * @time 2026-08-23 01:30:00
 */

export { recordHit, siteHostOf } from './functions'
export { trackRoute } from './routes'
