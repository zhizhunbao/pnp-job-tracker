'use client'

import { useState } from 'react'

import { QuizBar, QuizTitle } from './QuizUI'
import { Button, UI } from '../ui/primitives'
import type { TFn } from '../jobs/i18n'

export const CANADA_PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'] as const

const BACK: React.CSSProperties = {
  border: `1px solid ${UI.border}`, background: '#fff', color: UI.text2, borderRadius: 8,
  padding: '11px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginRight: 'auto',
}

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
      <div style={{ fontSize: 12.5, color: UI.text3, margin: '-10px 0 14px', lineHeight: 1.55 }}>{t('quiz.q3multiSub')}</div>
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
      <QuizBar hint={selected.length ? undefined : t('quiz.pickProvince')}>
        {onBack && <button type="button" onClick={onBack} style={BACK}>{t('plan.prev')}</button>}
        <Button kind="primary" disabled={!selected.length} onClick={() => onDone(selected)}
          style={{ padding: '11px 26px', fontSize: 14, ...(!selected.length ? { background: UI.hairline, color: UI.text3, cursor: 'default' } : null) }}>
          {t('plan.next')}
        </Button>
      </QuizBar>
    </>
  )
}
