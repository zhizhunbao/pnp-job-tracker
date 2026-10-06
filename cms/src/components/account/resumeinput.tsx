'use client'
/**
 * 「我的简历」藏起来的文件框(浏览器自带的长相统一不了,由「选择文件 / 替换文件」钮替用户去点)。
 * 回调逐格摊开收,不整块收面板 —— 带 ref 的元素要住在这种件里,整块收面板会被 React 当成「渲染期间读引用」
 * (先例 profile/resumeupload.tsx 与它的 ResumeUploadIn.onFileMount)。
 *
 * @author Frank
 * @time 2026-10-05 22:48:33
 */
import { RESUME_ACCEPT, RESUME_INPUT_TYPE } from './constants'
import type { ResumeInputIn } from './types'
import css from './account.module.css'

/**
 * 渲染隐藏文件框。
 *
 * @param props 挂载回调与选好文件的回调。
 * @returns 文件框。
 */
export function ResumeInput({ onMount, onPick }: ResumeInputIn) {
  return (
    <input ref={onMount}
      type={RESUME_INPUT_TYPE}
      accept={RESUME_ACCEPT}
      onChange={onPick}
      className={css.rfInput} />
  )
}
