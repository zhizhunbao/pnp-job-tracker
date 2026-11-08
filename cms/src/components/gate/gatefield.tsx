'use client'
/**
 * gate 域的结构:一页表单里的一格(照 Fluent 2 Field:标签在上、灰字说明跟在标签后面、控件在下)。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { GateFieldIn } from './types'
import css from './gate.module.css'

/**
 * 表单一格。
 *
 * @param props 标签、灰字说明与控件。
 * @returns 一格。
 */
export function GateField({ label, hint = TEXT_NONE, children }: GateFieldIn) {
  return (
    <div className={cssOf(css.field)}>
      <div className={cssOf(css.fieldLabel)}>
        {label}
        {hint !== TEXT_NONE && <span className={cssOf(css.fieldHint)}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
