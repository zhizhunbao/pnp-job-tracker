'use client'
/**
 * 竞争表推荐列的单元格:三色胶囊(推荐 / 可选 / 拥挤),没数的行留白。
 *
 * @author Frank
 * @time 2026-09-09 21:00:00
 */
import { TEXT_NONE } from './constants'
import type { MacroRow } from './types'

/**
 * 渲染推荐格。
 *
 * @param r 这一行。
 * @returns 胶囊或空。
 */
export function MacroRecCell(r: MacroRow) {
  if (r.rec === TEXT_NONE) {
    return <span>{TEXT_NONE}</span>
  }
  return <span className={r.recCls}>{r.rec}</span>
}
