'use client'

import { useState } from 'react'

import { QuizNav, QuizSub, QuizTitle } from './QuizUI'
import { UI } from '../ui/primitives'
import type { TFn } from '../jobs/i18n'

export const CANADA_PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'] as const

export function ProvincePicker({ t, initial, onChange, onDone, onBack }: {
  t: TFn
  initial: string[]
  onChange?: (provinces: string[]) => void
  onDone: (provinces: string[]) => void
  onBack?: () => void
}) {
  const [selected, setSelected] = useState<string[]>(initial)
  const toggle = (province: string) => {
    const next = selected.includes(province) ? selected.filter((code) => code !== province) : [...selected, province]
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
      </div>
      <QuizNav prevLabel={t('plan.prev')} nextLabel={t('plan.next')} onPrev={onBack}
        nextDisabled={!selected.length} onNext={() => onDone(selected)}
        hint={selected.length ? undefined : t('quiz.pickProvince')} />
    </>
  )
}
