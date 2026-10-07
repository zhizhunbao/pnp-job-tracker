'use client'
/**
 * 域内哑单元格:投递状态格 —— 投过的写进度(只读,现在只有「已投」),没投过画横杠。
 * 2026-10-06 Frank「拆」:原先与「职位已下架」挤在一格,下架拆去职位状态格(listingcell)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import type { MyJobCellRow } from './types'

/**
 * 渲染投递状态格。
 *
 * @param r 展示行。
 * @returns 一个字段。
 */
export function StatusCell(r: MyJobCellRow) {
  return <span>{r.stageCell}</span>
}
