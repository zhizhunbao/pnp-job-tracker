'use client'
/**
 * 宏观表年份列的单元格工厂:一列一个年份,格里是值 + 进行年灰注(「4 月」「至 6 月」);没格横杠。
 * 列渲染器只收行,年份靠工厂闭进去(make* 工厂体内的内嵌函数是宪法豁免形)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { CellFn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 造某一年那列的单元格渲染器。
 *
 * @param year 年份列键。
 * @returns 单元格渲染器。
 */
export function makeMacroYearCell(year: string): CellFn<MacroRow> {
  return function MacroYearCell(r: MacroRow) {
    const c = r.cells[year]
    if (c == null) {
      return <span className={css.dim}>{DASH_MARK}</span>
    }
    return (
      <span className={css.block}>
        {c.text}
        {c.note !== TEXT_NONE && <span className={css.note}>{c.note}</span>}
      </span>
    )
  }
}
