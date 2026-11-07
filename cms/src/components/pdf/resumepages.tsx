'use client'
/**
 * 放页的容器(pdf.js 往里逐页追加画布;回调逐格收,理由同 me 桶 resume 的 resumeinput.tsx)。
 * 「我的简历」预览弹框与投递框的首页预览共用。2026-11-07 自 account 桶在新域重写,props 同原件。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import type { ResumePagesIn } from './types'
import css from './pdf.module.css'

/**
 * 渲染放页的容器。
 *
 * @param props 挂载回调。
 * @returns 容器。
 */
export function ResumePages({ onMount }: ResumePagesIn) {
  return <div ref={onMount} className={cssOf(css.pages)} />
}
