'use client'
/**
 * verdict 域的结构:一个条件格网格(三列,手机两列)。共用题、某一组、某个省的面板
 * 都用它 —— 一个网格到底(2026-08-16 Frank「布局也不对」:共用题与省专属题
 * 先前各起一个网格,两段之间断行、列也对不齐)。
 * 2026-08-28 换装批自 ConditionGrid.tsx 的三处重复网格收成一件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { ConditionTile } from './conditiontile'
import type { ConditionTilesIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一个条件格网格。
 *
 * @param props 这个网格里的格子与点格手柄(逐格注释见 ConditionTilesIn)。
 * @returns 网格。
 */
export function ConditionTiles({ rows, onTile }: ConditionTilesIn) {
  const tiles = []
  for (const row of rows) {
    tiles.push(<ConditionTile key={row.key} row={row} onTile={onTile} />)
  }
  return <div className={css.cgGrid}>{tiles}</div>
}
