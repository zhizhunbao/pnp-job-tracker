'use client'
/**
 * 域内哑单元格:「为什么推荐」/「状态」格 —— 一排胶囊(理由 / 投递状态;2026-10-10 批 2)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
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
