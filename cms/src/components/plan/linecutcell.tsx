'use client'
/**
 * plan 域的单元格:抽选线表的分数线列。这一格必有值 —— 没公布分数线的轮次在洗行时
 * 就被剔掉了(拿它当 0 比就是编),所以这里不必留横杠。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 cut 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import type { LineDraw } from './types'
import css from './plan.module.css'

/**
 * 渲染一个分数线格。
 *
 * @param draw 这一轮抽选。
 * @returns 分数线。
 */
export function LineCutCell(draw: LineDraw) {
  return <span className={css.lineCutCell}>{draw.score}</span>
}
