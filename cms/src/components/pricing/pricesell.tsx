'use client'
/**
 * pricing 域的 Pro 卖点一行:一句结论 + 底下小字写清具体给什么。
 * 标题不许只喊口号,小字是可核对的东西 —— 这是卖点行与普通清单行的唯一区别。
 * 2026-08-28 换装批自 PricingModal.tsx 的内联小件 Sell 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import type { PriceSellIn } from './types'
import css from './pricing.module.css'

/**
 * Pro 卖点一行。
 *
 * @param props 结论那一句与底下的小字(逐格注释见 PriceSellIn)。
 * @returns 卖点一行。
 */
export function PriceSell({ head, detail }: PriceSellIn) {
  return (
    <li className={css.sell}>
      <IconCheck className={cssOf(css.itemIcon)} />
      <span>
        <span className={css.sellHead}>{head}</span>
        <span className={css.sellDetail}>{detail}</span>
      </span>
    </li>
  )
}
