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
}
