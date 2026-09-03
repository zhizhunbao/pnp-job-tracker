'use client'
/**
 * 哑单元格:考过次数(右对齐由列声明定)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { PteCellRow } from './types'

/**
 * 渲染考过次数格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function TimesCell(r: PteCellRow) {
  return <span>{r.times}</span>
}
