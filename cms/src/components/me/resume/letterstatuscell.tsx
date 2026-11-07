'use client'
/**
 * me 桶子桶 resume 的哑单元格:求职信表的状态格(「草稿」灰胶囊 / 「已投递」绿胶囊)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Tag } from '@/components/tag'
import type { LetterCellRow } from './types'

/**
 * 状态格。
 *
 * @param r 展示行。
 * @returns 胶囊。
 */
export function LetterStatusCell(r: LetterCellRow) {
  return <Tag variant={r.tag}>{r.statusText}</Tag>
}
