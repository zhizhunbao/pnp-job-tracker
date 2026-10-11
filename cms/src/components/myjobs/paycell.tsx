'use client'
/**
 * 域内哑单元格:「薪资」格 —— 绿字,同职位板(2026-10-10 批 2,三张清单网页端表格形;手机卡 MjCard 也摆它)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染薪资格。
 *
 * @param r 这一行的展示行。
 * @returns 薪资。
 */
export function PayCell(r: ListRow) {
  return <span className={css.pay}>{r.salary}</span>
}
