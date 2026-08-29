'use client'
/**
 * plan 域的小件:手机卡上的胶囊排 —— 缺口与时长在手机上并成一排(桌面是两列)。
 * 职业档粗筛态不出胶囊:没答条件,判定本来就出不来。
 * 2026-08-28 换装批自 Decision.tsx 的手机卡 chips 槽提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { PillText } from './pilltext'
import type { PlanCardRowIn } from './types'

/**
 * 渲染手机卡的胶囊排。
 *
 * @param props 这一行展示行与粗筛态。
 * @returns 胶囊排。
 */
export function PlanCardChips({ r }: PlanCardRowIn) {
  const pills = []
  for (const p of r.pills.gaps) {
    pills.push(<PillText key={p.text} p={p} />)
  }
  if (r.pills.time != null) {
    pills.push(<PillText key={r.pills.time.text} p={r.pills.time} />)
  }
  return <>{pills}</>
}
