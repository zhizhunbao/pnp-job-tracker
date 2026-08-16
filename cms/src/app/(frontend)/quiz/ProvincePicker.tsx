'use client'

import { useState } from 'react'

import { QuizNav, QuizSub, QuizTitle } from './QuizUI'
import { UI } from '../ui/primitives'
import type { TFn } from '../jobs/i18n'

export const CANADA_PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'] as const

// 「还不确定」是**一等答案**,不是跳过(2026-08-12 Frank:「很多人不知道去哪个省,比如国内的厨师」)。
// 选它 = 不按省过滤,13 条通道全判一遍再按障碍难度排 —— 「该去哪个省」本来就该由我们回答,
// 不该当成必答题拦在门口。
export function ProvincePicker({ t, initial, onChange, onDone, onBack, unsure, finishLabel, onFinish }: {
  t: TFn
  initial: string[]
  onChange?: (provinces: string[]) => void
  onDone: (provinces: string[], unsure?: boolean) => void
  onBack?: () => void
  unsure?: boolean
  /** 旁路收卷钮(2026-08-16 Frank「这两个右下角都需要一个完成按钮」)——与基础题那颗同源:
   *  改一个答案不用把答过的题再翻一遍。**当前选择随参数交出去**,由调用方落档后收卷。 */
  finishLabel?: string
  onFinish?: (provinces: string[], unsure?: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [anyProv, setAnyProv] = useState(!!unsure)
  const toggle = (province: string) => {
    const next = selected.includes(province) ? selected.filter((code) => code !== province) : [...selected, province]
    setAnyProv(false)                    // 选了具体省就不再是「还不确定」
    setSelected(next)
    onChange?.(next)
  }

  return (
    <>
      <QuizTitle>{t('quiz.q3')}</QuizTitle>
      <QuizSub>{t('quiz.q3multiSub')}</QuizSub>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        {CANADA_PROVINCES.map((province) => {
          const on = selected.includes(province)
          return (
            <button type="button" key={province} aria-pressed={on} onClick={() => toggle(province)}
              style={{ minHeight: 40, border: `1px solid ${on ? UI.primary : UI.border}`, borderRadius: 999,
                background: on ? '#eff6ff' : '#fff', color: on ? UI.primaryDeep : UI.text,
                padding: '8px 15px', font: `${on ? 650 : 500} 13.5px/1.35 inherit`, cursor: 'pointer' }}>
              {t('prov.' + province)}
            </button>
          )
        })}
        <button type="button" aria-pressed={anyProv}
          onClick={() => { setAnyProv(true); setSelected([]); onChange?.([]) }}
          style={{ minHeight: 40, border: `1px solid ${anyProv ? UI.primary : UI.border}`, borderRadius: 999,
            background: anyProv ? '#eff6ff' : '#fff', color: anyProv ? UI.primaryDeep : UI.text,
            padding: '8px 15px', font: `${anyProv ? 650 : 500} 13.5px/1.35 inherit`, cursor: 'pointer' }}>
          {t('quiz.provAny')}
        </button>
      </div>
      <QuizNav prevLabel={t('plan.prev')} nextLabel={t('plan.next')} onPrev={onBack}
        nextDisabled={!selected.length && !anyProv} onNext={() => onDone(selected, anyProv)}
        hint={selected.length || anyProv ? undefined : t('quiz.pickProvince')}
        doneLabel={finishLabel && (selected.length || anyProv) ? finishLabel : undefined}
        onDone={onFinish ? () => onFinish(selected, anyProv) : undefined} />
    </>
  )
}
