'use client'
/**
 * 帖面薪资卡:雇主自己写的原文 + 数据层折算的年薪(前端只显示不换算,04d 单一口径)。
 * 2026-08-28 换装批自 Advisor.tsx 的薪资分支重写成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { FactsBox } from './factsbox'
import { postedSalaryTextOf, yearTextOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染帖面薪资卡。
 *
 * @param props 取数包。
 * @returns 原文行 + 折算年薪行。
 */
export function PostedSalary({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  return (
    <FactsBox>
      <Row k={t('col.salary')}>{postedSalaryTextOf({ job: f.job })}</Row>
      <Row k={<span title={t('fact.salYrNote')}>{t('col.salaryYr')}</span>}>{yearTextOf(f.job.salaryAnnual)}</Row>
    </FactsBox>
  )
}
