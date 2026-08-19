// 路径规划域的桶 —— **客户端也安全的那半**:排序与「几步能到」的推演,纯函数,不碰库。
//
// 🔴 别和 `lib/quota.ts` 搞混:那个装的是**配额**(免费/Pro 上限),
//    这个才是 plan 的本义 —— 路径怎么排、几步能到、多久。2026-08-19 改名就是为了断掉这层歧义。
//
// 🔴 **取数那半在 `./server`**(timeline 要连库)。外部一律从这两个门取(eslint 边界闸盯着);
//    模块内部文件之间走相对路径,**不从桶取**。测试是例外,直接点文件(RankableRow 只被测试用,不进桶)。

// ── 排序:通道档 × 抽选线,决定一行排在哪 ─────────────────────────────────
export { pickOutside, rankRows } from './planRank'
export type { RankCtx } from './planRank'

// ── 推演:从现状到 PR 的分步计划 ──────────────────────────────────────────
export { buildPlan } from './planTimeline'
export type { Plan, PlanPathInput, PlanStep } from './planTimeline'
