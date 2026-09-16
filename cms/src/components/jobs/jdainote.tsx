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
 * 2026-09-16 同日再改(Frank「这个按钮放到一起」「按钮样式改成像之前的一样」「再加个隐藏翻译的按钮,格式和最早版本的一样」):
 * 上一条「行尾切换钮」作废 —— 按 81f05213 之前的原件照抄:「看原文 / 看整理版」回到紧挨状态字的纯文链(ghost + aiBtn);
 * 中 / 韩界面看整理版时同行再出中文对照钮,形照撤掉的 jdacts.tsx 原件(ghost + 全站白底胶囊 PILL_CLS,在译禁用加 pillBusy,
 * 钮面走 transLabelOf:显示 / 隐藏对照 / 翻译中 / 失败),只是从独立钮行挪进本行放到一起。行尾两端排版的 aiNoteRow 类撤。
 * 2026-09-16 同日三改(Frank「这两个格式改成一样的」):「看原文 / 看整理版」由纯文链改走对照钮同一形(ghost + 白底胶囊 PILL_CLS),
 * 两颗并排同形;上一条「回到纯文链」作废。重试钮仍是文链(失败态单独一颗,不与胶囊并排)。
 * 2026-09-16 同日四改(Frank「要蓝字的那个版本的」):上一条作废,方向反过来 —— 两颗都走**蓝字文链**(ghost + aiBtn,同重试钮),
 * 中文对照钮也不再用白底胶囊;同形仍成立,只是统一到文链。aiPill 类随之撤。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import {
  BTN_GHOST, FMT_FAIL, FMT_NOTEXT, FMT_QUOTA, LANG_EN, SPARKLE, TRANS_LOADING,
} from './constants'
import { aiNoteTextOf, origToggleLabelOf, transBusyClsOf, transLabelOf } from './functions'
import type { JdAiNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染整理版状态行。
 *
 * @param props JD 身体状态机、「是不是匿名」与界面语言。
 * @returns 一行灰注(整理好时紧跟切换文链,中 / 韩界面再带对照胶囊);无正文那一档什么都不渲。
 */
export function JdAiNote({ d, anon, lang }: JdAiNoteIn) {
  if (d.fmt === null && d.fmtWhy === FMT_NOTEXT) {
    return null
  }
  return (
    <div className={cssOf(css.aiNote)} title={d.t('act.aiNote')}>
      {SPARKLE}{aiNoteTextOf({ t: d.t, fmt: d.fmt, why: d.fmtWhy })}
      {d.fmt != null && (
        <Button kind={BTN_GHOST} onClick={d.onToggleOrig} className={cssOf(css.aiBtn)}>
          {origToggleLabelOf({ t: d.t, showOrig: d.showOrig })}
        </Button>
      )}
      {lang !== LANG_EN && d.fmt != null && d.showOrig === false && (
        <Button kind={BTN_GHOST} disabled={d.transStatus === TRANS_LOADING} onClick={d.onToggleTrans}
          className={`${cssOf(css.aiBtn)} ${transBusyClsOf(d.transStatus)}`}>
          {transLabelOf({ t: d.t, status: d.transStatus, shown: d.showTrans })}
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
