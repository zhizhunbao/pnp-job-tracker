'use client'
/**
 * plan 域的结构:各省名额竞争的手机卡列(与桌面表两选一,SSR 两份都在 DOM 里)。
 * 2026-08-28 换装批自 Decision.tsx 的 dpCompCards 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { CompetitionCardRow } from './competitioncardrow'
import type { CompetitionRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染竞争的手机卡列。
 *
 * @param props 洗好的展示行。
 * @returns 手机卡列。
 */
export function CompetitionCards({ rows }: CompetitionRowsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<CompetitionCardRow key={r.key} r={r} />)
  }
  return <div className={css.compCards}>{cards}</div>
}
