'use client'
/**
 * plan 域的小件:加分项一条 = [勾选框 | 条目 | +N] 三列 —— +N 单独成列才对得齐
 * (别塞回文字尾巴上)。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的 Tick 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { INPUT_CHECKBOX } from './constants'
import { makeCheckChange, ptsSignTextOf } from './functions'
import type { BonusTickIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一条加分项。
 *
 * @param props 勾选态、勾选落格、条目文字与分值。
 * @returns 一条。
 */
export function BonusTick({ on, onToggle, text, pts }: BonusTickIn) {
  return (
    <label className={cssOf(css.psTick)}>
      <input type={INPUT_CHECKBOX} checked={on} onChange={makeCheckChange({ toggle: onToggle })}
        className={cssOf(css.psTickBox)} />
      <span>{text}</span>
      <span className={cssOf(css.psTickPts)}>{ptsSignTextOf(pts)}</span>
    </label>
  )
}
