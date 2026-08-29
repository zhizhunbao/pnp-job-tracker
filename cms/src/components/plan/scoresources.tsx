'use client'
/**
 * plan 域的结构:官方出处那一段(逐省一条链接)。
 * 2026-08-16 Frank「这部分废话删掉」:「按官方分值表自算,非资格认定」撤 —— 同一句在这页
 * 出现好几处,而卡名与官方出处链接本来就说明了它是自算。生效日期并进出处那一行,不单占一行。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的出处段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ScoreSource } from './scoresource'
import type { ScoreSourcesIn } from './types'
import css from './plan.module.css'

/**
 * 渲染官方出处那一段。
 *
 * @param props 取词函数与各省估分。
 * @returns 出处段。
 */
export function ScoreSources({ t, scores }: ScoreSourcesIn) {
  const links = []
  for (const s of scores) {
    links.push(<ScoreSource key={s.province} t={t} s={s} />)
  }
  return (
    <div className={cssOf(css.psSources)}>
      <div className={cssOf(css.psSourceRow)}>{links}</div>
    </div>
  )
}
