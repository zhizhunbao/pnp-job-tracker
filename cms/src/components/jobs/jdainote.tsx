'use client'
/**
 * 整理版状态行:整理好了(可一键切原文)/ 整理中 / 失败(按由头分说)。
 * fmt = null 时按 fmtWhy 分说 —— 额度用完(重试无用,不给钮)/ 生成失败(可重试);
 * 无正文不出失败行(空态自己解释)。Frank 走查#20:额度用完时,匿名用户补一句登录提额说明
 * (登录态额度更高;登录入口在页头)。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, FMT_FAIL, FMT_NOTEXT, FMT_QUOTA, SPARKLE } from './constants'
import { aiNoteTextOf, origLabelOf } from './functions'
import type { JdAiNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染整理版状态行。
 *
 * @param props JD 身体状态机与「是不是匿名」。
 * @returns 一行灰注;无正文那一档什么都不渲。
 */
export function JdAiNote({ d, anon }: JdAiNoteIn) {
  if (d.fmt === null && d.fmtWhy === FMT_NOTEXT) {
    return null
  }
  return (
    <div className={cssOf(css.aiNote)} title={d.t('act.aiNote')}>
      {SPARKLE}{aiNoteTextOf({ t: d.t, fmt: d.fmt, why: d.fmtWhy })}
      {d.fmt != null && (
        <Button kind={BTN_GHOST} onClick={d.onToggleOrig} className={cssOf(css.aiBtn)}>
          {origLabelOf({ t: d.t, showOrig: d.showOrig })}
        </Button>
      )}
      {d.fmt === null && d.fmtWhy === FMT_FAIL && (
        <Button kind={BTN_GHOST} onClick={d.onRetryFmt} className={cssOf(css.aiBtn)}>{d.t('ai.retry')}</Button>
      )}
      {d.fmt === null && d.fmtWhy === FMT_QUOTA && anon && (
        <span className={cssOf(css.quotaLogin)}>{d.t('act.aiQuotaLogin')}</span>
      )}
    </div>
  )
}
