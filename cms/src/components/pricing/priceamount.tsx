'use client'
/**
 * pricing 域的价格行:大字档价 + 灰字小注(计价口径与每天单价)。三张价卡共用同一副形
 * —— 免费卡的大字是「免费」两个字,小注留空。
 * 第 22 轮 dd 抓的当晚回归:这一行原先按不折行排,在 375px 把页面撑出横向溢出,
 * 现在允许折行(见 pricing.module.css 的 .amount)。
 * 2026-08-28 换装批自 PricingModal.tsx 的内联小件 priceLine 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { PER_GAP } from './constants'
import type { PriceAmountIn } from './types'
import css from './pricing.module.css'

/**
 * 价格行。
 *
 * @param props 大字与灰字两半(逐格注释见 PriceAmountIn)。
 * @returns 价格行。
 */
export function PriceAmount({ amount, per }: PriceAmountIn) {
  return (
    <div>
      <span className={css.amount}>{amount}</span>
      <span className={css.per}>{PER_GAP}{per}</span>
    </div>
  )
}
