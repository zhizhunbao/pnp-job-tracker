'use client'
/**
 * 域内哑单元格:雇主表「在招职业」格 —— 前两个职业名绿胶囊 + 「等 N 个」灰胶囊(同一形才排得齐,
 * 2026-09-05 Frank「换行太难看了不协调」);主图没到时空着。
 *
 * @author Frank
 * @time 2026-09-05 01:10:00
 */
import { TEXT_NONE } from './constants'
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染在招职业格。
 *
 * @param r 这一行。
 * @returns 胶囊组。
 */
export function EmpHiringCell(r: EmpCellRow) {
  const pills = []
  for (const p of r.hiringOcc) {
    pills.push(<span key={p.key} className={p.cls}>{p.text}</span>)
  }
  return (
    <span className={css.pills}>
      {pills}
      {r.hiringMoreText !== TEXT_NONE && <span className={css.chipGray}>{r.hiringMoreText}</span>}
    </span>
  )
}
