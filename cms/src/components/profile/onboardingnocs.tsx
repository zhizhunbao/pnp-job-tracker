'use client'
/**
 * 向导的职业步(§3.4 零打字):简历识别出的候选在上,热门职业 chips 在下,
 * 一点即选、再点取消,末尾一句「没有?可跳过」。分类下钻不在这(E11-05b),
 * 搜索兜底是档案表单那边的事 —— 向导只给点得完的选项。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 noc 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { POPULAR_NOCS } from './constants'
import { makeNocDrop, makeNocPick } from './functions'
import { OnboardingTags } from './onboardingtags'
import { ResumeNocs } from './resumenocs'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 职业步的答题区。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 简历候选 + 热门职业 + 已选标签。
 */
export function OnboardingNocs({ p, t }: OnboardingStepIn) {
  const chips = []
  for (const one of POPULAR_NOCS) {
    const on = p.nocs.includes(one.noc)
    let pick = makeNocPick({ code: one.noc, nocs: p.nocs, setNocs: p.setNocs })
    if (on) {
      pick = makeNocDrop({ code: one.noc, nocs: p.nocs, setNocs: p.setNocs })
    }
    chips.push(
      <Chip key={one.noc} onClick={pick} active={on}>
        {t(one.key)}
      </Chip>,
    )
  }
  return (
    <>
      <ResumeNocs p={p} t={t} />
      <div className={css.obNote}>{t('prof.jobPopular')}</div>
      <div className={css.obRowTight}>{chips}</div>
      <div className={css.obNocHint}>{t('ob.nocHint')}</div>
      <OnboardingTags p={p} t={t} />
    </>
  )
}
