'use client'
/**
 * 预览弹框里放页的容器(pdf.js 往里逐页追加画布;回调逐格收,理由同 resumeinput.tsx)。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import type { ResumePagesIn } from './types'
import css from './account.module.css'

/**
 * 渲染放页的容器。
 *
 * @param props 挂载回调。
 * @returns 容器。
 */
export function ResumePages({ onMount }: ResumePagesIn) {
  return <div ref={onMount} className={css.rfPages} />
}
