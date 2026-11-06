/**
 * start 域的服务端门:首页聚合取数(页面门用)与按段接口芯(/api/stats/pulse 壳用)。
 * 2026-11-05 按段懒加载批立(照 og 两门制:沾库的这半走本门,index 只留浏览器安全的件)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
export { getHomeCore } from './homecore'
export { statsPulseRoute } from './pulseresponse'
