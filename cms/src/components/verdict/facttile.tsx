'use client'
/**
 * verdict 域的结构:一块事实瓦片(职位名/雇主/城市/省/职业代码/职业层级)。
 * 与判定瓦片同族,只是不配状态色;解剖与它**逐值相同**
 * (2026-08-14 Frank「英文和中文一行也没对齐」——先前内边距/字号/行高各差一点,
 * 同一行里事实瓦片与判定瓦片基线错位)。灰字小注的形态照判定瓦片,一字不改。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的 FactTile 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { TEXT_NONE } from './constants'
import type { FactTileIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一块事实瓦片。
 *
 * @param props 灰标签、值与灰注(逐格注释见 FactTileIn)。
 * @returns 事实瓦片。
 */
export function FactTile({ label, value, sub }: FactTileIn) {
  return (
    <div className={css.tile}>
      <div className={css.tileLabel}>{label}</div>
      <div title={value} className={css.factValue}>{value}</div>
      {sub !== TEXT_NONE && <div className={css.factSub}>{sub}</div>}
    </div>
  )
}
