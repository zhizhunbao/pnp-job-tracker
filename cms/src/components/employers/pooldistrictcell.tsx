'use client'
/**
 * 域内哑单元格:雇主板「区」列(可选列,字段面板里勾)—— 洗行时算好的一行文字,没有就渲灰色横杠
 * (2026-09-18 Frank「区的字段没有啊」「授权,加区字段」;区 = 该雇主主市的在招岗里出现最多的区,数据层算好)。
 *
 * @author Frank
 * @time 2026-09-18 18:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染区格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolDistrictCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.districtText, cls: TEXT_NONE }} />
}
