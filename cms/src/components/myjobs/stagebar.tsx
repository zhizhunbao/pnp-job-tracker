'use client'
/**
 * 阶段胶囊排(照 LinkedIn 求职追踪页顶上的 Saved · 0 / In Progress · 0 / Applied · 0):一档一枚带计数,点了只看那一档。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { StagePillButton } from './stagepillbutton'
import type { StageBarIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染胶囊排。
 *
 * @param props 胶囊与切档手柄。
 * @returns 一排胶囊。
 */
export function StageBar({ pills, onPick }: StageBarIn) {
  const out = []
  for (const p of pills) {
    out.push(<StagePillButton key={p.key} pill={p} onPick={onPick} />)
  }
  return <div className={css.stages}>{out}</div>
}
