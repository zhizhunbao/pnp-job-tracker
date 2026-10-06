'use client'
/**
 * 「我的简历」缩略图的画布(pdf.js 往里画 PDF 第一页)。回调逐格收,理由同 resumeinput.tsx。
 *
 * @author Frank
 * @time 2026-10-05 22:48:33
 */
import type { ResumeCanvasIn } from './types'
import css from './account.module.css'

/**
 * 渲染画布。
 *
 * @param props 挂载回调。
 * @returns 画布。
 */
export function ResumeCanvas({ onMount }: ResumeCanvasIn) {
  return <canvas ref={onMount} className={css.rfCanvas} />
}
