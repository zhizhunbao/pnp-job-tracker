'use client'
/**
 * gate 域的结构:修改面板顶上的「从简历填写」(2026-11-09「我的」第一批):说明、按钮与一行结果提示(读屏会念)。
 * 2026-11-12 Frank「这种解释性的文字不需要吧」「用户是知道的吧」:说明那句撤,只剩按钮与结果提示。
 * 2026-11-13 Frank「这个按钮放到右边」「放到一行啊」:按钮不再单占一行,并进面板第一格(目标)的标签那一行 ——
 * 标签在左、按钮在右;本件因此包住第一格:标签行、结果提示、下面是那一格的控件。
 * 同日 Frank「这个绿条不需要,但是点击 从简历填写的时候 需要一个进度条」:填上了不再出绿条;读简历要十几到几十秒,
 * 这期间标签行下面出一条来回走的进度条(读不出真实进度,不画百分比),读完就收。出错与「没有可填的内容」照旧出一行。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Notice } from '@/components/notice'
import { FILL_BAR_ROLE, FILL_ROLE, FORM_SECONDARY_KIND, TEXT_NONE } from './constants'
import type { GateResumeFillIn } from './types'
import css from './gate.module.css'

/**
 * 面板第一格,标签那一行右端带「从简历填写」。
 *
 * @param props 面板、取词、这一格的标签与控件。
 * @returns 标签行(标签 + 按钮)、提示与控件。
 */
export function GateResumeFill({ f, t, label, children }: GateResumeFillIn) {
  return (
    <div className={cssOf(css.field)}>
      <div className={cssOf(css.fillRow)}>
        <span className={cssOf(css.fillLabel)}>{label}</span>
        <Button kind={FORM_SECONDARY_KIND} sm onClick={f.onFill} busy={f.busy}>{t('pf.fill')}</Button>
      </div>
      {f.busy && (
        <div className={cssOf(css.fillBar)} role={FILL_BAR_ROLE} aria-label={t('pf.fill')}>
          <span className={cssOf(css.fillBarRun)} />
        </div>
      )}
      <div role={FILL_ROLE}>
        {f.msg.key !== TEXT_NONE && <Notice kind={f.msg.kind}>{t(f.msg.key, { n: f.msg.n })}</Notice>}
      </div>
      {children}
    </div>
  )
}
