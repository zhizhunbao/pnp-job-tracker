'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「公司」格 —— 英文公司名(点了叠开公司框)+ 界面语译名灰字。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行撤,模糊假字那一支跟着撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
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
