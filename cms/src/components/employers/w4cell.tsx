'use client'
/**
 * 担保雇主表「近 4 季 LMIA 获批数」列的单元格:渲染青绿粗体的数值(它是官方历史事实,
 * 与在招数那种本站口径的黑色粗体区分开);这一列没有数据时渲灰色横杠。
 * 2026-08-27 换装批自 Sponsors.tsx 的同名列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { DashText } from './dashtext'
import type { SponsorCellRow } from './types'

/**
 * 渲染担保雇主表「近 4 季 LMIA 获批数」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 青绿粗体的数值,没有数据时是灰色横杠。
 */
export function W4Cell(r: SponsorCellRow) {
  return <DashText v={r.w4} />
}
