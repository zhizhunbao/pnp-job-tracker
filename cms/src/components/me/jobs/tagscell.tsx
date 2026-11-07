'use client'
/**
 * me 桶子桶 jobs 的哑单元格:胶囊格(今日推荐「推荐原因」、收藏 / 投递「状态」)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { TagList } from './taglist'
import type { ListRow } from './types'

/**
 * 渲染胶囊格。
 *
 * @param r 这一行的展示行。
 * @returns 一排胶囊。
 */
export function TagsCell(r: ListRow) {
  return <TagList tags={r.tags} />
}
