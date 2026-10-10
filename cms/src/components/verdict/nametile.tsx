'use client'
/**
 * verdict 域的结构:一块名字瓦片(职位名 / 雇主 / 城市 / 省)—— 瓦片外壳与灰标签照事实瓦片 FactTile,
 * 值位放 name 桶的名字两行(英文在上、界面语译名灰字在下)。
 * 2026-10-09 N 批(Frank「名字一律英文在上、译名灰字在下」「省市 分开」「城市 和 省份 点击 跳 google 地图」)
 * 自 FactTile 分出:FactTile 的值是一行字串(带悬停全文),名字两行是组件,装不进字串格。
 *
 * @author Frank
 * @time 2026-10-09 12:00:00
 */
import type { NameTileIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一块名字瓦片。
 *
 * @param props 灰标签与名字两行(逐格注释见 NameTileIn)。
 * @returns 名字瓦片。
 */
export function NameTile({ label, children }: NameTileIn) {
  return (
    <div className={css.tile}>
      <div className={css.tileLabel}>{label}</div>
      <div className={css.nameValue}>{children}</div>
    </div>
  )
}
