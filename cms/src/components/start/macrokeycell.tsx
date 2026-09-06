'use client'
/**
 * 宏观表「指标」列的单元格:行名 + 来源注(表号灰字);「其中」行缩进。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import type { MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染「指标」单元格。
 *
 * @param r 这一行。
 * @returns 行名与来源注。
 */
export function MacroKeyCell(r: MacroRow) {
  return (
    <div className={r.keyCls}>
      <span className={css.provName}>{r.label}</span>
      <span className={css.note}>{r.src}</span>
    </div>
  )
}
