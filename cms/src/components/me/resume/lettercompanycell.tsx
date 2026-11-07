'use client'
/**
 * me 桶子桶 resume 的哑单元格:求职信表的公司格(name 桶现成件;求职信清单不带公司 slug 与译名,暂为黑字一行 ——
 * 2026-10-09 N6 批起的口径,数据口补上再接)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { CompanyName } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { LetterCellRow } from './types'

/**
 * 公司格。
 *
 * @param r 展示行。
 * @returns 公司名。
 */
export function LetterCompanyCell(r: LetterCellRow) {
  return <CompanyName name={r.company} slug={TEXT_NONE} zh={TEXT_NONE} ko={TEXT_NONE} />
}
