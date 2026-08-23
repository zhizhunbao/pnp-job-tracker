/**
 * 支付域的全部可变状态:客户端单例槽。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

import type { StripeCache } from './types'

/**
 * 支付域全部的可变状态,就这一格。
 */
export const CACHE: StripeCache = {
  /**
   * Stripe 客户端单例槽(没配 key 一直是 null)。
   */
  client: null,
}
