'use client'
/**
 * pricing 域的免费卡:事实全给 —— 这是立身之本,也是获客本身,收了等于砸自己
 * (2026-08-14 拍板「简化用户操作的才收费」:事实与结论一律免费展示,付费买的是代劳)。
 * 清单一行只说一件事(PNP / EE / AIP 拆三行是全站通用原则)。
 * 2026-08-28 换装批自 PricingModal.tsx 的第一张卡提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { TEXT_NONE } from './constants'
import { cardClsOf } from './functions'
import { PriceAmount } from './priceamount'
import { PriceFeature } from './pricefeature'
import { PricingFreeCta } from './pricingfreecta'
import type { PricingFreeIn } from './types'
import css from './pricing.module.css'

/**
 * 免费卡。
 *
 * @param props 取词函数、登录态、Pro 态与注册出口(逐格注释见 PricingFreeIn)。
 * @returns 免费卡。
 */
export function PricingFree({ t, loggedIn, pro, onRegister }: PricingFreeIn) {
  return (
    <div className={cardClsOf({ hot: false })}>
      <div className={css.head}>{t('price.free')}</div>
      <PriceAmount amount={t('price.freePrice')} per={TEXT_NONE} />
      <ul className={css.list}>
        <PriceFeature>{t('price.f1')}</PriceFeature>
        <PriceFeature>{t('price.f2a')}</PriceFeature>
        <PriceFeature>{t('price.f2b')}</PriceFeature>
        <PriceFeature>{t('price.f2c')}</PriceFeature>
        <PriceFeature>{t('price.fLists')}</PriceFeature>
        <PriceFeature>{t('price.fMedian')}</PriceFeature>
        <PriceFeature>{t('price.fScoreTable')}</PriceFeature>
        <PriceFeature>{t('price.fWeekly')}</PriceFeature>
        <PriceFeature>{t('price.f3')}</PriceFeature>
        <PriceFeature>{t('price.f4')}</PriceFeature>
        <PriceFeature>{t('price.f5')}</PriceFeature>
      </ul>
      <PricingFreeCta t={t} loggedIn={loggedIn} pro={pro} onRegister={onRegister} />
    </div>
  )
}
