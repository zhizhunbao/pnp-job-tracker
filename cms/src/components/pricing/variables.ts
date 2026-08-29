/**
 * pricing 域的运行时容器:整站共用的那一份展示价。它进不了 constants.ts ——
 * 常量文件只装 JSON 装得下的死值,而这份价要先解析 env 再做折算与比值,是**算出来的**;
 * 摆成一个容器,这个域一共有几格随环境变的东西一眼数得清。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { priceOf } from './functions'
import type { Price } from './types'

/**
 * 价格锚点数学的单一来源(#74:PricingCard 与 UpgradeModal 共用,不许 fork)。
 * 展示价走 env NEXT_PUBLIC_PRICE_DISPLAY(与 /pricing 页同源,构建期内联),
 * 改价 = 换 Stripe Price + 改 env,零代码;所以整站只解析一次,就挂在这一格上。
 * 2026-08-28 换装批:它原先是个带 perDay(价, 天数) 方法的常量对象 —— 常量装不下函数,
 * 而全站只用得到 30 天与 90 天两个组合,于是折算挪进 functions 算完,这里只剩成品串。
 */
export const PRICE: Price = priceOf()
