'use client'
/**
 * 首访引导向导的题目分派:当前停在哪一步,就渲哪一步的答题区。
 * 英语与工签两步的形状一样(区间单选),共用 OnboardingBuckets,差的只是档表与落格。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 body 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { CLB_OPTS, OB_STEP_CLB, OB_STEP_CRS, OB_STEP_NOC, OB_STEP_PROV, OB_STEP_STATUS, PGWP_OPTS } from './constants'
import { clbActive, pgwpActive } from './functions'
import { OnboardingBuckets } from './onboardingbuckets'
import { OnboardingCrs } from './onboardingcrs'
import { OnboardingNocs } from './onboardingnocs'
import { OnboardingProvs } from './onboardingprovs'
import { OnboardingStatus } from './onboardingstatus'
import type { OnboardingStepIn } from './types'

/**
 * 当前这一步的答题区。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 这一步的答题区;走到最后一路 = 工签步。
 */
export function OnboardingSteps({ p, t }: OnboardingStepIn) {
  if (p.cur === OB_STEP_STATUS) {
    return <OnboardingStatus p={p} t={t} />
  }
  if (p.cur === OB_STEP_NOC) {
    return <OnboardingNocs p={p} t={t} />
  }
  if (p.cur === OB_STEP_CLB) {
    return <OnboardingBuckets opts={CLB_OPTS} active={clbActive(p.clb)} onPick={p.setClb} t={t} />
  }
  if (p.cur === OB_STEP_CRS) {
    return <OnboardingCrs p={p} t={t} />
  }
  if (p.cur === OB_STEP_PROV) {
    return <OnboardingProvs p={p} t={t} />
  }
  return <OnboardingBuckets opts={PGWP_OPTS} active={pgwpActive(p.pgwp)} onPick={p.setPgwp} t={t} />
}
