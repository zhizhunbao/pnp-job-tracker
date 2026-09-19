'use client'
/**
 * 域内哑单元格:雇主板「类别」列 —— 洗行时算好的在招大类名(岗最多的两个,顿号连),没有就渲灰色横杠
 * (2026-09-18 晚 Frank「公司类别要显示」;词与「全部类别」下拉同一套,是职位板那套本站大类)。
 *
 * @author Frank
 * @time 2026-09-19 00:30:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染类别格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolBroadCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.broadText, cls: TEXT_NONE }} />
}
