'use client'
/**
 * 向导第一步:问现在是什么情况(分型,E11-04)。零打字单选,点同一枚 = 取消;
 * 选完才知道后面问哪几步(分支表在 constants 的 OB_BRANCHES)。
 * 下半块是上传简历自动预填(E11-07),可跳过,解析失败回退手动点选不阻断。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 status 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { STATUS_TABS } from './constants'
import { makeStatusPick } from './functions'
import { ResumeUpload } from './resumeupload'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 分型单选 + 上传简历。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 第一步的答题区。
 */
export function OnboardingStatus({ p, t }: OnboardingStepIn) {
  const chips = []
  for (const s of STATUS_TABS) {
    chips.push(
      <Chip key={s.slug}
        onClick={makeStatusPick({ slug: s.slug, status: p.status, setStatus: p.setStatus })}
        active={p.status === s.slug}>
        {t(s.key)}
      </Chip>,
    )
  }
  return (
    <>
      <div className={css.obRow}>{chips}</div>
      <ResumeUpload state={p.resume.state}
        count={p.resume.candidates.length}
        onFileMount={p.resume.onFileMount}
        onPick={p.resume.onPick}
        onOpen={p.resume.onOpen}
        t={t} />
    </>
  )
}
