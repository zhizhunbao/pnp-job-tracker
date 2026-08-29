'use client'
/**
 * plan 域的结构:分值卡的答题屏(一屏一题)。官方分值表要的条件走答题壳的同一副皮
 * (题干 / 选项卡片 / 底部动作条),不再自己画一层卡中卡 ——「统一风格」的做法是共用组件,
 * 不是照着调样式。
 * 三种题型共用同一副外观,区别只在选项形态:单选走官方档位、多选走该省的加分项、
 * 数字题**只剩时薪这一道**(两位数字秒答,而且一分不差;档位化会把人的分算低)。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的答题段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { QuizChecks, QuizChoices, QuizNav, QuizSub, QuizTitle } from '@/components/quiz'
import { cssOf } from '@/components/css'
import { INPUT_NUMBER } from './constants'
import { quizChoiceListOf } from './functions'
import type { ScoreQuestionIn } from './types'
import css from './plan.module.css'

/**
 * 渲染当前这一屏的题。
 *
 * @param props 分值卡整机与这一屏的题。
 * @returns 题干、选项与底部动作条。
 */
export function ScoreQuestion({ d, q }: ScoreQuestionIn) {
  return (
    <>
      <QuizTitle>{q.title}</QuizTitle>
      {q.sub != null && <QuizSub>{q.sub}</QuizSub>}
      {q.choices != null && (
        <QuizChoices name={q.key} lang={d.lang} choices={quizChoiceListOf(q.choices)}
          value={d.picked} onPick={d.onPick} />
      )}
      {q.checks != null && <QuizChecks items={q.checks} />}
      {q.number != null && (
        <input type={INPUT_NUMBER} min={0} value={q.number.value} onChange={d.onNumber}
          aria-label={q.title} className={cssOf(css.psWage)} />
      )}
      <QuizNav prevLabel={d.prevLabel} nextLabel={d.nextLabel} onPrev={d.onPrev} onNext={d.onNext}
        nextDisabled={d.answered === false} doneLabel={d.doneLabel} onDone={d.onDone} hint={d.hint} />
    </>
  )
}
