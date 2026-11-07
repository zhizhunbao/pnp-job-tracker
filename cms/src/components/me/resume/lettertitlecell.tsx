'use client'
/**
 * me 桶子桶 resume 的哑单元格:求职信表的职位格(通用 Table 的 render 收整行)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { LetterTitle } from './lettertitle'
import type { LetterCellRow } from './types'

/**
 * 职位格。
 *
 * @param r 展示行。
 * @returns 职位名。
 */
export function LetterTitleCell(r: LetterCellRow) {
  return <LetterTitle title={r.title} href={r.href} draft={r.draft} />
}
