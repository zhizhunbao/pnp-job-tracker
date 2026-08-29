'use client'
/**
 * plan 域的单元格工厂:数字格 —— 有字就渲一格普通 span,空串渲灰横杠。
 * 竞争表的存量/流量四列长得一模一样,差别只有「取哪一格的字」,所以做成工厂
 * 而不是四个只差一个字段名的组件文件。
 * 2026-08-28 换装批自 Decision.tsx 的 numOrDash 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { TEXT_NONE } from './constants'
import type { CellRenderFn, CompCellRow, MakeCellIn } from './types'

/**
 * 造一枚数字单元格。
 *
 * @param x 从展示行里挑哪一格的字。
 * @returns 单元格渲染函数。
 */
export function makeCompCell(x: MakeCellIn<CompCellRow>): CellRenderFn<CompCellRow> {
  return function compCell(r: CompCellRow) {
    const text = x.pick(r)
    if (text === TEXT_NONE) {
      return <DashText />
    }
    return <span>{text}</span>
  }
}
