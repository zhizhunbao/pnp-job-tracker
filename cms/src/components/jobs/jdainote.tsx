'use client'
/**
 * 整理版状态行:整理好了(可一键切原文)/ 整理中 / 失败(按由头分说)。
 * fmt = null 时按 fmtWhy 分说 —— 额度用完(重试无用,不给钮)/ 生成失败(可重试);
 * 无正文不出失败行(空态自己解释)。Frank 走查#20:额度用完时,匿名用户补一句登录提额说明
 * (登录态额度更高;登录入口在页头)。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 * 2026-09-14 Frank「这个删掉」:「看原文 ▾」切换钮撤(整理版即正文,原文不再给切)。
 * 2026-09-14 Frank「这个不要显示」「加一个 loading」:整理版就绪后的「✨ AI 整理」一行不出,在途态改由 JdContent 的转圈行出,
 * 本行只剩失败 / 额度两态。
 * 2026-09-16 改判(Frank「还是像之前一样,加一个 AI 整理中,先看原文这种」「可以,就这样做」):上面两条 09-14 作废 ——
 * 转圈撤了(整理中铺原帖、对照在译铺英文整理版),本行四态全回来:整理中「✨ AI 整理中…」/ 整理好「✨ AI 整理」+ 行尾切换钮
 * 「看原文 / 看整理版」/ 失败(可重试)/ 额度用完。切换钮自正文区右上角挪进本行行尾:状态与操作同一行,弹框与详情页同一副样子,
 * 不挤窗口钮与返回钮。效果图里行内的「只搬运原帖信息,未添加」没进正文:禁「·」杂糅、解释类默认删(它仍挂在本行的悬停 title 上)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, BTN_SECONDARY, FMT_FAIL, FMT_NOTEXT, FMT_QUOTA, SPARKLE } from './constants'
import { aiNoteTextOf, origToggleLabelOf } from './functions'
import type { JdAiNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染整理版状态行。
 *
 * @param props JD 身体状态机与「是不是匿名」。
 * @returns 一行灰注(整理好时行尾带切换钮);无正文那一档什么都不渲。
 */
export function JdAiNote({ d, anon }: JdAiNoteIn) {
  if (d.fmt === null && d.fmtWhy === FMT_NOTEXT) {
    return null
  }
  return (
    <div className={`${cssOf(css.aiNote)} ${cssOf(css.aiNoteRow)}`} title={d.t('act.aiNote')}>
      <span>
        {SPARKLE}{aiNoteTextOf({ t: d.t, fmt: d.fmt, why: d.fmtWhy })}
        {d.fmt === null && d.fmtWhy === FMT_FAIL && (
          <Button kind={BTN_GHOST} onClick={d.onRetryFmt} className={cssOf(css.aiBtn)}>{d.t('ai.retry')}</Button>
        )}
        {d.fmt === null && d.fmtWhy === FMT_QUOTA && anon && (
          <span className={cssOf(css.quotaLogin)}>{d.t('act.aiQuotaLogin')}</span>
        )}
      </span>
      {d.fmt != null && (
        <Button kind={BTN_SECONDARY} sm onClick={d.onToggleOrig}>
          {origToggleLabelOf({ t: d.t, showOrig: d.showOrig })}
        </Button>
      )}
    </div>
  )
}
