'use client'
/**
 * 域内哑单元格:雇主板「指定雇主」列 —— 命中直接写项目(AIP、RCIP、FCIP;列头已是「指定雇主」,
 * 2026-09-13 Frank「这个胶囊不重复吗」→ 胶囊撤;指定省灰注一度加过,同日「下面就没必要在显示省份了吧」撤 ——
 * 地点胶囊已带省),非指定渲灰色横杠。
 * 2026-09-19 Frank「指定雇主格写明所在地」**改判**同日那条:一行一个项目,项目名后面跟它的资格所在地
 * (「AIP NB、NS」「RCIP Sudbury, ON」)—— 资格是按省 / 按社区给的,不写明会让人以为别处的岗也能走。
 * 2026-09-19 晚 Frank「这个只显示 RCIP 和 FCIP 即可」**再改判**:一行一个项目名,所在地不跟。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { cssOf } from '@/components/css'
import { DASH_MARK } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染指定雇主格。
 *
 * @param r 这一行的展示行。
 * @returns 一行一个项目(带所在地),或灰色横杠。
 */
export function DesignatedCell(r: EmployerCellRow) {
  if (r.designatedLines.length === 0) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  const lines = []
  for (const line of r.designatedLines) {
    lines.push(<div key={line} className={cssOf(css.ok)}>{line}</div>)
  }
  return <div>{lines}</div>
}
