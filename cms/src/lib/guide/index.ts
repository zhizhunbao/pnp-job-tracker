/**
 * 站内向导域的桶 —— **浏览器也能跑的那半**:只有类型与常量(目的地目录给挂件画站内地图用)。
 * functions 拉着 node:crypto 与 db,不从这里出(2026-09-05 Frank「有什么功能」一问暴露:挂件要目录,
 * 桶若混了 node 依赖就进不了浏览器包);测试直接从 `./functions` 取。路由芯在 `./server`。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

export type { GuideBody, GuideResult, Kind, ModelReply, ResolvedSlots } from './types'
export { DEST_ROUTE, DEST_SUB, DEST_URL_KEYS, KIND } from './constants'
