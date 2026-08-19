// 简历域的桶 —— 两个零件:
//    · extract.ts **取字**   —— 上传的文件 → 纯文本(带 RESUME_MAX_BYTES 上限)
//    · match.ts    **对照**  —— 简历 × JD 的逐条对照(提示词 + 闸 + 回参归一)
//
// 2026-08-19 从 lib/ 顶层收进来时去掉了名字里的 `resume` 前缀(域名已经说了)。
//
// 🔴 **没有 `./server` 门,因为不需要**:消费者是三条 resume 路由和 lib/chat,零个 `'use client'`。
//
// 只被测试用的名字不进桶:CLAMP / FREE_ROWS / GATEWAY_MAX / promptChars / MatchRow —— 测试直接点文件。

export { RESUME_MAX_BYTES, extractText } from './extract'
export { DAILY_FREE, MIN_RESUME, gateMatch, matchPrompt, normalizeRows, parseLlmJson } from './match'
