'use client'
/**
 * 投递页底部钮组:错误一行在上;前三步右边「上一步 / 主钮」(第 1 步没有上一步),已投递一步只有「我的求职」。
 * 2026-10-07 投递并进「我的求职」:发出后投递区收起,「我的求职」钮撤。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { Button } from '@/components/button'
import { BTN_GHOST, ERR_NONE, STEP_DONE, STEP_RESUME } from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 底部钮组。
 *
 * @param props 整机面板。
 * @returns 错误一行与钮组。
 */
export function ApplyFoot({ p }: ApplyStepIn) {
  return (
    <>
      {p.err !== ERR_NONE && <div className={css.err}>{p.t(p.err)}</div>}
      <div className={css.foot}>
        {p.step !== STEP_DONE && p.step !== STEP_RESUME && (
          <Button kind={BTN_GHOST} onClick={p.onBack} disabled={p.busy}>{p.t('ap.back')}</Button>
        )}
        {p.step !== STEP_DONE && (
          <Button onClick={p.onNext} disabled={p.canNext === false} busy={p.busy}>{p.t(p.nextKey)}</Button>
        )}
      </div>
    </>
  )
}
