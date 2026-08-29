'use client'
/**
 * 通道表「职业名」列的单元格:人话名做主文案,半粗一档 —— 一眼扫得出这条清单点名的是谁。
 * 官方只给了码、字典没收录名字时渲横杠(洗展示行时就换好了),空着会被读成「这一格漏渲了」。
 * 2026-08-28 换装批自 Occupations.tsx 的同名列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import type { OccCellRow } from './types'
import css from './occupations.module.css'

/**
 * 渲染通道表「职业名」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 半粗的职业名,或横杠。
 */
export function NameCell(r: OccCellRow) {
  return <span className={css.name}>{r.name}</span>
}
