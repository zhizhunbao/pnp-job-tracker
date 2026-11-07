'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「工时」格(只出英文,2026-10-12 Frank「table 时候」不出灰字)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'

/**
 * 渲染工时格。
 *
 * @param r 这一行的展示行。
 * @returns 名字;没标是空格。
 */
export function HoursCell(r: ListRow) {
  if (r.hoursEn === TEXT_NONE) {
    return null
  }
  return <Name en={r.hoursEn} sub={TEXT_NONE} />
}
