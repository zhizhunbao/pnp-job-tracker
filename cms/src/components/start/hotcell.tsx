'use client'
/**
 * 职业榜「紧缺」列的单元格(Frank 2026-08-08 走查连拍:列名「紧缺清单省份」→「紧缺」,
 * 值胶囊化 —— 省紧缺具体到省码「MB 紧缺」(多省多胶囊)+ 联邦紧缺单独一粒,
 * 省紧缺绿 / 联邦青,与通道档同色系)。多胶囊允许折行。
 * 2026-08-28 换装批自 Pulse.tsx 的 hotPills 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { OccCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染职业榜「紧缺」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 胶囊排;一粒都没有时是灰色的「无」。
 */
export function HotCell(r: OccCellRow) {
  if (r.hotPills.length === 0) {
    return <span className={css.dim}>{r.hotNoneText}</span>
  }
  const pills = []
  for (const p of r.hotPills) {
    pills.push(<span key={p.key} className={p.cls}>{p.text}</span>)
  }
  return <span className={css.pills}>{pills}</span>
}
