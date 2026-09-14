/**
 * 官方资料域的服务端门 —— 只有转发:资料库页面门从这里取连库现查的通道门槛分组
 * (functions 不 import payload,池由页面门注入;桶 index 仍是浏览器安全的那半)。
 *
 * @author Frank
 * @time 2026-09-06 23:30:00
 */
export { loadRuleGroups } from './functions'
export type { RuleGroup, RuleRow } from './types'
