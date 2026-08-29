'use client'
/**
 * verdict 域的结构:一格申请人条件(整格可点,点进那道题)。答过的实线浅底、
 * 没答的虚线待填 —— 一眼看得出还欠哪几题。不匹配的挂一枚琥珀小标
 * (2026-08-14 Frank「加个图标标一下」),不带长句。
 * 2026-08-28 换装批自 ConditionGrid.tsx 的 tile 提出成件
 * (裸 <button> 改经 button 族,两档配色逐格迁 verdict.module.css)。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND, WARN_SIGN } from './constants'
import { makeTileClick, tileClsOf, tileValClsOf } from './functions'
import type { ConditionTileIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一格申请人条件。
 *
 * @param props 这一格与点格手柄(逐格注释见 ConditionTileIn)。
 * @returns 可点的一格。
 */
export function ConditionTile({ row, onTile }: ConditionTileIn) {
  return (
    <Button kind={PLAIN_BTN_KIND}
      className={tileClsOf({ filled: row.filled })}
      onClick={makeTileClick({ onTile, tileKey: row.key })}>
      <div className={css.cgLabel}>
        {row.label}
        {row.warn != null && <span className={css.cgWarn}>{WARN_SIGN}{row.warn}</span>}
      </div>
      <div title={row.value} className={tileValClsOf({ filled: row.filled })}>{row.value}</div>
    </Button>
  )
}
