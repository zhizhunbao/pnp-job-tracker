/**
 * 官方资料域的服务端门 —— 只有转发:资料库页面门从这里取连库现查的通道门槛分组,
 * /api/rules 壳从这里取 HTTP 芯(2026-09-13 把脉页门槛弹框懒查)
 * (functions 不 import payload,池由页面门 / 路由注入;桶 index 仍是浏览器安全的那半)。
 *
 * @author Frank
 * @time 2026-09-06 23:30:00
 */
export { loadOccLines, loadRuleGroups, loadRuleRows } from './functions'
export { rulesRoute } from './routes'
export type { RuleGroup, RuleRow } from './types'
