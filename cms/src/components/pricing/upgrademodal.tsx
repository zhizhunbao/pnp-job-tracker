'use client'
/**
 * pricing 域的升级 Pro 专用弹框(用户定:注册弹框与购买弹框分离,升级入口不再跳 /account)。
 * **只在已登录上下文渲染** —— 未登录的升级入口先走 AuthModal 注册,所以这里不再判登录。
 * 价格展示走 env NEXT_PUBLIC_PRICE_DISPLAY(与 /pricing 同源,构建期内联),
 * Checkout 复用 `/api/stripe/checkout`;#74 随 #64 换装:90 天钮补省 N% 徽标,
 * 两钮补每天单价,数学与价卡同源变量 PRICE。
 * 底部「对比」在站内开定价弹窗(E8-02:站内不跳页)。
 * 2026-08-28 换装批自 UpgradeModal.tsx 重写成小写件形制(内联样式逐格迁
 * pricing.module.css、购买流与埋点进 functions、三格状态进 hooks、散值进 constants)。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconStar } from '@/components/icons'
import { Modal } from '@/components/modal'
import { Notice } from '@/components/notice'
import {
  ARROW_NEXT, ICON_GAP, MODAL_SIZE_SM, NOTICE_KIND_ERR, PLAN_30, PLAN_90, PLAIN_BTN_KIND, TEXT_NONE,
  WIDE_GAP, Z_COMPARE, Z_UPGRADE,
} from './constants'
import { makePlanPick, upBuyClsOf } from './functions'
import { useUpgradeModal } from './hooks'
import { PricingModal } from './pricingmodal'
import type { UpgradeModalIn } from './types'
import { PRICE } from './variables'
import css from './pricing.module.css'

/**
 * 升级 Pro 弹框。
 *
 * @param props 取词函数、关闭回调与弹这一下的缘由(逐格注释见 UpgradeModalIn)。
 * @returns 弹框与点「对比」时那一层定价弹窗。
 */
export function UpgradeModal({ t, onClose, reason }: UpgradeModalIn) {
  const up = useUpgradeModal({ t })
  return (
    <Modal onClose={onClose} size={MODAL_SIZE_SM} z={Z_UPGRADE}>
      <div className={css.upTitle}><IconStar />{ICON_GAP}{t('acct.buyTitle')}</div>
      {reason != null && reason !== TEXT_NONE && <div className={css.upReason}>{reason}</div>}
      <div className={css.upRow}>
        <Button kind={PLAIN_BTN_KIND}
          onClick={makePlanPick({ plan: PLAN_30, onBuy: up.onBuy })}
          disabled={up.busy}
          className={upBuyClsOf({ plan: PLAN_30, busy: up.busy })}>
          <div>{t('acct.buy30')}{WIDE_GAP}{PRICE.p30}</div>
          <div className={css.upPerDay}>{t('price.perDay', { v: PRICE.perDay30 })}</div>
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          onClick={makePlanPick({ plan: PLAN_90, onBuy: up.onBuy })}
          disabled={up.busy}
          className={upBuyClsOf({ plan: PLAN_90, busy: up.busy })}>
          <span className={css.upBadge}>{t('price.save', { p: PRICE.savePct })}</span>
          <div>{t('acct.buy90')}{WIDE_GAP}{PRICE.p90}</div>
          <div className={css.upPerDay}>{t('price.perDay', { v: PRICE.perDay90 })}</div>
        </Button>
      </div>
      {up.err !== TEXT_NONE && <Notice kind={NOTICE_KIND_ERR} className={cssOf(css.upNotice)}>{up.err}</Notice>}
      <div className={css.upNote}>{t('acct.buyNote')}</div>
      <Button kind={PLAIN_BTN_KIND}
        onClick={up.onCompareOpen}
        className={cssOf(css.upCompare)}>{t('up.compare')}{ICON_GAP}{ARROW_NEXT}</Button>
      {up.compare && <PricingModal t={t}
        loggedIn
        pro={false}
        z={Z_COMPARE}
        onClose={up.onCompareClose} />}
    </Modal>
  )
}
