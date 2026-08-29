'use client'
/**
 * plan 域的结构:初评的手机卡列(与桌面表格两选一,SSR 两份都在 DOM 里)。
 * display 走 CSS 类不走内联:2026-08-15 实撞 —— 内联 display:grid 压过媒体查询的
 * display:none,桌面上卡片藏不掉,表格与卡片双份渲染。
 * 2026-08-28 换装批自 Decision.tsx 的 dpPlanCards 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { PlanCardRow } from './plancardrow'
import type { PlanRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染初评的手机卡列。
 *
 * @param props 取词函数、展示行与粗筛态。
 * @returns 手机卡列。
 */
export function PlanCards({ rows, coarse }: PlanRowsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<PlanCardRow key={r.rowKey} r={r} coarse={coarse} />)
  }
  return <div className={css.planCards}>{cards}</div>
}
