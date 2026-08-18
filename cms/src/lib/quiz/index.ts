// 答题这件事的桶 —— 题(fields)/ 答(answers)/ 判(decisions)三件并排,外部只从这里取。
//
// 为什么单独存在:这三个文件是**一套机器的三段**,先前平铺在 lib/ 顶层,
// 一个页面要它们时得写三行 import,而「哪些名字算对外接口」全靠猜。
// 目录名说领域、文件名说角色(同 lib/db/、lib/pathways/),接口就是下面这张表。
//
// 边界:
//   - `profile.ts` 不在这个簇里(2026-08-18 Frank 点名):它是账号档案,不是答题。
//   - 给人看的题面文案仍归 `lib/i18n/`;这里的 `L` 只是题面的三语**形状**,不是文案本身。
//
// 🔴 三个文件之间一律走相对路径(`./fields`),**不许从本桶取** ——
//    从桶取会让 index → fields → index 成环。tsc 未必报,vitest 会以「测试根本没跑起来」
//    的形式表现出来(40 passed 而实际 41 个文件,08-18 实踩)。
//    fields ↔ answers 今天就是环,但一个方向是 type-only、运行时擦掉,所以成立 —— 别动它。
//
// 桶外还有两个 export:`provsFromBand` / `bandFromProvs`(fields.ts)。它们只有 answers.ts 一个
// 消费者,**故意不进这张表** —— 导出是给同模块邻居用的,不是对外接口。同理,零消费者的
// `Tier`/`Question`/`FieldDef`/`UNSURE_BAND`/`PROVS`/`SCORE_ANSWERS_KEY`/`Decision` 已去掉 export,
// 代码没删,只是不再对外(CLAUDE.md:只有一个消费者的东西不该导出,更不该住进共享叶子)。

// ── 题:字段库 ──────────────────────────────────────────────────────────────
export type { L } from './fields'
export { CLB, NCLC, FIELDS } from './fields'

// ── 答:答案存储(唯一读写口,页面不直接碰 localStorage)────────────────────
export type { Answers, ScoreAnswers } from './answers'
export {
  ANSWERS_KEY, EMPTY,
  readAnswers, writeAnswers, clearAnswers, resetAnswersMemory,
  readScoreAnswers, writeScoreAnswers,
  answeredBasics, toEngineAnswers, pullAndMerge,
} from './answers'

// ── 判:每个决定要哪些字段 ──────────────────────────────────────────────────
export type { Stage } from './decisions'
export { DECISIONS, fieldsOf, missingFields, batchLeadsFree, KNOWN_NO_FREE_LEAD } from './decisions'
