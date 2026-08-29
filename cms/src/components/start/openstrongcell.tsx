'use client'
/**
 * 分省概览「在招岗数」列的单元格:粗体数值(它是本站口径的主数,与旁边几列 IRCC
 * 官方体量的常规字重分开)。
 * 2026-08-28 换装批自 Pulse.tsx 的 open 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { ProvCellRow } from './types'

/**
 * 渲染分省概览「在招岗数」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 粗体数值;没算出来时是横杠。
 */
export function OpenStrongCell(r: ProvCellRow) {
  return <strong>{r.openText}</strong>
}
