'use client'
/**
 * JD 标题区右端的切换控件:中文对照开关(中 / 韩界面且在看整理版时出)+ 整理版 / 原文分段钮。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「可以」:自 JdAiNote 状态行右端上提到标题区,
 * 与标题译名同一行(弹框 ActHead、详情页 Job 各挂一处,读同一份 JD 身体状态机);
 * 开关在左、分段钮在右(Frank「这样切换的时候 按钮就是稳定的」:切原文时开关收起,分段钮不挪位)。
 * 整理版还没回或失败时不出(正文本来就是原帖,无可切)。
 *
 * @author Frank
 * @time 2026-09-16 21:30:00
 */
import { Button, SegGroup, Switch } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_SEG, JD_DONE, LANG_EN, TRANS_LOADING } from './constants'
import { transLabelOf } from './functions'
import type { JdSwitchesIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染标题区切换控件。
 *
 * @param props JD 身体状态机与界面语言。
 * @returns 控件组;正文没取到或没有整理版时不渲。
 */
export function JdSwitches({ d, lang }: JdSwitchesIn) {
  if (d.status !== JD_DONE || d.fmt == null) {
    return null
  }
  return (
    <span className={cssOf(css.aiCtl)}>
      {lang !== LANG_EN && d.showOrig === false && (
        <Switch on={d.showTrans} label={transLabelOf({ t: d.t, status: d.transStatus })}
          disabled={d.transStatus === TRANS_LOADING} onClick={d.onToggleTrans} />
      )}
      <SegGroup>
        <Button kind={BTN_SEG} active={d.showOrig === false} disabled={d.showOrig === false}
          onClick={d.onToggleOrig}>{d.t('act.fmtTab')}</Button>
        <Button kind={BTN_SEG} active={d.showOrig} disabled={d.showOrig}
          onClick={d.onToggleOrig}>{d.t('act.origTab')}</Button>
      </SegGroup>
    </span>
  )
}
