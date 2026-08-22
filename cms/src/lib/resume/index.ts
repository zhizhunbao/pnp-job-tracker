/**
 * 简历域的桶 —— 取字(上传的文件 → 纯文本)与对照(简历 × JD)两件的对外面。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 🔴 **没有 `./server` 门,因为不需要**:消费者是三条 resume 路由,零个 `'use client'`,
 * 也不连库(十件套是名字白名单不是必填清单)。
 * 只被测试用的名字不进桶:CLAMP / FREE_ROWS / GATEWAY_MAX / promptChars / MatchRow ——
 * 测试直接点 constants / functions / types 文件。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

export { DAILY_FREE, MIN_RESUME, RESUME_MAX_BYTES } from './constants'
export { extractText, gateMatch, matchPrompt, normalizeRows, parseLlmJson } from './functions'
