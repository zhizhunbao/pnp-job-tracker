'use client'
/**
 * 域内哑单元格:「收藏于」格(2026-10-10 批 2,我的收藏网页端表格)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import type { ListRow } from './types'

/**
 * 渲染收藏于格。
 *
 * @param r 这一行的展示行。
 * @returns 年-月-日。
 */
export function SavedOnCell(r: ListRow) {
  return r.savedOn
}
