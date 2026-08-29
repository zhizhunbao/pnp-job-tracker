'use client'
/**
 * plan 域的单元格:抽选表的邀请数列。这张表的入选条件是「有分数线**或**有邀请数」——
 * 只摆分数线的话,靠邀请数入选的行(NL/MB/NB)整行都是横杠,把它入选的那个事实藏了。
 * 2026-08-28 换装批自 Decision.tsx 的 inv 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { DrawCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个邀请数格。
 *
 * @param r 这一行展示行。
 * @returns 邀请数(官方缺位就是那根横杠)。
 */
export function DrawInvCell(r: DrawCellRow) {
  return <span className={css.drawInvCell}>{r.inv}</span>
}
