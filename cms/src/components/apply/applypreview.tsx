'use client'
/**
 * 第 3 步:预览 —— 页面上直接铺信的正文(审查 #14),下面三行:收件人(雇主名;邮箱不出服务端,2026-10-08 小白走查「发给谁」)、
 * 简历文件名、求职信附件名(PDF 链接放次要位置)。
 * 2026-10-08 Frank「再投递之前 有让用户一项一项检查吗」:三行换成逐项检查(收件人 / 简历 / 求职信 / 署名四项逐一打勾,
 * 简历与求职信可打开看),四项全勾「发送」才亮。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { ApplyCheck } from './applycheck'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 3 步。
 *
 * @param props 整机面板。
 * @returns 信的正文与逐项检查。
 */
export function ApplyPreview({ p }: ApplyStepIn) {
  return (
    <>
      <div className={css.h2}>{p.t('ap.preview')}</div>
      <div className={css.body}>{p.letter}</div>
      <ApplyCheck t={p.t} rows={p.checkRows} ticks={p.ticks} onTick={p.onTick} />
    </>
  )
}
