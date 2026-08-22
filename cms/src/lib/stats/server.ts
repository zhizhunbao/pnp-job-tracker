/**
 * 统计域的**服务端**门 —— 六个取数(要连库,浏览器不该拿到)。门里只有转发
 * (闸 door-forward-only);连接池由调用方注进来(拍板③:路由/页面自己 `getDb()` 再传,
 * 本域不 import payload)。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

export { loadChannelNocs, loadCityStats, loadOccStats, loadProvExtra, loadStats, loadStatSources } from './functions'
