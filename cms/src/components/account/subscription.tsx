'use client'
/**
 * account 域的「我的订阅」节(2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅 可以吗?」):
 * 节标题 + 当前套餐(免费版;或 Pro + 有效期)+ 一颗钮 —— 免费档「升级 Pro」、Pro 档「续买」(时长包到期日顺延),
 * 两颗都打开全站同一个定价框(PricingModal;下单只此一处,本节不另造)。形照同桶 ResumeArchive(节标题 + 正文)。
 * 账户下拉里原先那一项「升级 Pro」同日撤,升级入口挪到这里。
 *
 * @author Frank
 * @time 2026-10-04 01:10:00
 */
import { Button } from '@/components/button'
import { IconStar } from '@/components/icons'
import { PricingModal } from '@/components/pricing'
import { ymd } from '@/lib/time'
import { PRO_LABEL, RENEW_BTN_KIND, UPGRADE_BTN_KIND } from './constants'
import { makeFlagSet, proOf } from './functions'
import { useSubscription } from './hooks'
import type { SubscriptionIn } from './types'
import css from './account.module.css'

/**
 * 「我的订阅」节。
 *
 * @param props 取词函数与 Pro 到期日(见 SubscriptionIn 逐格注释)。
 * @returns 订阅节(带它自己的定价框)。
 */
export function Subscription({ t, until }: SubscriptionIn) {
  let untilIn: string | null = null
  if (until != null) {
    untilIn = until
  }
  const pro = proOf({ until: untilIn })
  const s = useSubscription()
  return (
    <div>
      <div className={css.secTitle}>{t('sub.title')}</div>
      {pro && (
        <>
          <div className={css.subPlan}><span className={css.subPro}><IconStar /> {PRO_LABEL}</span></div>
          <div className={css.secHint}>{t('acct.plan.pro', { d: ymd(untilIn) })}</div>
        </>
      )}
      {pro === false && <div className={css.subPlan}><span className={css.subFree}>{t('acct.plan.free')}</span></div>}
      <div className={css.subActs}>
        {pro && (
          <Button kind={RENEW_BTN_KIND} sm onClick={makeFlagSet({ set: s.setOpen, v: true })}>{t('sub.renew')}</Button>
        )}
        {pro === false && (
          <Button kind={UPGRADE_BTN_KIND} sm onClick={makeFlagSet({ set: s.setOpen, v: true })}>{t('up.cta2')}</Button>
        )}
      </div>
      {s.open && <PricingModal t={t} loggedIn pro={pro} onClose={makeFlagSet({ set: s.setOpen, v: false })} />}
    </div>
  )
}
