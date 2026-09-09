'use client'
/**
 * 指标表同比列的单元格:带正负号的百分数,持平素色、涨绿跌红;算不出横杠。
 *
 * @author Frank
 * @time 2026-09-09 03:00:00
 */
import { DASH_MARK } from './constants'
import type { MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染同比格。
 *
 * @param r 这一行。
 * @returns 同比文案。
 */
export function MacroYoyCell(r: MacroRow) {
  if (r.yoy == null) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return <span className={r.yoyCls}>{r.yoy.text}</span>
}
