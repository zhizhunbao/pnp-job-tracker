'use client'
/**
 * me 桶子桶 base 的结构:藏起来的文件框(浏览器自带的长相统一不了,由「上传简历 / 选择文件 / 替换文件」钮替用户去点)。
 * 回调逐格摊开收,不整块收面板 —— 带 ref 的元素要住在这种件里,整块收面板会被 React 当成「渲染期间读引用」
 * (先例子桶 resume 的 ResumeInput)。2026-11-12 自子桶 resume 照抄重写,为档案与简历并页
 * (2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { cssOf } from '@/components/css'
import { RESUME_ACCEPT, RESUME_INPUT_TYPE } from './constants'
import type { BaseInputIn } from './types'
import css from './base.module.css'

/**
 * 渲染隐藏文件框。
 *
 * @param props 挂载回调与选好文件的回调。
 * @returns 文件框。
 */
export function BaseInput({ onMount, onPick }: BaseInputIn) {
  return (
    <input ref={onMount}
      type={RESUME_INPUT_TYPE}
      accept={RESUME_ACCEPT}
      onChange={onPick}
      className={cssOf(css.input)} />
  )
}
