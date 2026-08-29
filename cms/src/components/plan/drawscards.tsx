'use client'
/**
 * plan 域的结构:各省最近抽选的手机卡列(与桌面表两选一,SSR 两份都在 DOM 里 ——
 * 爬虫不看顺序,人看时它只是参考)。
 * 2026-08-28 换装批自 Decision.tsx 的 dpDrawCards 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DrawsCardRow } from './drawscardrow'
import type { DrawRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染抽选的手机卡列。
 *
 * @param props 洗好的展示行。
 * @returns 手机卡列。
 */
export function DrawsCards({ rows }: DrawRowsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<DrawsCardRow key={r.key} r={r} />)
  }
  return <div className={css.drawCards}>{cards}</div>
}
