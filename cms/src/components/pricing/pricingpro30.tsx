'use client'
/**
 * pricing 域的 Pro 30 天卡(试水档)。内容与 90 天档一模一样,只是期限短、每天贵 ——
 * 所以清单只写一句「与 90 天档相同」,不把三条卖点再抄一遍。
 * 2026-08-28 换装批自 PricingModal.tsx 的第三张卡提出成文件。
 * 2026-10-07 权益清单挪到两卡下面共用一份,这一句「与 90 天档相同」随之撤,卡里只剩价格与购买钮。
 * 2026-10-12 Frank「这个应该卡片也能点」:整张卡可点(点卡 = 点购买钮);点击只挂在卡上,钮靠冒泡触发,免得点钮时卡与钮各买一次、开两个标签;跳转中卡也不响应。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { IconStar } from '@/components/icons'
import { ICON_GAP, PLAN_30, PLAIN_BTN_KIND, WIDE_GAP } from './constants'
import { buyClsOf, cardClsOf, makeCardPick, perLabel30Of } from './functions'
import { PriceAmount } from './priceamount'
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
    <div className={cardClsOf({ hot: false })} onClick={makeCardPick({ plan: PLAN_30, onBuy, busy })}>
      <div className={css.headPro}><IconStar />{ICON_GAP}{t('price.pro')}{ICON_GAP}{PLAN_30}</div>
      <PriceAmount amount={PRICE.p30} per={perLabel30Of({ t, perDay: PRICE.perDay30 })} />
      <Button kind={PLAIN_BTN_KIND}
        disabled={busy}
        className={buyClsOf({ plan: PLAN_30, busy })}>{t('price.cta.buy30')}{WIDE_GAP}{PRICE.p30}</Button>
    </div>
  )
}
