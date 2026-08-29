'use client'
/**
 * plan 域的结构:问卷最后一页 —— 选目标省。答完由收卷动作决定:还有估分题就翻进估分段,
 * 答满才收框。
 * 2026-08-28 换装批自 Decision.tsx 的选目标省页提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ProvincePicker } from '@/components/quiz'
import { QUIZ_PAD_CLS } from './constants'
import { finishLabelOf, provStepKeyOf } from './functions'
import type { QuizStepsIn } from './types'

/**
 * 渲染选目标省页。
 *
 * @param props 决策页整机。
 * @returns 选目标省页。
 */
export function ProvStep({ d }: QuizStepsIn) {
  return (
    <div className={QUIZ_PAD_CLS}>
      <ProvincePicker key={provStepKeyOf({ nonce: d.flow.resetNonce })} t={d.t}
        initial={d.answers.bands.provs} unsure={d.answers.bands.provsAny}
        finishLabel={finishLabelOf({ t: d.t, done: d.progress.quizComplete })}
        onFinish={d.acts.onProvFinish}
        onChange={d.acts.onProvChange}
        onBack={d.acts.onProvBack}
        onDone={d.acts.onProvDone} />
    </div>
  )
}
