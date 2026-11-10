'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「vs 中位」格(高于或持平绿、低于琥珀,同职位板那一列)。
 * 2026-11-09 Frank「这部分加进 table 吧」。
 *
 * @author Frank
 * @time 2026-11-09 12:00:00
 */
import { cssOf } from '@/components/css'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染 vs 中位格。
 *
 * @param r 这一行的展示行。
 * @returns 百分比。
 */
export function VsCell(r: ListRow) {
  if (r.wage.down) {
    return <span className={cssOf(css.vsDown)}>{r.wage.vs}</span>
  }
  return <span className={cssOf(css.vsUp)}>{r.wage.vs}</span>
}
