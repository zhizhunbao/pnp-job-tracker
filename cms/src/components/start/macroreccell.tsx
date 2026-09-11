'use client'
/**
 * 比值表推荐列的单元格:两档胶囊(推荐绿 / 不推荐红,2026-09-10 Frank「把一般删了」),没数的行留白。
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
