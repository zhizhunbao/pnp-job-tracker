'use client'
/**
 * 乡村/法语社区试点(RCIP/FCIP)的事实块。E6-11 三态直判:城市在参与社区 = 命中(粗筛),
 * 否则「不在试点社区」。口径红线走卡下的注:试点是社区推荐制且雇主须先被社区**指定**,
 * 命中 ≠ 可走。批B:雇主已获社区指定是强一级信号,只做正向展示 ——
 * false 可能只是名单未公布,不写反话。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { VerdictPill } from '@/components/pnp'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { NOC_HEAD, TEXT_NONE } from './constants'
import { FactsBox } from './factsbox'
import { pilotAreaOf, pilotOccTextOf, pilotPillOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染试点社区事实块。
 *
 * @param props 取数包。
 * @returns 直判行 + 社区行 + 指定雇主行 + 职业清单行。
 */
export function PilotFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const on = f.job.pilot !== TEXT_NONE
  const pill = pilotPillOf({ t, on })
  return (
    <FactsBox note={t('fact.pilotGate')}>
      <Row k={t('fact.verdict')}><VerdictPill tone={pill.tone}>{pill.text}</VerdictPill></Row>
      {on && <Row k={pilotAreaOf({ job: f.job })}>{f.job.pilot}</Row>}
      {on && f.job.pilotEmployer && <Row k={f.job.company}>{t('fact.pilotEmp')}</Row>}
      {on && f.job.pilotOcc !== TEXT_NONE && (
        <Row k={NOC_HEAD + f.job.noc}>{pilotOccTextOf({ t, job: f.job })}</Row>
      )}
    </FactsBox>
  )
}
