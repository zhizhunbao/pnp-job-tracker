'use client'
/**
 * 第 1 步「添加简历」背后那个隐藏的文件框(照「我的简历」的 ResumeInput:挂上就把节点交出去,由钮代点)。
 * 2026-10-10 投递框三步:「上传求职信」也用它,收哪些文件由调用方给。
 *
 * @author Frank
 * @time 2026-10-07 07:00:00
 */
import { INPUT_FILE } from './constants'
import type { ApplyFileInputIn } from './types'
import css from './apply.module.css'

/**
 * 隐藏的文件框。
 *
 * @param props 挂上 / 卸下回调、选好文件的回调与收哪些文件。
 * @returns 文件框。
 */
export function ApplyFileInput({ onMount, onPick, accept }: ApplyFileInputIn) {
  return <input ref={onMount} type={INPUT_FILE} accept={accept} onChange={onPick} className={css.hidden} />
}
