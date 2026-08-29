'use client'
/**
 * pricing 域的清单一行:对勾 + 一句话。免费卡拿它铺事实,Pro 卡拿它的弱化档写承接句
 * (「以上免费的都有」这类,灰一档不与卖点抢眼)。
 * 一行只说一件事(PNP / EE / AIP 拆三行是全站通用原则),图标全走 icons 域。
 * 2026-08-28 换装批自 PricingModal.tsx 的内联小件 Li 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import { featureClsOf } from './functions'
import type { PriceFeatureIn } from './types'
import css from './pricing.module.css'

/**
 * 清单一行。
 *
 * @param props 弱化档开关与这一行说的事(逐格注释见 PriceFeatureIn)。
 * @returns 清单一行。
 */
export function PriceFeature({ dim = false, children }: PriceFeatureIn) {
  return (
    <li className={featureClsOf({ dim })}>
      <IconCheck className={cssOf(css.itemIcon)} />
      <span>{children}</span>
    </li>
  )
}
