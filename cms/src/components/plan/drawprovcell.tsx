'use client'
/**
 * plan 域的单元格:抽选表的省份列。列宽写死,省名可截断而灰码永不截 ——
 * 悬停提示给全名,窄屏里也读得出这是哪个省。
 * 2026-08-28 换装批自 Decision.tsx 的 prov 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { DrawCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个抽选表省份格。
 *
 * @param r 这一行展示行。
 * @returns 省份格。
 */
export function DrawProvCell(r: DrawCellRow) {
  return (
    <span title={r.provName} className={css.drawProvCell}>
      <span className={css.provName}>{r.provName}</span>
      <span className={css.provCode}>{r.provCode}</span>
    </span>
  )
}
