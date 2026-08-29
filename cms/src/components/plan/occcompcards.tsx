'use client'
/**
 * plan 域的结构:该职业分省竞争的手机卡列(与桌面表两选一)。
 * 2026-08-28 换装批自 Decision.tsx 的 dpOccCards 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { OccCompCardRow } from './occcompcardrow'
import type { OccCompRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染职业竞争的手机卡列。
 *
 * @param props 洗好的展示行。
 * @returns 手机卡列。
 */
export function OccCompCards({ rows }: OccCompRowsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<OccCompCardRow key={r.key} r={r} />)
  }
  return <div className={css.occCards}>{cards}</div>
}
