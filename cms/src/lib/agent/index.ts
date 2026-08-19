/**
 * 对话兜底模块的桶 —— **浏览器也能跑的那半**:只有类型,擦掉之后是空的。
 * 要连库的那半在 `./server`(它拉着 pi 的循环与 SQL,不许进浏览器包)。
 *
 * @author Frank
 * @time 2026-08-18 20:38:09
 */

export type { AgentSlots, ResolveByAgentIn, ResolveByAgentOut } from './types'
