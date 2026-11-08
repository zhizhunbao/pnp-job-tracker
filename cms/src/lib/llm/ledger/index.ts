/**
 * llm 桶的子桶 ledger —— AI 额度闸与用量账本(2026-11-08 Frank「Claude API 额度绝不能超」「记录每个功能的 AI 用量和成本」)。
 * 父桶 functions.ts 早已超 1000 行(基线存量),新关注点照 pathways/fit 的形开子桶;依赖只许父桶 → 子桶。
 * 表 docs/sql/ai-ledger-20261108.sql。
 *
 * @author Frank
 * @time 2026-11-08 12:00:00
 */

export { fateOf, inputBytesOf, inputCharsOf, record, reserve, settle, usageCostOf } from './functions'
export { STATE } from './constants'
export type { Hold, UsageJson } from './types'
