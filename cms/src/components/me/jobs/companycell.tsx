'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「公司」格 —— 英文公司名(点了叠开公司框)+ 界面语译名灰字;打码行是模糊假字。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { CompanyName } from '@/components/name'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染公司格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名。
 */
export function CompanyCell(r: ListRow) {
  if (r.locked) {
    return <span aria-hidden className={cssOf(css.blur)}>{r.company}</span>
  }
  return <CompanyName name={r.company} slug={r.companySlug} zh={r.companyZh} ko={r.companyKo} />
}
