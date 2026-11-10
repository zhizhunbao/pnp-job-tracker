'use client'
/**
 * pricing 域升级框的正文(2026-11-09 Frank「现在有两个定价页,是不是合成一个」→ 看图后「可以」:只留升级框这一种形态,
 * 定价弹框与定价页那一套大卡撤):两张可选的价卡、一颗「确认支付」、币种说明一行、权益清单。
 * 升级弹框与 `/pricing` 页共用这一件 —— 弹框只出权益标题,定价页带说明那一行;没登录点「确认支付」先弹注册框。
 * 形态沿革见 upgrademodal.tsx 文件头(2026-09-04 照猩际重做的两张套餐卡)。
 *
 * @author Frank
 * @time 2026-11-10 00:20:00
 */
import { AuthModal } from '@/components/auth'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import { Notice } from '@/components/notice'
import {
  AUTH_MODE_REGISTER, BTN_SECONDARY, ICON_GAP, NOTICE_KIND_ERR, PLAIN_BTN_KIND, PLAN_30, PLAN_90, PRO_PERKS, TEXT_NONE,
  Z_AUTH_STEP, Z_UPGRADE,
} from './constants'
import { pickedPriceOf, upCardClsOf } from './functions'
import { useUpgradeModal } from './hooks'
import type { UpgradeBodyIn } from './types'
import { PRICE } from './variables'
import css from './pricing.module.css'

/**
 * 升级框的正文。
 *
 * @param props 取词函数、缘由、付完回哪儿、基础简历钮、登录态与权益带不带说明(逐格注释见 UpgradeBodyIn)。
 * @returns 两张价卡、支付钮、币种说明与权益清单;会员当期额度用完时只出缘由与基础简历钮。
 */
export function UpgradeBody({
  t, reason, back = TEXT_NONE, onBase, baseOnly = false, loggedIn = true, detail = false,
  authZ = Z_UPGRADE + Z_AUTH_STEP,
}: UpgradeBodyIn) {
  const up = useUpgradeModal({ t, back, loggedIn })
  const perks = []
  for (const [head, more] of PRO_PERKS) {
    perks.push(
      <li key={head} className={css.upPerk}>
        <IconCheck />{ICON_GAP}
        <span>
          {t(head)}
          {detail && <span className={css.upPerkMore}>{t(more)}</span>}
        </span>
      </li>,
    )
  }
  const baseBtn = onBase != null && (
    <Button kind={BTN_SECONDARY} onClick={onBase} className={cssOf(css.upPay)}>{t('ap.baseSend')}</Button>
  )
  if (baseOnly) {
    return (
      <>
        {reason != null && reason !== TEXT_NONE && <div className={css.upReason}>{reason}</div>}
        {baseBtn}
      </>
    )
  }
  return (
    <>
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
      {baseBtn}
      <div className={css.cadNote}>{t('price.cad')}</div>
      <ul className={css.upPerks}>{perks}</ul>
      {up.authOpen && (
        <AuthModal t={t} mode={AUTH_MODE_REGISTER} z={authZ} onClose={up.onAuthClose} onDone={up.onAuthDone} />
      )}
    </>
  )
}
