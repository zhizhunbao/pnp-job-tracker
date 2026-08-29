'use client'
/**
 * plan 域的单元格:抽选表的日期列(数字等宽,日期竖着对得齐)。
 * 2026-08-28 换装批自 Decision.tsx 的 date 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { DrawCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个抽选日期格。
 *
 * @param r 这一行展示行。
 * @returns 日期。
 */
export function DrawDateCell(r: DrawCellRow) {
  return <span className={css.drawDateCell}>{r.date}</span>
}
