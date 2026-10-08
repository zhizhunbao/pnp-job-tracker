'use client'
/**
 * 第 3 步:预览 —— 页面上直接铺信的正文(审查 #14),下面三行:收件人(雇主名;邮箱不出服务端,2026-10-08 小白走查「发给谁」)、
 * 简历文件名、求职信附件名(PDF 链接放次要位置)。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { LinkButton } from '@/components/button'
import { TARGET_BLANK } from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 3 步。
 *
 * @param props 整机面板。
 * @returns 信的正文与附件两行。
 */
export function ApplyPreview({ p }: ApplyStepIn) {
  return (
    <>
      <div className={css.h2}>{p.t('ap.preview')}</div>
      <div className={css.body}>{p.letter}</div>
      <div className={css.files}>
        <div className={css.fileRow}>
          <span className={css.fileLabel}>{p.t('ap.to')}</span>
          <span>{p.job.company}</span>
        </div>
        <div className={css.fileRow}>
          <span className={css.fileLabel}>{p.t('ap.resume')}</span>
          <span>{p.resumeName}</span>
        </div>
        <div className={css.fileRow}>
          <span className={css.fileLabel}>{p.t('ap.letter')}</span>
          <span>{p.coverFile}</span>
          <LinkButton href={p.coverHref} target={TARGET_BLANK}>
            {p.t('ap.pdf')}
          </LinkButton>
        </div>
      </div>
    </>
  )
}
