'use client'
/**
 * 对比表「技能类获批」行的单元格:渲染这家雇主在该维度上的数值,没有数据时渲
 * 灰色横杠。
 * E12-08:裸「知名」维度行退役(wiki 依据降级进公司分知名度维),担保信号改由这一行承担。
 * 对比表是**转置**的 —— 维度当行、雇主当列,所以这一件渲的是「某家雇主在这一维度上
 * 的值」。
 * 2026-08-27 换装批自 Compare.tsx 的同名维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { DashText } from './dashtext'
import type { CompareCellRow } from './types'

/**
 * 渲染对比表「技能类获批」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 数值,没有数据时是灰色横杠。
 */
export function CompareSkilledCell(r: CompareCellRow) {
  return <DashText v={r.skilled} />
}
