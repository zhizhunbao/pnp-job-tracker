'use client'
/**
 * 横卡清单:一行一张,空了出空态。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { JobRow } from './jobrow'
import type { JobListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染清单。
 *
 * @param props 展示行与空态。
 * @returns 一列横卡。
 */
export function JobList({ rows, empty }: JobListIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<JobRow key={r.key} r={r} />)
  }
  return (
    <div className={css.list}>
      {cards}
      {rows.length === 0 && empty}
    </div>
  )
}
