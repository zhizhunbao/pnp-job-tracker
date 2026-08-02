'use client'
// 答题器(SurveyJS)单独成块 —— 唯一的理由是**体积**:survey-core + react-ui + 三个语言包
// 打出来是 1.43 MB JS + 306 KB CSS,而决定线的**第一屏(选职业)一个字节都用不到**它
// (2026-08-03 Frank「第一次刷新非常慢」,生产实测首屏 2.2 MB JS,这一块占 2/3)。
// 拆出来之后:第一屏不下它、深链直接看报告(`?view=report`,漏斗里 16 次有 12 次)也不下它;
// 用户在选职业的时候后台空闲预取,轮到答题时已经在缓存里。
//
// 边界:本文件是**唯一** import survey-core 的地方(再从别处 import 就把它拽回主包了);
// 卷面配置照旧在 lib/questions.ts,答案读写照旧走 lib/answers —— 这里只负责把两者接起来。
import { useMemo } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.css'
import 'survey-core/i18n/simplified-chinese'
import 'survey-core/i18n/korean'

import { readAnswers, type Answers } from '@/lib/answers'
import { fieldsOf, type Stage } from '@/lib/decisions'
import { buildSurvey, SURVEY_THEME } from '@/lib/questions'
import type { Lang } from '../jobs/i18n'

export default function PlanSurvey({ decision, stage, lang, resetNonce, onPatch, onComplete }: {
  decision: string
  stage: Stage
  lang: Lang
  resetNonce: number        // 清空重填:模型必须重建,否则旧答案还留在卷里
  onPatch: (patch: Partial<Answers>) => void
  onComplete: () => void
}) {
  const survey = useMemo(() => {
    const m = new Model(buildSurvey(decision, stage))
    m.applyTheme(SURVEY_THEME as any)
    m.locale = lang === 'zh' ? 'zh-cn' : lang === 'ko' ? 'ko' : 'en'
    const b = readAnswers()
    const names = fieldsOf(decision, stage)
    m.data = Object.fromEntries(names.map((n) => [n, (b as any)[n]]).filter(([, v]) => v))
    // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。
    // v2 的 questionPerPage 模式导航不走 currentPageNo,走 currentSingleQuestion(实撞:设页号被无视)
    const firstUnanswered = names.map((n) => (b as any)[n]).findIndex((v) => !v)
    if (firstUnanswered > 0) {
      const target = m.getQuestionByName(names[firstUnanswered])
      if (target) m.currentSingleQuestion = target
    }
    // 只合并本卷答到的字段(两卷同住一份答案,整体覆盖会把另一卷的答案抹掉)
    m.onValueChanged.add((s) => {
      onPatch(Object.fromEntries(Object.entries(s.data as Record<string, unknown>).filter(([, v]) => v)) as Partial<Answers>)
    })
    m.onComplete.add(() => onComplete())
    return m
  }, [stage, lang, decision, resetNonce])   // eslint-disable-line react-hooks/exhaustive-deps

  return <Survey model={survey} />
}
