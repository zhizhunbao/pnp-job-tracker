'use client'
/**
 * 来源组的事实块:来源板 / 发布渠道 / 一手转帖各看各的一行(07-06 用户拍板),
 * 口径注三者共用。`origin`(发布渠道)是**发布渠道**不代表雇主真假 —— 中介已按公司名过滤。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { FIELD_DIRECT, FIELD_ORIGIN, FIELD_SOURCE } from './constants'
import { FactsBox } from './factsbox'
import { directTextOf, originTextOf, sourceTextOf } from './functions'
import type { FieldFactsIn } from './types'

/**
 * 渲染来源字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 那一行。
 */
export function SourceFacts({ field, f }: FieldFactsIn) {
  const t = makeT(f.lang)
  return (
    <FactsBox>
      {field === FIELD_SOURCE && <Row k={t('col.source')}>{sourceTextOf({ job: f.job })}</Row>}
      {field === FIELD_ORIGIN && (
        <Row k={t('col.origin')}>{originTextOf({ t, origin: f.job.origin })}</Row>
      )}
      {field === FIELD_DIRECT && <Row k={t('col.direct')}>{directTextOf({ t, job: f.job })}</Row>}
    </FactsBox>
  )
}
