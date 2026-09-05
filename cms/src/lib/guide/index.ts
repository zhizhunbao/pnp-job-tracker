/**
 * 站内向导域的桶 —— **浏览器也能跑的那半**:类型、URL 拼装与回包校验(纯函数,测试也从这里取)。
 * 要连库、要模型的那半在 `./server`(路由芯),不许进浏览器包。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

export type { GuideBody, GuideResult, Kind, ModelReply, ResolvedSlots } from './types'
export { DEST_ROUTE, DEST_SUB, DEST_URL_KEYS, KIND } from './constants'
export { DEST_DESC } from './prompts'
export { jsonOf, messagesOf, systemOf, toEmailInput, toInput, toModelReply, toTurns, urlOf } from './functions'
