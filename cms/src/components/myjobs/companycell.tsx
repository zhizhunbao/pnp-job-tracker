'use client'
/**
 * 域内哑单元格:「公司」格 —— 英文公司名(有公司页的点了开公司框)+ 界面语译名灰字
 * (2026-10-10 批 2,三张清单网页端表格形,照雇主板列构造样张;手机卡 MjCard 也摆它)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { CompanyName } from '@/components/name'
import type { ListRow } from './types'

/**
 * 渲染公司格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名。
 */
export function CompanyCell(r: ListRow) {
  return <CompanyName name={r.company} slug={r.companySlug} zh={r.companyZh} ko={r.companyKo} />
}
