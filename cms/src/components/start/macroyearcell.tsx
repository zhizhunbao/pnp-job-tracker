'use client'
/**
 * 宏观表年份列的单元格工厂:一列一个年份,格里是值 + 进行年灰注(整列同一个时提到列头,格里不重复;
 * 不一致时跟在数后面括号里一行写完)。没格的词:整行没数 → 最后一列写「不适用 / 未发布」其余留白
 * (Frank 2026-09-08「没公布的就写 未公布」,举证表 MACRO_UNPUBLISHED);行里最后一个有数年之后、
 * 当前年及以前的空格显「未发布」(官方还没发,Frank 2026-09-09);未来年留白。
 * 2026-09-10 改:首个有数年之前与中间空档一律留白(横杠)—— 原实现把这些格也写「未发布」,
 * 但没抓到 ≠ 官方没发(SK 2021 配额是本站没解析到),「未发布」必须举证(CLAUDE.md 数据约定),留白即「本站未收录」。
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
      if (r.missing !== TEXT_NONE && x.last) {
        return <span className={css.dim}>{r.missing}</span>
      }
      if (r.latestYear === TEXT_NONE) {
        return <span className={css.dim}>{TEXT_NONE}</span>
      }
      if (x.year > x.now) {
        return <span className={css.dim}>{TEXT_NONE}</span>
      }
      if (r.latestYear !== TEXT_NONE && x.year > r.latestYear) {
        return <span className={css.dim}>{x.unreleased}</span>
      }
      return <span className={css.dim}>{TEXT_NONE}</span>
    }
    return (
      <span className={css.nowrap}>
        {c.text}
        {c.note !== TEXT_NONE && c.note !== x.note && <span className={css.dim}>{NOTE_OPEN}{c.note}{NOTE_CLOSE}</span>}
      </span>
    )
  }
}
