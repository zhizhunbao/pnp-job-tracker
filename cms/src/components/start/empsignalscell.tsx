'use client'
/**
 * 域内哑单元格:担保信号胶囊(紧缺清单命中 / AIP 指定 / 技能 LMIA n),一粒一枚。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染信号格。
 *
 * @param r 这一行。
 * @returns 胶囊组。
 */
export function EmpSignalsCell(r: EmpCellRow) {
  const items = []
  for (const s of r.signals) {
    items.push(<span key={s} className={css.chipGray}>{s}</span>)
  }
  return <span className={css.pills}>{items}</span>
}
