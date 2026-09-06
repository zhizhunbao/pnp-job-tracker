'use client'
/**
 * 域内哑单元格:AIP 表「省份」格 —— 该雇主 AIP 岗所在的大西洋省(胶囊,省全名;2026-09-05 Frank 拍板加列,
 * 此前表里没有省,四省制度的雇主看不出在哪省)。胶囊已在洗行时拼好,这里只渲。
 *
 * @author Frank
 * @time 2026-09-05 22:40:00
 */
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染省份格。
 *
 * @param r 这一行。
 * @returns 胶囊组。
 */
export function EmpProvCell(r: EmpCellRow) {
  const pills = []
  for (const p of r.provPills) {
    pills.push(<span key={p.key} className={p.cls}>{p.text}</span>)
  }
  return <span className={css.pills}>{pills}</span>
}
