'use client'
/**
 * 筛选区:输入行 + 折叠区 + 已选行三段。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 已选行的显隐 2026-08-29 由 anyFilter 换成 showPicked:「清除筛选」搬回输入行后,
 * 这一行可能一件都不剩,而空 div 照样吃掉 .filters 的 8px gap。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { FilterRow } from './filterrow'
import { FoldFilters } from './foldfilters'
import { PickedRow } from './pickedrow'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染筛选区。
 *
 * @param props 职位板整台状态机。
 * @returns 三段筛选。
 */
export function BoardFilters({ b }: BoardPanelIn) {
  return (
    <div className={cssOf(css.filters)}>
      <FilterRow b={b} />
      {b.filters.fold && <FoldFilters b={b} />}
      {b.filters.showPicked && <PickedRow b={b} />}
    </div>
  )
}
