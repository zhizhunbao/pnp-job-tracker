'use client'
// 答题器(一屏一题)—— 2026-08-03 撤掉 SurveyJS 后自己出的那 ~100 行。
// 它替掉的是 1.43 MB JS + 306 KB CSS 的框架,而框架真正在干的活只有这些:
// 单选题渲染、必答拦住下一步、一条「加拿大经验不得超过总经验」的选项过滤、翻页导航、值变更回调。
// 题目本身照旧住 lib/fields.ts(字段库=单一来源),取哪几道照旧走 lib/decisions.ts —— 这里只管翻页与版式,
// 而版式全部来自 quiz/QuizUI(与选工作页共用同一套,Frank「保证所有答题页面一致」)。
import { useEffect, useState } from 'react'

import { QuizChoices, QuizNav, QuizTitle, pickL, type L } from '../quiz/QuizUI'
import type { Lang, TFn } from '../jobs/i18n'
import { FIELDS } from '@/lib/fields'
import { fieldsOf, type Stage } from '@/lib/decisions'
import type { Answers } from '@/lib/answers'

export function QuizForm({ decision, stage, lang, t, answers, onPatch, onComplete, doneKey, onBack, onStepChange, startAtEnd = false, startAt, finishLabel, onFinish }: {
  decision: string
  stage: Stage
  lang: Lang
  t: TFn
  answers: Answers
  onPatch: (patch: Partial<Answers>) => void
  onComplete: () => void
  doneKey?: string          // 最后一题按钮文案键(决策页=看分数;缺省沿用报告页的「出报告」)
  onBack?: () => void       // 第一题的「上一题」出口(决策页=回选职业页;不传则第一题无上一题)
  onStepChange?: (index: number, total: number) => void
  startAtEnd?: boolean      // 从后续自定义步骤返回时，回到基础题最后一题而不是第一题
  startAt?: string          // 点条件格直达那道题:起步落在指定字段(调用方换 key 重挂来触发)
  /** 旁路收卷钮(2026-08-13 Frank:基础卷也要「完成」——改一个答案不用再翻完全卷)。
   *  何时给由调用方定(决策页=整卷答满才传);点了直接收卷,不走剩余页。 */
  finishLabel?: string
  onFinish?: () => void
}) {
  // 传 answers = 按题级显隐过滤(境外用户看不到「持什么许可/人在哪个省」)。答处境题时清单会
  // 当场增减 —— names 每次渲染重算,idx 由下面的 Math.min 收口,不会停在被裁掉的题上
  const names = fieldsOf(decision, stage, 0, answers)
  // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。只在挂载时算一次 ——
  // 之后 idx 归用户的「上一题/下一题」管,答完当前题不该自己往前跳
  const [idx, setIdx] = useState(() => {
    if (startAt && names.includes(startAt)) return names.indexOf(startAt)
    if (startAtEnd) return Math.max(names.length - 1, 0)
    const i = names.findIndex((n) => !(answers as any)[n])
    return i < 0 ? 0 : i
  })
  const at = Math.min(idx, Math.max(names.length - 1, 0))
  useEffect(() => { onStepChange?.(at, names.length) }, [at, names.length, onStepChange])
  const name = names[at]
  const f = FIELDS[name]
  if (!f) return null
  const q = f.q
  const value = (answers as any)[name]
  // 选项过滤:目前只有一条(加拿大经验 ≤ 总经验)。先前是 SurveyJS 的字符串表达式
  // `{totalExpBand} = 0 or {item} <= {totalExpBand}`,现在是字段库里的普通判定函数 —— 少一门 DSL
  const choices = q.choices.filter((c) => !q.choiceVisible || q.choiceVisible(answers, c.value as number))
  const last = at >= names.length - 1
  const done = value !== undefined && value !== '' && value !== 0

  return (
    <>
      <QuizTitle>{pickL(q.title as L, lang)}</QuizTitle>
      <QuizChoices name={name} choices={choices} value={value} onPick={(v) => onPatch({ [name]: v } as Partial<Answers>)} lang={lang} />
      {/* 没答完就走不了：下一题按钮置灰即可。不要再单独摆提示文案——窄屏或滚动裁切时
          它会脱离题目和按钮，变成一条看不懂的孤立占位。
          上一题恒在且靠左下(08-10 Frank「这个没有上一题,并且上一题放到左下角」):
          第一题的上一题=回选职业页(onBack)。动作条本身归 QuizNav,四种题共用同一把。 */}
      <QuizNav prevLabel={t('plan.prev')} nextDisabled={!done}
        onPrev={at > 0 ? () => setIdx(at - 1) : onBack}
        onNext={() => (last ? onComplete() : setIdx(at + 1))}
        doneLabel={finishLabel} onDone={onFinish}
        nextLabel={last ? t(doneKey || (stage === 'explore' ? 'plan.reportUpd' : 'plan.toReport')) : t('plan.next')} />
    </>
  )
}
