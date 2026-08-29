'use client'
/**
 * plan 域的单元格:初评表的「还要多久」列 —— 一行一值的时长/状态胶囊。
 * 数据列,同值重复属正常,不做收共项花活。
 * 2026-08-28 换装批自 Decision.tsx 的 timeCell 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { PillText } from './pilltext'
import type { PlanCellRow } from './types'

/**
 * 渲染一个「还要多久」格。
 *
 * @param r 这一行展示行。
 * @returns 一枚胶囊,或者灰横杠。
 */
export function PlanTimeCell(r: PlanCellRow) {
  const p = r.pills.time
  if (p == null) {
    return <DashText />
  }
  return <PillText p={p} />
}
