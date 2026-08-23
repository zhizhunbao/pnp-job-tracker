/**
 * 榜单域的**服务端**门(取数函数收注入的连接;放进 index 会把 Db 依赖面
 * 摆到浏览器桶上)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { fetchRankingRows, fetchRankingSlugs } from './functions'
export { rankingsDataRoute } from './routes'
