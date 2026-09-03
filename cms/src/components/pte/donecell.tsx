'use client'
/**
 * 哑单元格:练过勾(没练给空)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { PteCellRow } from './types'

/**
 * 渲染练过格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function DoneCell(r: PteCellRow) {
  return <span>{r.doneText}</span>
}
