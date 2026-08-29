'use client'
/**
 * plan 域的结构:基础段的题区容器 —— 一个只挂 ref 的 div,内容是逐题的 QuizSteps。
 * **单独成件**是因为 ref 的传法:只要 `ref={d.pad.padRef}` 与其它 `d.…` 同处一个
 * 组件,`d` 整只会被 react-hooks/refs 判成 ref,它后面每一格读值都跟着报
 * (2026-08-29 探针实证)。所以 ref 在这里单独一格递进来,本件只 `ref={}`,
 * QuizSection 那边一个 ref 都不碰。
 *
 * @author Frank
 * @time 2026-08-29 15:20:00
 */
import { QuizSteps } from './quizsteps'
import type { QuizPadIn } from './types'

/**
 * 渲染题区容器(翻题时靠它把题区顶回视口)。
 *
 * @param props 题区容器的 ref、决策页整机与热门职业榜。
 * @returns 题区容器。
 */
export function QuizPad({ padRef, d, topNocs }: QuizPadIn) {
  return <div ref={padRef}><QuizSteps d={d} topNocs={topNocs} /></div>
}
