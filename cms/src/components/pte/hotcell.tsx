'use client'
/**
 * 哑单元格:押题标(主色字;不是押题给空)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { PteCellRow } from './types'
import css from './pte.module.css'

/**
 * 渲染押题格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function HotCell(r: PteCellRow) {
  return <span className={css.hot}>{r.hotText}</span>
}
