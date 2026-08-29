'use client'
/**
 * plan 域的单元格:抽选线表的日期列(数字等宽,日期竖着对得齐)。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 date 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import type { LineDraw } from './types'
import css from './plan.module.css'

/**
 * 渲染一个抽选日期格。
 *
 * @param draw 这一轮抽选。
 * @returns 抽选日。
 */
export function LineDateCell(draw: LineDraw) {
  return <span className={css.lineDateCell}>{draw.drawDate}</span>
}
