'use client'
/**
 * 域内哑单元格:雇主板「工资水位」列 —— 桶内年薪中位 vs 同组同省全体中位的带符号百分比(+5% / -8% / 0%);
 * 无水位数据渲灰色横杠(分母缺 = 不表态,不折 0)。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染工资水位格。
 *
 * @param r 这一行的展示行。
 * @returns 带符号百分比,或灰色横杠。
 */
export function WageCell(r: EmployerCellRow) {
  return <DashText v={r.wage} />
}
