'use client'
/**
 * vs 中位卡:ESDC 中位一行 + 高/低直判药丸。ESDC 一个中位都没有时卡下说清
 * 「没有中位可比」—— 不解释就成了「我们算不出来」。
 * 2026-08-28 换装批自 Advisor.tsx 的薪资分支重写成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { VerdictPill } from '@/components/pnp'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { FactsBox } from './factsbox'
import { medianNoteOf, medianTextOf, vsPillOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染 vs 中位卡。
 *
 * @param props 取数包。
 * @returns 中位行 + 直判行。
 */
export function VsMedian({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const pill = vsPillOf({ t, job: f.job })
  let verdict = null
  if (pill != null) {
    verdict = <VerdictPill tone={pill.tone}>{pill.text}</VerdictPill>
  }
  return (
    <FactsBox note={medianNoteOf({ t, job: f.job })}>
      <Row k={t('sal.esdcMed')}>{medianTextOf({ job: f.job })}</Row>
      <Row k={t('fact.verdict')}>{verdict}</Row>
    </FactsBox>
  )
}
