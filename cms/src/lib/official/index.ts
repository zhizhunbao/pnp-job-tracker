/**
 * 官方资料域的桶 —— 官方原句译名与官方资源导航。门里只有转发(闸 door-forward-only);
 * 纯数据 + 一只查表函数,浏览器安全,无 server 门(十件套是白名单不是必填)。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

export { officialLabels, RES } from './constants'
export { officialLabel } from './functions'
export type { Res } from './types'
