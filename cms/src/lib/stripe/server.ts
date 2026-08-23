/**
 * 支付域的**服务端**门(密钥客户端不许进浏览器包)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

export { getStripe } from './functions'
export type { StripeClient } from './types'
