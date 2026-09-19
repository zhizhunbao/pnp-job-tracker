'use client'
/**
 * 域内哑单元格:雇主板「行业」列 —— 洗行时算好的行业组名,没有就渲灰色横杠
 * (2026-09-18 Frank「雇主后面加一个行业列吧」;词与「选择行业」下拉同一套)。
 *
 * @author Frank
 * @time 2026-09-18 20:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染行业格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolGroupCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.groupText, cls: TEXT_NONE }} />
}
