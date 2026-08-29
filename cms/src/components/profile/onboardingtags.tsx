'use client'
/**
 * 向导里已选职业的回显标签(职业步专有):一枚标签 = 人话职业名 + × 摘除钮。
 * 热门 chips 与简历候选都能选出码,回显在一处才数得清自己选了几个。没选就整块不渲。
 * 长相与档案表单的标签同一套类(.tagPill / .tagDel),只有行距是向导自己的。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的回显段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DEL_MARK, PLAIN_BTN_KIND } from './constants'
import { makeNocDrop, obNocLabelOf } from './functions'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 已选职业的标签一行。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 标签一行;没选 = null。
 */
export function OnboardingTags({ p, t }: OnboardingStepIn) {
  if (p.nocs.length === 0) {
    return null
  }
  const tags = []
  for (const code of p.nocs) {
    tags.push(
      <span key={code} className={css.tagPill}>
        {obNocLabelOf({ code, candidates: p.resume.candidates, t })}
        <Button kind={PLAIN_BTN_KIND}
          onClick={makeNocDrop({ code, nocs: p.nocs, setNocs: p.setNocs })}
          className={cssOf(css.tagDel)}>
          {DEL_MARK}
        </Button>
      </span>,
    )
  }
  return <div className={css.obTagRow}>{tags}</div>
}
