'use client'
/**
 * 域内哑单元格:「截止日期」格(jobs.validThrough;Job Bank 帖多为空;2026-10-10 批 2,三张清单网页端表格形)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import type { ListRow } from './types'

/**
 * 渲染截止日期格。
 *
 * @param r 这一行的展示行。
 * @returns 年-月-日。
 */
export function DeadlineCell(r: ListRow) {
  return r.deadline
}
