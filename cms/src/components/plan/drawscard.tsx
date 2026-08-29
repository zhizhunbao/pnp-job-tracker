'use client'
/**
 * plan 域的结构:SSR 事实区 —— 各省最近一轮抽选。纯事实、免费(收费原则:
 * 简化操作的才收费),爬虫不看顺序,人看时它只是参考,所以放在主干之后。
 * 2026-08-28 换装批自 Decision.tsx 的抽选卡提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DrawsCards } from './drawscards'
import { DrawsTable } from './drawstable'
import type { DrawsCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染各省最近抽选卡。
 *
 * @param props 决策页整机。
 * @returns 抽选卡。
 */
export function DrawsCard({ d }: DrawsCardIn) {
  if (d.view.draws.rows.length === 0) {
    return null
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{d.t('dp.draws')}</h2>
      <DrawsCards t={d.t} rows={d.view.draws.rows} />
      <DrawsTable t={d.t} rows={d.view.draws.rows} />
    </div>
  )
}
