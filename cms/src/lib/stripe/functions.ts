/**
 * 支付域的行为:Stripe 客户端接缝这一件事。收款流程(checkout / webhook)在各自路由,
 * 本域只保证「拿到的客户端是同一个、key 缺席时看得见」。
 * (2026-08-23 Frank 拍板单独立域:支付不并进 quota —— 配额读 proUntil 这个**结果**,
 * 怎么收的钱与它无关。)
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

import Stripe from 'stripe'
import { CACHE } from './variables'
import type { MaybeStripe } from './types'

/**
 * 拿 Stripe 客户端;env 没配 key 是 null(调用方 503)。key 只进服务端 env,
 * 前端永远只拿 URL 跳转(E3-03)。
 *
 * @returns Stripe 客户端或 null。
 */
export function getStripe(): MaybeStripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (key == null || key === '') {
    return null
  }
  if (CACHE.client == null) {
    CACHE.client = new Stripe(key)
  }
  return CACHE.client
}
