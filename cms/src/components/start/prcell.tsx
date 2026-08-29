'use client'
/**
 * 分省概览「省提名拿到 PR」列的单元格。🔴 QC 那一格出的是「不适用」而不是横杠:
 * 魁北克走自己的移民体系,不属 PNP —— *本站没有这一项* 与 *这个省没有这条路*
 * 在用户那里意思相反,不许合成一个横杠。
 * 2026-08-28 换装批自 Pulse.tsx 的 pr 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { ProvCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染分省概览「省提名拿到 PR」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 数值;QC 是灰色的「不适用」,其余没数时是横杠。
 */
export function PrCell(r: ProvCellRow) {
  if (r.prNotApplicable) {
    return <span className={css.dim}>{r.prNaText}</span>
  }
  return <>{r.prText}</>
}
