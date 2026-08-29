'use client'
/**
 * 对比表「行业」行的单元格:渲染一枚标签,没有数据时渲灰色横杠。
 * 对比表是**转置**的 —— 维度当行、雇主当列。
 * 2026-08-27 换装批自 Compare.tsx 的同名维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { TagText } from './tagtext'
import type { CompareCellRow } from './types'

/**
 * 渲染对比表「行业」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 标签,没有数据时是灰色横杠。
 */
export function IndustryCell(r: CompareCellRow) {
  return <TagText v={r.industry} />
}
