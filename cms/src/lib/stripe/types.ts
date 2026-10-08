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

// eslint-disable-next-line local/no-import-in-leaf -- Checkout 会话与支付方式的形状由 stripe 库定（特批牌形态）
import type StripeShapes from 'stripe'

/**
 * 支付方式的本地名（Checkout 创建参数里的枚举）。
 */
export type PayMethod = StripeShapes.Checkout.SessionCreateParams.PaymentMethodType

/**
 * Checkout 会话的本地名（webhook 事件体的收窄目标）。
 */
export type StripeCheckoutSession = StripeShapes.Checkout.Session

/**
 * POST /api/stripe/checkout 的请求体形状（跨边界断言目标，逐格判后才用）。
 */
export type CheckoutBody = {
  /**
   * 时长包键；不在 PLANS 目录里就 400。
   */
  plan: string | null

  /**
   * 付完回哪儿(站内「我的」页某处,如投递区那一岗;2026-10-07 批 C);缺席 = 账户页。线格式:不带即缺席。
   */
  back?: string
}

/**
 * 读得出或读不出(null)的下单请求体。
 */
export type MaybeCheckoutBody = CheckoutBody | null

/**
 * 付完 / 取消各回哪条路径。
 */
export type ReturnPaths = {
  /**
   * 付成回跳(带 ok=1)。
   */
  ok: string

  /**
   * 取消回跳。
   */
  cancel: string
}

/**
 * webhook 要读的用户三格（findByID 的跨边界断言目标：只声明本域真读的几格）。
 */
export type WebhookUserDoc = {
  /**
   * Pro 到期日（ISO）；没买过是 null。
   */
  proUntil: string | null

  /**
   * 已拨过的 session id 清单（幂等账本）；没有是 null。
   */
  stripeSessions: string[] | null
}

/**
 * `loadPayments` 的入参。
 */
export type PaymentsIn = {
  /**
   * Stripe 客户端。
   */
  stripe: StripeClient

  /**
   * Stripe 客户 id(用户表 stripeCustomerId)。
   */
  customerId: string
}

/**
 * 一笔付款(「我的订阅」付款记录的线格式;2026-10-08)。
 */
export type PaymentRow = {
  /**
   * Checkout 会话 id(行身份)。
   */
  id: string

  /**
   * 付款时刻(ISO)。
   */
  paidAt: string

  /**
   * 买的天数(metadata.days;认不出给 0)。
   */
  days: number

  /**
   * 实付金额(元,含税)。
   */
  amount: number

  /**
   * 货币码(小写,Stripe 原样;如 cad)。
   */
  currency: string

  /**
   * Stripe 收据地址(没有给空串)。
   */
  receiptUrl: string
}

/**
 * `loadPayments` 的返回。
 */
export type PaymentsOut = Promise<PaymentRow[]>

/**
 * `createSession` 的入参（主尝试与退卡兜底两处共用）。
 */
export type CreateSessionIn = {
  /**
   * Stripe 客户端。
   */
  stripe: StripeClient

  /**
   * 本次带的支付方式。
   */
  types: PayMethod[]

  /**
   * Stripe Price id（从环境变量来）。
   */
  price: string

  /**
   * 站点域名（回跳地址拼它）。
   */
  site: string

  /**
   * 发起人的用户 id（webhook 按它拨到人）。
   */
  userId: string

  /**
   * 发起人邮箱（预填 Checkout）。
   */
  email: string

  /**
   * 时长包天数（进 metadata）。
   */
  days: number

  /**
   * 付成回跳路径。
   */
  okPath: string

  /**
   * 取消回跳路径。
   */
  cancelPath: string
}
