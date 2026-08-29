'use client'
/**
 * plan 域的结构:该职业分省竞争卡(Frank 2026-08-12「还需要加相关职业各省市的竞争比」)。
 * 2026-08-15 Frank「该职业分省竞争放到各省名额竞争上面」→ 两种页态都摆在名额竞争之前:
 * 先看**这个职业**在哪个省好找,再看那个省的名额有多挤。
 * 2026-08-28 换装批自 Decision.tsx 的 occCompCard 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { TEXT_NONE } from './constants'
import { OccChips } from './occchips'
import { OccCompCards } from './occcompcards'
import { OccCompTable } from './occcomptable'
import type { OccCompCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染该职业分省竞争卡。
 *
 * @param props 决策页整机。
 * @returns 职业竞争卡。
 */
export function OccCompCard({ d }: OccCompCardIn) {
  if (d.answers.noc === TEXT_NONE || d.view.occ.rows.length === 0) {
    return null
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{d.t('dp.occCompTitle')}</h2>
      {d.answers.bands.nocs.length > 1 && <OccChips d={d} />}
      <OccCompCards t={d.t} rows={d.view.occ.rows} />
      <OccCompTable t={d.t} rows={d.view.occ.rows} />
      <div className={css.note}>{d.t('dp.occCompNote')}</div>
    </div>
  )
}
