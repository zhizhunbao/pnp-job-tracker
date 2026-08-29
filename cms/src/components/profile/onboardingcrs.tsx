'use client'
/**
 * 向导的快速通道分步:两段式 —— 先问算没算过,算过才出区间档。
 * 切回「没算过」时把分清掉(数据完整性:没算过就不留分,手柄在 functions 的 makeCrsMode);
 * 存的是区间下界,永不把上界当精确分喂给匹配(档表在 constants 的 CRS_OPTS)。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 crs 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { CRS_OPTS } from './constants'
import { crsActive, makeCrsMode } from './functions'
import { OnboardingBuckets } from './onboardingbuckets'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 快速通道分步的答题区。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 算没算过两枚 chip,算过时再加一排区间档。
 */
export function OnboardingCrs({ p, t }: OnboardingStepIn) {
  return (
    <>
      <div className={css.obRow}>
        <Chip onClick={makeCrsMode({ on: false, setCrsCalc: p.setCrsCalc, setCrs: p.setCrs })}
          active={p.crsCalc === false}>
          {t('prof.crsCalc.no')}
        </Chip>
        <Chip onClick={makeCrsMode({ on: true, setCrsCalc: p.setCrsCalc, setCrs: p.setCrs })} active={p.crsCalc}>
          {t('prof.crsCalc.yes')}
        </Chip>
      </div>
      {p.crsCalc && <OnboardingBuckets opts={CRS_OPTS} active={crsActive(p.crs)} onPick={p.setCrs} t={t} />}
    </>
  )
}
