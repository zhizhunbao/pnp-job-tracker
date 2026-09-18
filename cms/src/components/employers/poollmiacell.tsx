'use client'
/**
 * 域内哑单元格:雇主板「LMIA」列(字段面板里的可选列)—— 技能类 LMIA 份数,没有就渲灰色横杠。
 * 列名就叫 LMIA(2026-09-18 Frank「就叫 lmia 不行吗」:高薪流 + 全球人才流、排除农业 / 低薪 / 仅永居是数据层口径,不上界面)。
 *
 * @author Frank
 * @time 2026-09-18 16:30:00
 */
import { cssOf } from '@/components/css'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染 LMIA 格。
 *
 * @param r 这一行的展示行。
 * @returns 份数,或灰色横杠。
 */
export function PoolLmiaCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.lmiaText, cls: cssOf(css.num) }} />
}
