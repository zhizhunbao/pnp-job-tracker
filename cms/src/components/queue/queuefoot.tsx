'use client'
/**
 * 「今日待投」底部:错误一行;左「改信」(去投递区)、右「跳过」「投出」;多于一岗再出「全部投出」。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { Button } from '@/components/button'
import { BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, ERR_NONE } from './constants'
import type { QueueFootIn } from './types'
import css from './queue.module.css'

/**
 * 渲染底部。
 *
 * @param props 整机面板、这一岗与取词函数。
 * @returns 错误一行与钮组。
 */
export function QueueFoot({ p, item, t }: QueueFootIn) {
  return (
    <>
      {p.err !== ERR_NONE && <div className={css.err}>{t(p.err)}</div>}
      <div className={css.foot}>
        <span className={css.left}>
          {item.jobId != null && (
            <Button kind={BTN_LINK} className={css.linkBtn} onClick={p.onEdit}>{t('qu.edit')}</Button>
          )}
        </span>
        <span className={css.right}>
          <Button kind={BTN_SECONDARY} sm onClick={p.onSkip} disabled={p.busy}>{t('qu.skip')}</Button>
          <Button kind={BTN_PRIMARY}
            sm
            onClick={p.onSend}
            disabled={p.busy || item.closed || item.jobId == null}
            busy={p.busy}>
            {t('qu.send')}
          </Button>
          {p.state.items.length > 1 && (
            <Button kind={BTN_PRIMARY} sm onClick={p.onSendAll} disabled={p.busy}>
              {t('qu.sendAll', { n: p.state.items.length })}
            </Button>
          )}
        </span>
      </div>
    </>
  )
}
