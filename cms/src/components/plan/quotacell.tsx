'use client'
/**
 * plan 域的单元格:竞争表的名额列。名额年度**逐省不同**(ON/BC/AB/SK/MB/NS 2026、
 * NB/NL/PE 2025)—— 现行视图把年度当灰字小注留在行内,年份视图切到该年就不再重复
 * (那一列会得到一整列同一个值)。
 * 2026-08-28 换装批自 Decision.tsx 的 quota 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { TEXT_NONE } from './constants'
import type { CompCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个名额格。
 *
 * @param r 这一行展示行。
 * @returns 名额与年度灰注,或者灰横杠。
 */
export function QuotaCell(r: CompCellRow) {
  if (r.quota === TEXT_NONE) {
    return <DashText />
  }
  return (
    <span>
      {r.quota}
      {r.quotaNote !== TEXT_NONE && <span className={css.quotaNote}>{r.quotaNote}</span>}
    </span>
  )
}
