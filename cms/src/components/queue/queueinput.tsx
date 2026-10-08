'use client'
/**
 * 设置清单里藏起来的文件框(由「上传」钮替用户去点)。回调逐格摊开收,不整块收面板 —— 带 ref 的元素要住在这种件里,
 * 整块收面板会被 React 当成「渲染期间读引用」(先例 account/resumeinput.tsx)。
 *
 * @author Frank
 * @time 2026-10-08 20:00:00
 */
import { INPUT_FILE, RESUME_ACCEPT } from './constants'
import type { QueueInputIn } from './types'
import css from './queue.module.css'

/**
 * 渲染隐藏文件框。
 *
 * @param props 挂载回调与选好文件的回调。
 * @returns 文件框。
 */
export function QueueInput({ onMount, onPick }: QueueInputIn) {
  return <input ref={onMount} type={INPUT_FILE} accept={RESUME_ACCEPT} onChange={onPick} className={css.file} />
}
