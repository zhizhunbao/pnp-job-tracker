'use client'
/**
 * table 域的表头排序标记:当前列显方向箭头,可排未排的列显灰提示,不可排的列不显。
 * 2026-08-24 二筛自 table.tsx 拆出(原是一串嵌套三目)。
 *
 * @author Frank
 * @time 2026-08-24 11:00:00
 */
import { MARK_ASC, MARK_DESC, MARK_HINT } from './constants'
import type { SortMarkIn } from './types'
import css from './table.module.css'

/**
 * 排序标记。
 *
 * @param props 是否当前列/方向/可否排序。
 * @returns 标记,或 null(不可排序)。
 */
export function SortMark({ active, dir, sortable }: SortMarkIn) {
  if (active) {
    if (dir === -1) {
      return <>{MARK_DESC}</>
    }
    return <>{MARK_ASC}</>
  }
  if (sortable) {
    return <span className={css.sortHint}>{MARK_HINT}</span>
  }
  return null
}
