'use client'
/**
 * apply 桶的投出后一键开启新岗推送(2026-11-08 Frank 选「投出后一键开启」;清单第 1 条,出处 Job Bank Job Match):
 * 只问没设过的人,点了才开(明示同意),关过的不再问。
 *
 * @author Frank
 * @time 2026-11-08 22:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, PUSH_BTN_KEY, PUSH_BTN_KIND, PUSH_HEAD_KEY, PUSH_ROW_KEY, PUSH_TO_GAP, PUSH_TO_KEY,
  TEXT_NONE,
} from './constants'
import { usePushOffer } from './hooks'
import type { PushOfferIn } from './types'
import css from './apply.module.css'

/**
 * 一张分区卡:卡头、说明、收件邮箱灰字与按钮;不该问时不出。
 *
 * @param props 取词函数。
 * @returns 分区卡或空。
 */
export function PushOffer({ t }: PushOfferIn) {
  const p = usePushOffer(t)
  if (p.email === TEXT_NONE) {
    return null
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t(PUSH_HEAD_KEY)}</div>
      <div className={cssOf(css.pushRow)}>
        <div>
          <div>{t(PUSH_ROW_KEY)}</div>
          <div className={cssOf(css.pushTo)}>{t(PUSH_TO_KEY) + PUSH_TO_GAP + p.email}</div>
        </div>
        <Button kind={PUSH_BTN_KIND} onClick={p.onOn} busy={p.busy}>{t(PUSH_BTN_KEY)}</Button>
      </div>
    </div>
  )
}
