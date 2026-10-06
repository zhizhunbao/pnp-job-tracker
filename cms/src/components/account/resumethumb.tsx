'use client'
/**
 * 「我的简历」卡片左边的缩略图:PDF 用 pdf.js 画第一页(画好前只露白纸占位,高度先占住不跳);
 * Word 画不了,出一张带「DOCX」字样的占位纸。
 *
 * @author Frank
 * @time 2026-10-05 22:40:18
 */
import { DOCX_BADGE, MIME_PDF } from './constants'
import { thumbSrcOf } from './functions'
import { useResumeThumb } from './hooks'
import { ResumeCanvas } from './resumecanvas'
import type { ResumeThumbIn } from './types'
import css from './account.module.css'

/**
 * 渲染缩略图。
 *
 * @param props 元信息。
 * @returns 一张纸。
 */
export function ResumeThumb({ meta }: ResumeThumbIn) {
  const th = useResumeThumb({ src: thumbSrcOf(meta) })
  return (
    <div className={css.rfPaper}>
      {meta.mime === MIME_PDF && <ResumeCanvas onMount={th.onCanvasMount} />}
      {meta.mime !== MIME_PDF && <span className={css.rfBadge}>{DOCX_BADGE}</span>}
    </div>
  )
}
