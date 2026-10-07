'use client'
/**
 * 向导的职业步(§3.4 零打字):简历识别出的候选在上,热门职业 chips 在下,
 * 一点即选、再点取消,末尾一句「没有?可跳过」。分类下钻不在这(E11-05b),
 * 搜索兜底是档案表单那边的事 —— 向导只给点得完的选项。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 noc 分支提出成件。
 * 2026-10-03 付费闭环批 A1:访客向导复用本步(guest:不出简历识别那一块);热门职业上面那句引导语与
 * 末尾那句「没有?可跳过」两种模式都删(Frank「禁止这种解释性文字」),词条随之三语删除。
 * 2026-10-04 访客四题改版:访客向导迁 gate 桶、职业题换成自己的大号胶囊(已选标签照借本桶 OnboardingTags),
 * 不再借本步 —— guest 开关随之撤,本步恒出简历识别那一块(首访向导的行为与 A1 之前一致)。
 * 同日收口:撤开关后自家那份 props(ObNocsIn)与 NocStepIn 同形,删掉改用 NocStepIn(职业步三件同一份入参)。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { POPULAR_NOCS } from './constants'
import { makeNocDrop, makeNocPick } from './functions'
import { OnboardingTags } from './onboardingtags'
import { ResumeNocs } from './resumenocs'
import type { NocStepIn } from './types'
import css from './profile.module.css'

/**
 * 职业步的答题区。
 *
 * @param props 职业步真读的几格与取词函数(见 NocStepIn 逐格注释)。
 * @returns 简历候选 + 热门职业 + 已选标签。
 */
export function OnboardingNocs({ p, t }: NocStepIn) {
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
      <div className={css.obRowTight}>{chips}</div>
      <OnboardingTags p={p} t={t} />
    </>
  )
}
