'use client'
/**
 * 大西洋试点(AIP)的事实块。批A #134 三态直判(空壳修)—— 未命中也要说,是结论不是空;
 * 名单来源注删(Frank「名单来源也不需要」)。命中清单放开跨省(原限本省):
 * 同雇主在其他大西洋省上榜 = 更强信号,一并列出。
 * E6-09:省里逐条点名「这些职业的 AIP 背书不受理」—— 与雇主是否指定雇主是两件事,两条都要说。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { aipBlockOf, aipVerdictOf, VerdictPill } from '@/components/pnp'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { streamDisplay } from '@/lib/jobs'
import { FactsBox } from './factsbox'
import { aipBlockedNameOf, aipMatchTextOf, aipMatchesOf, aipPillOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染 AIP 事实块。
 *
 * @param props 取数包。
 * @returns 直判行 + 省里点名行 + 命中雇主行。
 */
export function AipFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const blocked = aipBlockOf(f.job, f.pnpOcc)
  const pill = aipPillOf({ t, verdict: aipVerdictOf(f.job), blocked: blocked != null })
  const hits = []
  for (const e of aipMatchesOf({ job: f.job, desigEmp: f.desigEmp })) {
    hits.push(<Row key={e.name + e.province + e.location} k={e.name}>{aipMatchTextOf({ t, emp: e })}</Row>)
  }
  return (
    <FactsBox>
      <Row k={t('fact.verdict')}><VerdictPill tone={pill.tone}>{pill.text}</VerdictPill></Row>
      {blocked != null && (
        <Row k={streamDisplay({ t, label: blocked.label })}>
          {t('fact.aipBlockedHit', {
            name: aipBlockedNameOf({ occupations: blocked.occupations, noc: f.job.noc }),
            noc: f.job.noc,
          })}
        </Row>
      )}
      {hits}
    </FactsBox>
  )
}
