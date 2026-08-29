'use client'
/**
 * 职位榜表格「EE」列的单元格:联邦 EE 类别的三语显示名(小半档字号)。
 * 没命中类别时渲灰色横杠。多个类别在显示层用顿号枚举(#209:数据层用「/」拼,
 * 显示层改顿号 —— no-dot-separator 硬规矩),那一步在洗展示行时做完。
 * 2026-08-28 换装批自 Ranking.tsx 的职位榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { DashText } from './dashtext'
import type { RankJobCellRow } from './types'

/**
 * 渲染职位榜「EE」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 类别名,没命中时是灰色横杠。
 */
export function EeCell(r: RankJobCellRow) {
  return <DashText v={r.ee} />
}
