'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「中位时薪」格(本省同职业时薪中位,灰字,同职位板那一列)。
 * 2026-11-09 Frank「这部分加进 table 吧」「这个地方都显示 时薪吧」。
 *
 * @author Frank
 * @time 2026-11-09 12:00:00
 */
import { cssOf } from '@/components/css'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染中位时薪格。
 *
 * @param r 这一行的展示行。
 * @returns 中位时薪。
 */
export function MedCell(r: ListRow) {
  return <span className={cssOf(css.med)}>{r.wage.med}</span>
}
