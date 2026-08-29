'use client'
/**
 * 向导的目标省步:多选,再点取消(手柄在 functions 的 makeProvToggle)。
 * chip 面是省全名三语(#58 零黑话),存的仍是两字码;魁省走自己的体系,不进这张表。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 prov 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { PROV_TABS } from './constants'
import { makeProvToggle } from './functions'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 目标省的一排 chips。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 一排目标省 chips。
 */
export function OnboardingProvs({ p, t }: OnboardingStepIn) {
  const chips = []
  for (const one of PROV_TABS) {
    chips.push(
      <Chip key={one.prov}
        onClick={makeProvToggle({ prov: one.prov, provs: p.provs, setProvs: p.setProvs })}
        active={p.provs.includes(one.prov)}>
        {t(one.key)}
      </Chip>,
    )
  }
  return <div className={css.obRow}>{chips}</div>
}
