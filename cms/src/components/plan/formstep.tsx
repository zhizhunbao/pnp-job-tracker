'use client'
/**
 * plan 域的结构:问卷中间那几页 —— 一屏一题的基础卷。起步落在第一道没答的题;
 * 点条件格进来时直达那道题(换 key 重挂来触发)。
 * 2026-08-28 换装批自 Decision.tsx 的基础题页提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { QuizForm } from './quizform'
import { DECISION_PR, KEY_DONE_NEXT, QUIZ_PAD_CLS, STAGE_BASIC } from './constants'
import { finishLabelOf, formStepKeyOf, startAtOf } from './functions'
import type { QuizStepsIn } from './types'

/**
 * 渲染基础题页。
 *
 * @param props 决策页整机。
 * @returns 基础题页。
 */
export function FormStep({ d }: QuizStepsIn) {
  return (
    <div className={QUIZ_PAD_CLS}>
      <QuizForm key={formStepKeyOf({ nonce: d.flow.resetNonce, atEnd: d.flow.atEnd, focus: d.flow.focus })}
        decision={DECISION_PR} stage={STAGE_BASIC} lang={d.lang} t={d.t}
        answers={d.answers.bands} doneKey={KEY_DONE_NEXT}
        startAtEnd={d.flow.atEnd} startAt={startAtOf({ focus: d.flow.focus })}
        finishLabel={finishLabelOf({ t: d.t, done: d.progress.quizComplete })}
        onFinish={d.acts.finishQuiz}
        onBack={d.acts.onQuizBack}
        onPatch={d.acts.onQuizPatch}
        onComplete={d.acts.onQuizComplete} />
    </div>
  )
}
