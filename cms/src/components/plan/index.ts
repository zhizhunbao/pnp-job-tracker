/**
 * plan 页面域的桶 —— /plan/pr 决策页(Decision 主干视图,答题卡与分数线卡是它的内件)。
 * 2026-08-26 自 app/(frontend)/plan/ 整体迁入(pr 子目录拍平进域根);
 * 2026-08-28 换装批把 Decision.tsx 整体重写成小写件形制:排版拆成三十余个小件一件一文件、
 * 状态收进 hooks.ts、派生与洗行进 functions.ts、死值进 constants.ts、
 * 内联样式与五段内联 <style> 迁 plan.module.css。同批壳件上交:整页外框走 shell 桶的 Frame、
 * 顶栏与页脚由页面门直接拼(Frank「组装只许在 (frontend) 页面门里」,样张 account)。
 * ScoreLineCard 与 QuizForm(第二段)已于同日换装并入,全桶 68 件同一形制。
 * 2026-08-28 拆域批自 components/jobs 迁入 PnpScoreCard.tsx(省提名自评打分 + 跨省对照)——
 * 它本来就只有本域的 ScoreHolder 一个消费者;同日换装批把它整体重写成小写件形制
 * (出题机器与算分派生下沉 functions.ts、九格状态收进 hooks.ts、内联样式迁 plan.module.css、
 * 排版拆成十四件一件一文件),对外只留 PnpScoreCard 这一个名字,props 一格未动。
 * 2026-08-29 页面门清闸批:决策页的 SEO 头收成 PLAN_PR_META 从这里出
 * (门里除框架定名导出外零函数零常量,内容一律来自桶)。
 * 🔴 桶本身与 types/constants 都**不带 `'use client'`**:页面门(服务端)要用 TvJob 与
 * OverviewDraw 这两张形状拼 props。
 * 对应 lib 域:lib/quiz、lib/pathways、lib/ruling、lib/points。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
export { PLAN_PR_META, SSR_WIRE_MS, TOP_NOCS_LIMIT, WIRE_ERROR_KEY } from './constants'
export { Decision } from './decision'
export { PnpScoreCard } from './pnpscorecard'
export { emptyJobRows, nullWire, raceWire, ssrWireOf } from './functions'
export type { OverviewDraw, TopNoc, TvJob } from './types'
