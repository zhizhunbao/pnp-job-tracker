'use client'
/**
 * JD 标题区右端的一行小字:「查看原帖」/「返回整理版」—— 在整理版与原帖正文之间就地切换。
 * 2026-09-19 Frank「中文和韩语场景都自动整理自动翻译吧,这两个都删掉吧」「开关都撤了,就自动翻译」「加一个查看原帖的小字」:
 * 原来这里是 JdSwitches(中文对照开关 + 整理版 / 原文分段钮,09-16 定型):开关撤 —— 中 / 韩界面对照恒显;分段钮撤 ——
 * 默认就是整理版,想核对原帖的点这行小字。位置不变(标题译名同一行的右端;弹框 ActHead、详情页 Job 各挂一处)。
 * 整理版还没回或失败时不出(正文本来就是原帖,无可切)。
 *
 * @author Frank
 * @time 2026-09-19 04:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, JD_DONE } from './constants'
import { origLinkLabelOf } from './functions'
import type { JdOrigLinkIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染「查看原帖 / 返回整理版」小字。
 *
 * @param props JD 身体状态机。
 * @returns 一行小字;正文没取到或没有整理版时不渲。
 */
export function JdOrigLink({ d }: JdOrigLinkIn) {
  if (d.status !== JD_DONE || d.fmt == null) {
    return null
  }
  return (
    <span className={cssOf(css.aiCtl)}>
      <Button kind={BTN_GHOST} onClick={d.onToggleOrig} className={cssOf(css.origLink)}>
        {origLinkLabelOf({ t: d.t, showOrig: d.showOrig })}
      </Button>
    </span>
  )
}
