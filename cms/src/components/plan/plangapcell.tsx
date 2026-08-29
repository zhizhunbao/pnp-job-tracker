'use client'
/**
 * plan 域的单元格:初评表的「还差」列 —— 缺口胶囊排(一格里可能并排几枚)。
 * 前提两列拆分(2026-08-16 Frank「这个可以拆成两个列吧」):这一列只说缺口,
 * 时长归隔壁那一列,各说各的。
 * 2026-08-28 换装批自 Decision.tsx 的 gapCell 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { PillText } from './pilltext'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个「还差」格。
 *
 * @param r 这一行展示行。
 * @returns 胶囊排,或者灰横杠。
 */
export function PlanGapCell(r: PlanCellRow) {
  if (r.pills.gaps.length === 0) {
    return <DashText />
  }
  const pills = []
  for (const p of r.pills.gaps) {
    pills.push(<PillText key={p.text} p={p} />)
  }
  return <span className={css.pillRow}>{pills}</span>
}
