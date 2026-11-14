/**
 * 对话助手域的桶:浏览器也能跑的那半,只有类型与界面要对齐的几个死值(类别、输入上限、带几轮历史)。
 * functions 拉着 node:crypto,不从这里出;测试直接从 `./functions` 取。路由芯在 `./server`。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

export type { ChatBody, Kind, Link, ReadyOut, ReplyOut, Turn } from './types'
export { HISTORY_TURNS, KIND, TEXT_MAX } from './constants'
