'use client'
/**
 * pricing 域的升级 Pro 弹框(2026-09-04 Frank 拍板照猩际重做:两张套餐卡 30 天 CA$5 / 90 天 CA$13,
 * 90 天卡写「每 30 天多少钱」+ 省 N% 角标,每卡一行「到期不会自动续费」,点卡选中、「确认支付 CA$x」
 * 去 Stripe Checkout(卡 / 微信 / 支付宝在那页选,站内不碰支付方式与税);卡下面是权益清单,只写已有的功能。
 * **只在已登录上下文渲染** —— 未登录的升级入口先走 AuthModal 注册。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCheck, IconStar } from '@/components/icons'
import { Modal } from '@/components/modal'
import { Notice } from '@/components/notice'
import {
  ICON_GAP, MODAL_SIZE_SM, NOTICE_KIND_ERR, PLAIN_BTN_KIND, PLAN_30, PLAN_90, TEXT_NONE, UP_PERK_KEYS, Z_UPGRADE,
} from './constants'
import { pickedPriceOf, upCardClsOf } from './functions'
import { useUpgradeModal } from './hooks'
import type { UpgradeModalIn } from './types'
import { PRICE } from './variables'
import css from './pricing.module.css'

/**
 * 升级 Pro 弹框。
 *
 * @param props 取词函数、关闭回调与弹这一下的缘由(逐格注释见 UpgradeModalIn)。
 * @returns 弹框。
 */
export function UpgradeModal({ t, onClose, reason }: UpgradeModalIn) {
  const up = useUpgradeModal({ t })
  const perks = []
  for (const key of UP_PERK_KEYS) {
    perks.push(<li key={key} className={css.upPerk}><IconCheck />{ICON_GAP}{t(key)}</li>)
  }
  return (
    <Modal onClose={onClose} size={MODAL_SIZE_SM} z={Z_UPGRADE} resizable={false}>
      <div className={css.upTitle}><IconStar />{ICON_GAP}{t('acct.buyTitle')}</div>
      {reason != null && reason !== TEXT_NONE && <div className={css.upReason}>{reason}</div>}
      <div className={css.upRow}>
        <Button kind={PLAIN_BTN_KIND} onClick={up.pickOf(PLAN_30)} className={upCardClsOf({ on: up.plan === PLAN_30 })}>
          <div className={css.upDays}>{t('acct.buy30')}</div>
          <div className={css.upPrice}>{PRICE.p30}</div>
          <div className={css.upNoRenew}>{t('up.noRenew')}</div>
        </Button>
        <Button kind={PLAIN_BTN_KIND} onClick={up.pickOf(PLAN_90)} className={upCardClsOf({ on: up.plan === PLAN_90 })}>
          <span className={css.upBadge}>{t('price.save', { p: PRICE.savePct })}</span>
          <div className={css.upDays}>{t('acct.buy90')}</div>
          <div className={css.upPrice}>{PRICE.p90}</div>
          <div className={css.upPerDay}>{t('up.per30', { v: PRICE.per30Of90 })}</div>
          <div className={css.upNoRenew}>{t('up.noRenew')}</div>
        </Button>
      </div>
      {up.err !== TEXT_NONE && <Notice kind={NOTICE_KIND_ERR} className={cssOf(css.upNotice)}>{up.err}</Notice>}
      <Button onClick={up.onPay} disabled={up.busy} className={cssOf(css.upPay)}>
        {t('up.pay', { v: pickedPriceOf({ plan: up.plan, price: PRICE }) })}
      </Button>
      <ul className={css.upPerks}>{perks}</ul>
    </Modal>
  )
}
