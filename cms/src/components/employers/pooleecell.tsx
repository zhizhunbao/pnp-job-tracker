'use client'
/**
 * 域内哑单元格:雇主板「类别」列(可选列)—— 洗行时算好的在招 EE 类别名(岗最多的两个,顿号连),没有就渲灰色横杠
 * (2026-09-19 Frank「类别 和 全部大类 雇主也是需要的吧」:与职位板「全部类别」同名同义,是联邦 EE 类别;
 * 此前这一格是把脉页那八个行业组(poolgroupcell.tsx),Frank「这个应该是 EE 类别,不是人们正常用的大类别吧」后退役)。
 *
 * @author Frank
 * @time 2026-09-19 01:30:00
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
export function PoolEeCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.eeText, cls: TEXT_NONE }} />
}
