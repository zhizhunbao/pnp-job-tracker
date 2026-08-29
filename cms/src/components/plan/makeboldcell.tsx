'use client'
/**
 * plan 域的单元格工厂:加粗数字格 —— 有字就加粗渲,空串渲灰横杠。
 * 竞争表的竞争比与职业竞争表的在招数都是「这一列的主数字」,同一种形态两处用,
 * 所以做成工厂而不是两个只差一个字段名的组件文件。
 * 2026-08-28 换装批自 Decision.tsx 的两处 `<b>` 单元格收拢。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { TEXT_NONE } from './constants'
import type { CellRenderFn, MakeCellIn } from './types'

/**
 * 造一枚加粗数字单元格。
 *
 * @param x 从展示行里挑哪一格的字。
 * @returns 单元格渲染函数。
 */
export function makeBoldCell<T>(x: MakeCellIn<T>): CellRenderFn<T> {
  return function boldCell(r: T) {
    const text = x.pick(r)
    if (text === TEXT_NONE) {
      return <DashText />
    }
    return <b>{text}</b>
  }
}
