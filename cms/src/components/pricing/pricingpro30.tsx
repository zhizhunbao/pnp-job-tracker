'use client'
/**
 * pricing 域的 Pro 30 天卡(试水档)。内容与 90 天档一模一样,只是期限短、每天贵 ——
 * 所以清单只写一句「与 90 天档相同」,不把三条卖点再抄一遍。
 * 2026-08-28 换装批自 PricingModal.tsx 的第三张卡提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { IconStar } from '@/components/icons'
import { ICON_GAP, PLAN_30, PLAIN_BTN_KIND, WIDE_GAP } from './constants'
import { buyClsOf, cardClsOf, makePlanPick, perLabel30Of } from './functions'
import { PriceAmount } from './priceamount'
import { PriceFeature } from './pricefeature'
import type { PricingPro30In } from './types'
import { PRICE } from './variables'
import css from './pricing.module.css'

/**
 * Pro 30 天卡。
 *
 * @param props 取词函数、忙态与购买手柄(逐格注释见 PricingPro30In)。
 * @returns 30 天卡。
 */
export function PricingPro30({ t, busy, onBuy }: PricingPro30In) {
  return (
    <div className={cardClsOf({ hot: false })}>
      <div className={css.headPro}><IconStar />{ICON_GAP}{t('price.pro')}{ICON_GAP}{PLAN_30}</div>
      <PriceAmount amount={PRICE.p30} per={perLabel30Of({ t, perDay: PRICE.perDay30 })} />
      <ul className={css.list}>
        <PriceFeature dim>{t('price.same30')}</PriceFeature>
      </ul>
      <Button kind={PLAIN_BTN_KIND}
        onClick={makePlanPick({ plan: PLAN_30, onBuy })}
        disabled={busy}
        className={buyClsOf({ plan: PLAN_30, busy })}>{t('price.cta.buy30')}{WIDE_GAP}{PRICE.p30}</Button>
    </div>
  )
}
