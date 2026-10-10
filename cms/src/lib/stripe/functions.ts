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
import {
  BACK_RE, CANCEL_PATH, CENTS, OK_TAIL, PAYMENTS_EXPAND, PAYMENTS_LIMIT, PAYMENTS_PAID, RADIX_DEC, RECEIPT_NONE, S_TO_MS,
  SUCCESS_PATH,
} from './constants'
import { CACHE } from './variables'
import type {
  MaybeCheckoutBody, MaybeStripe, PaymentRow, PaymentsIn, PaymentsOut, ReturnPaths, StripeCheckoutSession,
} from './types'

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

/**
 * 付完 / 取消各回哪条路径(2026-10-07 批 C):请求体带了合规的站内回跳地址(白名单 BACK_RE)就回那儿、
 * 付成补 ok=1;没带或不合规一律回账户页 —— 不做开放跳转。
 *
 * @param body 下单请求体;读不出是 null。
 * @returns 两条回跳路径。
 */
export function returnPathsOf(body: MaybeCheckoutBody): ReturnPaths {
  if (body == null || typeof body.back !== 'string' || BACK_RE.test(body.back) === false) {
    return { ok: SUCCESS_PATH, cancel: CANCEL_PATH }
  }
  return { ok: body.back + OK_TAIL, cancel: body.back }
}

/**
 * 本人的付款记录(「我的订阅」页签;2026-10-08):按客户 id 拉 Checkout 会话,只留付清了的,最近的在前;不落库。
 *
 * @param x 客户端与客户 id。
 * @returns 一笔一行;没买过给空清单。
 */
export async function loadPayments(x: PaymentsIn): PaymentsOut {
  const list = await x.stripe.checkout.sessions.list({
    customer: x.customerId, limit: PAYMENTS_LIMIT, expand: PAYMENTS_EXPAND,
  })
  const out: PaymentRow[] = []
  for (const session of list.data) {
    if (session.payment_status === PAYMENTS_PAID) {
      out.push(toPaymentRow(session))
    }
  }
  return out
}

/**
 * Checkout 会话 → 一笔付款(天数读 metadata.days,与 webhook 同一真相;收据在支付意图的最近一笔扣款上)。
 *
 * @param session 会话(已展开到扣款)。
 * @returns 一笔付款。
 */
export function toPaymentRow(session: StripeCheckoutSession): PaymentRow {
  let days = 0
  if (session.metadata != null && session.metadata.days != null) {
    const n = parseInt(session.metadata.days, RADIX_DEC)
    if (Number.isFinite(n)) {
      days = n
    }
  }
  let amount = 0
  if (session.amount_total != null) {
    amount = session.amount_total / CENTS
  }
  let currency = ''
  if (session.currency != null) {
    currency = session.currency
  }
  return {
    id: session.id,
    paidAt: new Date(session.created * S_TO_MS).toISOString(),
    days,
    amount,
    currency,
    receiptUrl: receiptUrlOf(session),
  }
}

/**
 * 会话上的收据地址:支付意图与扣款都展开成对象才取得到;任一层还是 id 串或空,给空串。
 *
 * @param session 会话。
 * @returns 收据地址或空串。
 */
function receiptUrlOf(session: StripeCheckoutSession): string {
  const intent = session.payment_intent
  if (intent == null || typeof intent === 'string') {
    return RECEIPT_NONE
  }
  const charge = intent.latest_charge
  if (charge == null || typeof charge === 'string') {
    return RECEIPT_NONE
  }
  if (charge.receipt_url == null) {
    return RECEIPT_NONE
  }
  return charge.receipt_url
}
