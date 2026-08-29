'use client'
/**
 * 简历识别出的职业候选(E11-07):一行引导语 + 一排 chips,前两个上传时已替用户
 * 预选(随手可取消)。chip 面是官方英文类名,后面跟一串灰字码 —— 人话名做主文案,
 * 码当小注。这次没识别出候选就整块不渲。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的候选块提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { makeNocDrop, makeNocPick } from './functions'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 简历候选的一排 chips。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 引导语与候选 chips;这次没候选 = null。
 */
export function ResumeNocs({ p, t }: OnboardingStepIn) {
  if (p.resume.candidates.length === 0) {
    return null
  }
  const chips = []
  for (const one of p.resume.candidates) {
    const on = p.nocs.includes(one.noc)
    let pick = makeNocPick({ code: one.noc, nocs: p.nocs, setNocs: p.setNocs })
    if (on) {
      pick = makeNocDrop({ code: one.noc, nocs: p.nocs, setNocs: p.setNocs })
    }
    let shown = one.title
    if (shown === '') {
      shown = one.noc
    }
    chips.push(
      <Chip key={one.noc} onClick={pick} active={on}>
        {shown} <span className={css.obCode}>{one.noc}</span>
      </Chip>,
    )
  }
  return (
    <>
      <div className={css.obFrom}>{t('ob.resume.from')}</div>
      <div className={css.obRowTight}>{chips}</div>
    </>
  )
}
