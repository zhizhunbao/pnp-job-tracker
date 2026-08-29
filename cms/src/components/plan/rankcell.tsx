'use client'
/**
 * plan 域的单元格:初评表的名次圆牌。榜首染蓝白字,其余灰底灰字;带岗态补的
 * 「本岗所在省」行给一个记号而不是数字 —— 它不冒充名次(#325)。
 * 2026-08-28 换装批自 Decision.tsx 的 rank 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个名次圆牌。
 *
 * @param r 这一行展示行。
 * @returns 名次圆牌。
 */
export function RankCell(r: PlanCellRow) {
  let tone = css.rankPlain
  if (r.top) {
    tone = css.rankTop
  }
  return <span className={cssOf(css.rank) + CLS_SEP + cssOf(tone)}>{r.text.rank}</span>
}
