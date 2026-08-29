'use client'
/**
 * plan 域的结构:「你的条件」网格里的一格(标签 + 控件)。两种形态共用同一副外观:
 * 官方档位与自报条件走下拉,时薪走数字输入 —— BC 按每整元计分,切成区间会把人的分算低。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的九处 label+select 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ScoreOptionItem } from './scoreoptionitem'
import { FIELD_SELECT, INPUT_NUMBER } from './constants'
import { makeInputChange, makeSelectChange } from './functions'
import type { ScoreCellIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一格条件。
 *
 * @param props 这一格。
 * @returns 标签与控件。
 */
export function ScoreCell({ f }: ScoreCellIn) {
  const options = []
  for (const o of f.options) {
    options.push(<ScoreOptionItem key={o.value} o={o} />)
  }
  return (
    <div>
      <div className={cssOf(css.psLabel)}>{f.label}</div>
      {f.kind === FIELD_SELECT && (
        <select value={f.value} onChange={makeSelectChange({ onPick: f.onPick })} className={cssOf(css.psSelect)}>
          {options}
        </select>
      )}
      {f.kind === INPUT_NUMBER && (
        <input type={INPUT_NUMBER} min={0} value={f.value}
          onChange={makeInputChange({ onPick: f.onPick })} className={cssOf(css.psSelect)} />
      )}
    </div>
  )
}
