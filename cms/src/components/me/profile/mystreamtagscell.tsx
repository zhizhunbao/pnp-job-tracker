'use client'
/**
 * me 桶子桶 profile 的结构:「我的通道」表的条件格(2026-10-13):门槛卡卡头那一排条件胶囊原样搬来(字与样式类由 pnp 桶洗好)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import type { MyStreamCellRow } from './types'
import css from './profile.module.css'

/**
 * 渲染条件格。
 *
 * @param r 这一行。
 * @returns 一排胶囊;没有给 null。
 */
export function MyStreamTagsCell(r: MyStreamCellRow) {
  if (r.tags.length === 0) {
    return null
  }
  const out = []
  for (const g of r.tags) {
    out.push(<span key={g.key} className={g.cls}>{g.text}</span>)
  }
  return <span className={cssOf(css.msTags)}>{out}</span>
}
