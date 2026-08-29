'use client'
/**
 * pricing 域的 Pro 90 天卡(主位)。E5-07:卡序 = 免费 → 90 天 → 30 天,主推 90 天靠
 * **版式**(排在前、琥珀描边、省 N% 徽标),不写「推荐」这类营销词。
 * 徽标上的百分数与每天单价都随 env 的展示价动态算(变量 PRICE),改价零代码。
 * 2026-08-28 换装批自 PricingModal.tsx 的第二张卡提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { IconStar } from '@/components/icons'
import { ICON_GAP, PLAN_90, PLAIN_BTN_KIND, WIDE_GAP } from './constants'
import { buyClsOf, cardClsOf, makePlanPick, perLabel90Of } from './functions'
import { PriceAmount } from './priceamount'
import { PriceFeature } from './pricefeature'
import { PriceSell } from './pricesell'
import type { PricingPro90In } from './types'
import { PRICE } from './variables'
import css from './pricing.module.css'

/**
 * Pro 90 天卡。
 *
 * @param props 取词函数、忙态与购买手柄(逐格注释见 PricingPro90In)。
 * @returns 90 天卡。
 */
export function PricingPro90({ t, busy, onBuy }: PricingPro90In) {
  return (
    <div className={cardClsOf({ hot: true })}>
      <span className={css.badge}>{t('price.save', { p: PRICE.savePct })}</span>
      <div className={css.headPro}><IconStar />{ICON_GAP}{t('price.pro')}{ICON_GAP}{PLAN_90}</div>
      <PriceAmount amount={PRICE.p90} per={perLabel90Of({ t, perDay: PRICE.perDay90 })} />
      <ul className={css.list}>
        <PriceFeature dim>{t('price.plusFree')}</PriceFeature>
        <PriceSell head={t('price.pA')} detail={t('price.pA.d')} />
        <PriceSell head={t('price.pB')} detail={t('price.pB.d')} />
        <PriceSell head={t('price.pC')} detail={t('price.pC.d')} />
      </ul>
      <Button kind={PLAIN_BTN_KIND}
        onClick={makePlanPick({ plan: PLAN_90, onBuy })}
        disabled={busy}
        className={buyClsOf({ plan: PLAN_90, busy })}>{t('price.cta.buy90')}{WIDE_GAP}{PRICE.p90}</Button>
    </div>
  )
}
