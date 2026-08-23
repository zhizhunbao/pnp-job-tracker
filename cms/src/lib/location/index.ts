/**
 * 地点域的桶(客户端也安全:纯读常量与纯函数)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { ALL_PROVS, PNP_PROVINCES, PROV_NAMES } from './constants'
export { cleanProvs, mapQuery, mapsUrl, parseLoc, provName } from './functions'
