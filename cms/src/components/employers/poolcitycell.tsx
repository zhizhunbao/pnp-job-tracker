'use client'
/**
 * 域内哑单元格:雇主板「市」列 —— 洗行时算好的一行文字,没有就渲灰色横杠
 * (2026-09-18 雇主板换版:地点一列换成 类别 / 省 / 市 三列;Frank 拍板格子里不要胶囊也不要灰注)。
 *
 * @author Frank
 * @time 2026-09-18 14:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染市格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolCityCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.cityText, cls: TEXT_NONE }} />
}
