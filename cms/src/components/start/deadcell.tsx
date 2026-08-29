'use client'
/**
 * 职业榜「完全无路可走的省」列的单元格(E13-08,Frank 2026-08-07「哪些职位在哪些省
 * 完全无路可走·千万别来」)。判定 = ETL any_pr_path(四通道全无才判死,锚官方原句);
 * 单元格自带「无通道」后缀 —— 表头滚出视野后裸省码不自明。
 * 2026-08-28 换装批自 Pulse.tsx 的 dead 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { OccCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染职业榜「完全无路可走的省」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 红字省码串;这一行没有死路省时是灰色横杠。
 */
export function DeadCell(r: OccCellRow) {
  if (r.deadText === TEXT_NONE) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return <span className={css.deadText}>{r.deadText}</span>
}
