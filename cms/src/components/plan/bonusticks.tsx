'use client'
/**
 * plan 域的结构:结果区的加分项勾选网格。与算分同口径:#304 关闸时 offer 前提族不摆
 * (勾了也不计分 = 摆着骗人);#305 推导出的因子不摆(值由基础卷答案定,勾选框改不动它)。
 * 一行两个事实(条目、+N)拆成列(同 ui/Grid 规矩):外层 auto-fit 决定几列,
 * 条目内部 [勾选框 | 条目 | +N] 三列,+N 在同一列上对齐。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的加分项段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { BonusTick } from './bonustick'
import { bonusTicksOf } from './functions'
import type { BonusTicksIn } from './types'
import css from './plan.module.css'

/**
 * 渲染加分项勾选网格。
 *
 * @param props 分值卡整机与这个省的估分。
 * @returns 网格;一条都没有时不出。
 */
export function BonusTicks({ d, s }: BonusTicksIn) {
  const rows = bonusTicksOf({ d, s })
  if (rows.length === 0) {
    return null
  }
  const items = []
  for (const r of rows) {
    items.push(<BonusTick key={r.key} on={r.on} onToggle={r.toggle} text={r.text} pts={r.pts} />)
  }
  return (
    <div className={cssOf(css.psBonus)}>
      <div className={cssOf(css.psLabel)}>{d.t('ps.bonus')}</div>
      <div className={cssOf(css.psBonusGrid)}>{items}</div>
    </div>
  )
}
