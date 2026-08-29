'use client'
/**
 * plan 域的结构:答题器(一屏一题)—— 2026-08-03 撤掉 SurveyJS 后自己出的那一层。
 * 它替掉的是 1.43 MB JS + 306 KB CSS 的框架,而框架真正在干的活只有这些:
 * 单选题渲染、必答拦住下一步、一条「加拿大经验不得超过总经验」的选项过滤、翻页导航、
 * 值变更回调。题目本身照旧住 lib/quiz 的字段库(单一来源),取哪几道照旧走 lib/quiz 的
 * 决策清单 —— 这里只管翻页与版式,而版式全部来自 quiz 桶的答题壳
 * (与选工作页共用同一套,Frank「保证所有答题页面一致」)。
 *
 * 传 answers 给字段库 = 按题级显隐过滤(境外用户看不到「持什么许可/人在哪个省」)。
 * 答处境题时清单会当场增减 —— 题名每次渲染重算,题序由 Math.min 收口,
 * 不会停在被裁掉的题上。
 * 起步落在第一道没答的题(答过的不重走,上一题仍可回去改),且只在挂载时算一次:
 * 之后题序归用户的「上一题/下一题」管,答完当前题不该自己往前跳。
 * 没答完就走不了:**下一题按钮置灰即可**。不要再单独摆提示文案 —— 窄屏或滚动裁切时
 * 它会脱离题目和按钮,变成一条看不懂的孤立占位。
 * 2026-08-28 换装批第二段整体重写成小写件形制:选项过滤、起步落点、三个手柄与
 * 钮上的字全下沉 functions.ts,组件体内零内嵌函数。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { useEffect, useState } from 'react'
import { QuizChoices, QuizNav, QuizTitle } from '@/components/quiz'
import { fieldsOf } from '@/lib/quiz'
import { STEP_BATCH_ALL } from './constants'
import {
  answeredOf, fieldKnownOf, fieldTitleOf, makeChoicePatch, makeQuizNext, makeQuizPrev, makeStartIndex,
  pickedOf, quizChoicesOf, quizNextLabelOf,
} from './functions'
import type { AnswerBag, QuizFormIn } from './types'

/**
 * 渲染当前这一题。
 *
 * @param props 题单坐标、界面语、答案档与五个出口。
 * @returns 这一题;题单空了或题名认不出时不出。
 */
export function QuizForm({
  decision, stage, lang, t, answers, onPatch, onComplete, doneKey, onBack, onStepChange,
  startAtEnd = false, startAt, finishLabel, onFinish,
}: QuizFormIn) {
  const names = fieldsOf(decision, stage, STEP_BATCH_ALL, answers)
  const [idx, setIdx] = useState(makeStartIndex({ names, bands: answers, startAt, startAtEnd }))
  const at = Math.min(idx, Math.max(names.length - 1, 0))
  useEffect(function reportStep() {
    if (onStepChange == null) {
      return
    }
    onStepChange(at, names.length)
  }, [at, names.length, onStepChange])
  const name = names[at]
  if (name == null) {
    return null
  }
  if (fieldKnownOf(name) === false) {
    return null
  }
  const bag: AnswerBag = answers
  const cell = bag[name]
  const last = at >= names.length - 1
  return (
    <>
      <QuizTitle>{fieldTitleOf({ name, lang })}</QuizTitle>
      <QuizChoices name={name} choices={quizChoicesOf({ name, bands: answers, lang })} lang={lang}
        value={pickedOf(cell)} onPick={makeChoicePatch({ name, onPatch })} />
      <QuizNav prevLabel={t('plan.prev')} nextDisabled={answeredOf(cell) === false}
        onPrev={makeQuizPrev({ at, setIdx, onBack })}
        onNext={makeQuizNext({ at, last, setIdx, onComplete })}
        doneLabel={finishLabel} onDone={onFinish}
        nextLabel={quizNextLabelOf({ t, last, doneKey, stage })} />
    </>
  )
}
