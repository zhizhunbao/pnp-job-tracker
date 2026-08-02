'use client'
// 答题器(一屏一题)—— 2026-08-03 撤掉 SurveyJS 后自己出的那 ~100 行。
// 它替掉的是 1.43 MB JS + 306 KB CSS 的框架,而框架真正在干的活只有这些:
// 单选题渲染、必答拦住下一步、一条「加拿大经验不得超过总经验」的选项过滤、翻页导航、值变更回调。
// 题目本身照旧住 lib/fields.ts(字段库=单一来源),取哪几道照旧走 lib/decisions.ts —— 这里只管翻页与版式,
// 而版式全部来自 quiz/QuizUI(与选工作页共用同一套,Frank「保证所有答题页面一致」)。
import { useState } from 'react'

import { QuizBar, QuizChoices, QuizTitle, pickL, type L } from '../quiz/QuizUI'
import { Button, UI } from '../ui/primitives'
import type { Lang, TFn } from '../jobs/i18n'
import { FIELDS } from '@/lib/fields'
import { fieldsOf, type Stage } from '@/lib/decisions'
import type { Answers } from '@/lib/answers'

const BTN_SEC: React.CSSProperties = {
  border: `1px solid ${UI.border}`, background: '#fff', color: UI.text2, borderRadius: 8,
  padding: '11px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

export function QuizForm({ decision, stage, lang, t, answers, onPatch, onComplete }: {
  decision: string
  stage: Stage
  lang: Lang
  t: TFn
  answers: Answers
  onPatch: (patch: Partial<Answers>) => void
  onComplete: () => void
}) {
  const names = fieldsOf(decision, stage)
  // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。只在挂载时算一次 ——
  // 之后 idx 归用户的「上一题/下一题」管,答完当前题不该自己往前跳
  const [idx, setIdx] = useState(() => {
    const i = names.findIndex((n) => !(answers as any)[n])
    return i < 0 ? 0 : i
  })
  const at = Math.min(idx, Math.max(names.length - 1, 0))
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
      {/* 没答完就走不了:按钮置灰 + 左边一句灰字说清为什么(与选工作页「先选一个职业」同一个位置、
          同一个句式)。框架当初是点了才弹「此题必答」的红字 —— 先让人撞一下墙再解释,不如一开始就说 */}
      <QuizBar hint={done ? undefined : t('quiz.pickOne')}>
        {at > 0 && <button onClick={() => setIdx(at - 1)} style={BTN_SEC}>{t('plan.prev')}</button>}
        <Button kind="primary" disabled={!done}
          onClick={() => (last ? onComplete() : setIdx(at + 1))}
          style={{ padding: '11px 26px', fontSize: 14, ...(done ? null : { background: UI.hairline, color: UI.text3, cursor: 'default' }) }}>
          {last ? t(stage === 'explore' ? 'plan.reportUpd' : 'plan.toReport') : t('plan.next')}
        </Button>
      </QuizBar>
    </>
  )
}
