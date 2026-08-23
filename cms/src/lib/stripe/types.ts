/**
 * 支付域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- 第三方客户端的形状由 stripe 库定,单例槽的格要它(特批牌形态)
import type StripeLib from 'stripe'

/**
 * Stripe 客户端的本地名(库类型起本地名,签名里不出现外部类型)。
 */
export type StripeClient = StripeLib

/**
 * 客户端或没配 key(`getStripe` 的返回;null = 调用方 503)。
 */
export type MaybeStripe = StripeClient | null

/**
 * 支付域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type StripeCache = {
  /**
   * Stripe 客户端单例槽(建一次用到底;没配 key 一直是 null)。
   */
  client: StripeClient | null
}
