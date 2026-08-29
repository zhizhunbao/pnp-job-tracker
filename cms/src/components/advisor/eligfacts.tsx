'use client'
/**
 * 担保红旗的事实块(GAP1③):红旗 + JD 命中原句(可核验,原句照抄不转述)。
 * 「—」的口径 = **未检出**,不等于保证担保 —— 这条写在卡下的口径注里。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { QUOTE_CLOSE, QUOTE_OPEN, TEXT_NONE } from './constants'
import { FactsBox } from './factsbox'
import { eligTextOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染担保红旗事实块。
 *
 * @param props 取数包。
 * @returns 红旗行 + 原句行。
 */
export function EligFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  return (
    <FactsBox note={t('fact.eligNote')}>
      <Row k={t('fact.elig')}>{eligTextOf({ t, job: f.job })}</Row>
      {f.job.eligibilityQuote !== TEXT_NONE && (
        <Row k={t('fact.eligQuote')}>{QUOTE_OPEN}{f.job.eligibilityQuote}{QUOTE_CLOSE}</Row>
      )}
    </FactsBox>
  )
}
