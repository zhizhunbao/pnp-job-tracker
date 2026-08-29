'use client'
/**
 * 上传简历自动预填的那一块(E11-07):虚线框里一枚上传钮 + 一句状态提示。
 * 真正的文件框藏着(浏览器自带的长相统一不了),点钮 = 替用户去点它;
 * 解析结果只当预填建议,不静默入库(落格与话术见 hooks 的 useResumePrefill)。
 * props 逐格摊开收,不整块收简历面板 —— 理由挂在 ResumeUploadIn 的 onFileMount 上。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的上传块提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, RESUME_ACCEPT, RESUME_BUSY, RESUME_INPUT_TYPE } from './constants'
import { ResumeHint } from './resumehint'
import type { ResumeUploadIn } from './types'
import css from './profile.module.css'

/**
 * 上传简历块。
 *
 * @param props 解析态、候选条数与三个手柄(见 ResumeUploadIn 逐格注释)。
 * @returns 虚线框里的上传钮与提示。
 */
export function ResumeUpload({ state, count, onFileMount, onPick, onOpen, t }: ResumeUploadIn) {
  return (
    <div className={css.obResumeBox}>
      <input ref={onFileMount}
        type={RESUME_INPUT_TYPE}
        accept={RESUME_ACCEPT}
        onChange={onPick}
        className={css.obFile} />
      <div className={css.obResumeRow}>
        <Button kind={PLAIN_BTN_KIND} onClick={onOpen} disabled={state === RESUME_BUSY} className={cssOf(css.obUpload)}>
          {t('ob.resume.btn')}
        </Button>
        <ResumeHint state={state} count={count} t={t} />
      </div>
    </div>
  )
}
