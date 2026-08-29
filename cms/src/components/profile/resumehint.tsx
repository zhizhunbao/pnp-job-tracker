'use client'
/**
 * 上传钮右边那句状态提示:还没传时是格式说明,解析成了转绿(识别到几个职业方向),
 * 三种失败转琥珀(次数用完 / 读不到文字 / 别的)—— 失败是提醒不是报错,
 * 后面还能手动点选,所以不用红。话术在 functions 的 obResumeHintOf。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内那串嵌套三目提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { RESUME_DONE, RESUME_FAIL, RESUME_LIMIT, RESUME_SCAN } from './constants'
import { obResumeHintOf } from './functions'
import type { ResumeHintIn } from './types'
import css from './profile.module.css'

/**
 * 解析状态提示。
 *
 * @param props 解析态、识别到几个方向与取词函数(见 ResumeHintIn 逐格注释)。
 * @returns 一句灰字(成了转绿、挂了转琥珀)。
 */
export function ResumeHint({ state, count, t }: ResumeHintIn) {
  const text = obResumeHintOf({ state, count, t })
  if (state === RESUME_DONE) {
    return <span className={css.obHintOk}>{text}</span>
  }
  if (state === RESUME_SCAN || state === RESUME_LIMIT || state === RESUME_FAIL) {
    return <span className={css.obHintWarn}>{text}</span>
  }
  return <span className={css.obHint}>{text}</span>
}
