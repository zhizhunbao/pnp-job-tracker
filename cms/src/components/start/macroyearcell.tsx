'use client'
/**
 * 宏观表年份列的单元格工厂:一列一个年份,格里是值 + 进行年灰注(整列同一个时提到列头,格里不重复;
 * 不一致时跟在数后面括号里一行写完);没格三选一:整行没数 → 最后一列写「不适用 / 未公布 / 本站未收录」、
 * 其余留白;最后有数年之后到当年 → 「未发布」;第一个有数年之前与中间空档 → 「本站未收录」;未来年留白;
 * 整行没格的行在最后一列显缺数据的词(「未公布」/「本站未收录」,Frank 2026-09-08「没公布的就写 未公布」);
 * 行里最后一个有数年之后、当前年及以前的空格显「未发布」(官方还没发,Frank 2026-09-09);更早的空档与未来年仍横杠。
 * 列渲染器只收行,年份靠工厂闭进去(make* 工厂体内的内嵌函数是宪法豁免形)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { NOTE_CLOSE, NOTE_OPEN, TEXT_NONE } from './constants'
import type { CellFn, MacroRow, MacroYearCellIn } from './types'
import css from './start.module.css'

/**
 * 造某一年那列的单元格渲染器。
 *
 * @param x 年份列键与是否最后一列。
 * @returns 单元格渲染器。
 */
export function makeMacroYearCell(x: MacroYearCellIn): CellFn<MacroRow> {
  return function MacroYearCell(r: MacroRow) {
    const c = r.cells[x.year]
    if (c == null) {
      if (r.missing !== TEXT_NONE) {
        if (x.last) {
          return <span className={css.dim}>{r.missing}</span>
        }
        return <span className={css.dim}>{TEXT_NONE}</span>
      }
      if (x.year > x.now) {
        return <span className={css.dim}>{TEXT_NONE}</span>
      }
      if (r.latestYear !== TEXT_NONE && x.year > r.latestYear) {
        return <span className={css.dim}>{x.unreleased}</span>
      }
      return <span className={css.dim}>{x.notCollected}</span>
    }
    return (
      <span className={css.nowrap}>
        {c.text}
        {c.note !== TEXT_NONE && c.note !== x.note && <span className={css.dim}>{NOTE_OPEN}{c.note}{NOTE_CLOSE}</span>}
      </span>
    )
  }
}
