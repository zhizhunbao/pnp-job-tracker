'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「薪资」格(绿字半粗,同职位卡)。
 * 2026-11-07 Frank「现在都按 Azure 的来」:薪资改正文色(半粗照旧);打码行撤,模糊假字那一支跟着撤。
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
  return <span className={cssOf(css.pay)}>{r.salary}</span>
}
