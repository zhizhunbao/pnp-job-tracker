'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「薪资」格(绿字半粗,同职位卡);打码行是模糊假字。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染薪资格。
 *
 * @param r 这一行的展示行。
 * @returns 薪资。
 */
export function PayCell(r: ListRow) {
  if (r.locked) {
    return <span aria-hidden className={cssOf(css.blur)}>{r.salary}</span>
  }
  return <span className={cssOf(css.pay)}>{r.salary}</span>
}
