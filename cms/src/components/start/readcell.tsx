'use client'
/**
 * 抽选表「冷解读」列的单元格:当期分数线 vs 近 12 期同通道区间(服务端算好的三标量填槽)。
 * 样本不足(同通道 <4 期有分)就整格留空 —— **不编一句话**。
 * 2026-08-28 换装批自 Pulse.tsx 的 read 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { DrawCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表「冷解读」列的一个单元格。
 *
 * @param r 这一期的展示行。
 * @returns 解读文字;样本不足时是空格子。
 */
export function ReadCell(r: DrawCellRow) {
  return <span className={css.readText}>{r.read}</span>
}
