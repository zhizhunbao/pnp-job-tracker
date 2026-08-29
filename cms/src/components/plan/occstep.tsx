'use client'
/**
 * plan 域的结构:问卷第一页 —— 选职业。initialTop:服务端已按在招量取好的热门榜 →
 * 控件首帧即终态,一个请求都不发。
 * 2026-08-28 换装批自 Decision.tsx 的选职业页提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { OccPicker, QuizTitle } from '@/components/quiz'
import { QUIZ_PAD_CLS } from './constants'
import { finishLabelOf } from './functions'
import type { QuizStepsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染选职业页。
 *
 * @param props 决策页整机与热门职业榜。
 * @returns 选职业页。
 */
export function OccStep({ d, topNocs }: QuizStepsIn) {
  return (
    <div className={QUIZ_PAD_CLS}>
      <QuizTitle>{d.t('quiz.q2')}</QuizTitle>
      <div className={css.occSub}>{d.t('quiz.q2sub')}</div>
      <OccPicker key={d.flow.resetNonce} inline t={d.t} lang={d.lang}
        initial={d.answers.bands.nocs} doneLabel={d.t('plan.next')} initialTop={topNocs}
        finishLabel={finishLabelOf({ t: d.t, done: d.progress.quizComplete })}
        onFinish={d.acts.finishQuiz}
        onChange={d.acts.onOccChange}
        onDone={d.acts.onOccDone} />
    </div>
  )
}
