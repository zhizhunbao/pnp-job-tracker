'use client'
/**
 * gate 域的结构:修改面板顶上的「从简历填写」(2026-11-09「我的」第一批):说明、按钮与一行结果提示(读屏会念)。
 * 2026-11-12 Frank「这种解释性的文字不需要吧」「用户是知道的吧」:说明那句撤,只剩按钮与结果提示。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Notice } from '@/components/notice'
import { FILL_ROLE, FORM_SECONDARY_KIND, TEXT_NONE } from './constants'
import type { GateResumeFillIn } from './types'
import css from './gate.module.css'

/**
 * 从简历填写一格。
 *
 * @param props 面板与取词。
 * @returns 按钮与提示。
 */
export function GateResumeFill({ f, t }: GateResumeFillIn) {
  return (
    <div className={cssOf(css.field)}>
      <div className={cssOf(css.fillRow)}>
        <Button kind={FORM_SECONDARY_KIND} sm onClick={f.onFill} busy={f.busy}>{t('pf.fill')}</Button>
      </div>
      <div role={FILL_ROLE}>
        {f.msg.key !== TEXT_NONE && <Notice kind={f.msg.kind}>{t(f.msg.key, { n: f.msg.n })}</Notice>}
      </div>
    </div>
  )
}
