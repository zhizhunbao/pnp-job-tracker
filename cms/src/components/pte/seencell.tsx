'use client'
/**
 * 哑单元格:最近考过(「N 天前考过」/ 空)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { PteCellRow } from './types'

/**
 * 渲染最近考过格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function SeenCell(r: PteCellRow) {
  return <span>{r.seenText}</span>
}
