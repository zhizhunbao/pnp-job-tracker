'use client'
/**
 * 「我的订阅」的方案卡(2026-10-08 照 AIApply 的 Billing 卡):Pro 态 = 星标 + 「Pro」+ 「还剩 N 天」+ 有效期至 + 「续买」;
 * 免费态 = 「免费版」+ 两档价格 + 「升级 Pro」。两颗钮都开全站同一个定价框。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { Button } from '@/components/button'
import { IconStar } from '@/components/icons'
import { PRICE } from '@/components/pricing'
import { Tag } from '@/components/tag'
import { ymd } from '@/lib/time'
import { LEFT_TAG, PRO_LABEL, RENEW_BTN_KIND, UPGRADE_BTN_KIND } from './constants'
import { daysLeftOf, subCardClsOf } from './functions'
import type { SubPlanIn } from './types'
import css from './account.module.css'

/**
 * 渲染方案卡。
 *
 * @param props 取词函数、是不是 Pro、到期日与开定价框的手柄。
 * @returns 一张卡。
 */
export function SubPlan({ t, pro, until, onOpen }: SubPlanIn) {
  return (
    <div className={subCardClsOf(pro)}>
      {pro && <div className={css.subIcon}><IconStar /></div>}
      <div className={css.subBody}>
        <div className={css.subNameRow}>
          {pro && <span className={css.subName}>{PRO_LABEL}</span>}
          {pro === false && <span className={css.subName}>{t('acct.plan.free')}</span>}
          {pro && <Tag variant={LEFT_TAG}>{t('sub.left', { n: daysLeftOf(until) })}</Tag>}
        </div>
        {pro && <div className={css.subUntil}>{t('acct.plan.pro', { d: ymd(until) })}</div>}
        {pro === false && <div className={css.rfMeta}>{t('sub.price', { a: PRICE.p30, b: PRICE.p90 })}</div>}
      </div>
      <div className={css.subActs}>
        {pro && <Button kind={RENEW_BTN_KIND} sm onClick={onOpen}>{t('sub.renew')}</Button>}
        {pro === false && <Button kind={UPGRADE_BTN_KIND} sm onClick={onOpen}>{t('up.cta2')}</Button>}
      </div>
    </div>
  )
}
