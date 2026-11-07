'use client'
/**
 * me 桶子桶 jobs 的阶段筛选排(我的投递页签顶上;照 LinkedIn 求职追踪页的 Saved 0 / In Progress 0 / Applied 0):
 * 一档一枚 chip 桶筛选药丸带计数,点了只看那一档(可点的筛选走 Chip,不自造胶囊钮)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { makePillClick } from './functions'
import type { StageBarIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染筛选排。
 *
 * @param props 筛选与切档落格。
 * @returns 一排药丸。
 */
export function StageBar({ pills, setStage }: StageBarIn) {
  const out = []
  for (const p of pills) {
    out.push(
      <Chip key={p.key} active={p.on} onClick={makePillClick({ key: p.key, setStage })}>
        {p.label}
        <b className={cssOf(css.stageN)}>{p.count}</b>
      </Chip>,
    )
  }
  return <div className={cssOf(css.stages)}>{out}</div>
}
