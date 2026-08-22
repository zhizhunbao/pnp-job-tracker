/**
 * 路径规划域的桶 —— **浏览器也安全的那半**:排序与「几步能到」的推演,纯函数不碰库。
 * 🔴 别和 `lib/quota` 搞混:那个装的是**配额**(免费/Pro 上限),这个才是 plan 的本义(2026-08-19 改名断歧义)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

export { buildPlan, pickOutside, rankRows } from './functions'
export type { Plan, PlanPathInput, PlanStep, RankableRow, RankCtx } from './types'
