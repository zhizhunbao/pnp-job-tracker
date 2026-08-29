'use client'
/**
 * plan 域的小件:一个省的官方出处链接(省码 + 「官方页」+ 日期灰注)。
 * 走 button 族的 LinkButton —— 全站唯一裸 <a> 在那一处,rel 逻辑也收拢在它一处。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的出处链接提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK } from './constants'
import { sourceDateTextOf, sourceLabelOf } from './functions'
import type { ScoreSourceIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个省的官方出处链接。
 *
 * @param props 取词函数与这个省的估分。
 * @returns 链接。
 */
export function ScoreSource({ t, s }: ScoreSourceIn) {
  return (
    <LinkButton href={s.url} target={TARGET_BLANK} className={cssOf(css.psSourceLink)}>
      {sourceLabelOf({ t, s })}
      <span className={cssOf(css.psSourceDate)}>{sourceDateTextOf({ t, s })}</span>
    </LinkButton>
  )
}
