'use client'
/**
 * 域内哑单元格:「投递于」格(只有发出去的行有;2026-10-10 批 2,我的投递网页端表格)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import type { ListRow } from './types'

/**
 * 渲染投递于格。
 *
 * @param r 这一行的展示行。
 * @returns 年-月-日。
 */
export function AppliedOnCell(r: ListRow) {
  return r.appliedOn
}
