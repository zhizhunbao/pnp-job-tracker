/**
 * 支付域的常量：时长包目录、Checkout 与 webhook 的字面量。
 *
 * @author Frank
 * @time 2026-08-23 07:00:00
 */

/**
 * 时长包目录（E3-03，D8 修订：一次性买断 mode=payment，无订阅无 Portal）：
 * 键 = 前端送来的 plan，值 = 天数与价格环境变量名。
 */
export const PLANS: Record<string, {
  /**
   * 拨给 proUntil 的天数(webhook 按 metadata.days 复读它)。
   */
  days: number

  /**
   * 该包价格的环境变量名(Stripe Price id 不进代码)。
   */
  priceEnv: string
}> = {
  /**
   * 30 天包。
   */
  '30': { days: 30, priceEnv: 'STRIPE_PRICE_30D' },

  /**
   * 90 天包。
   */
  '90': { days: 90, priceEnv: 'STRIPE_PRICE_90D' },
}

/**
 * 支付方式：卡。
 */
export const PM_CARD = 'card'

/**
 * 支付方式：支付宝。
 */
export const PM_ALIPAY = 'alipay'

/**
 * 支付方式：微信支付（Dashboard 确认开通后设 STRIPE_WECHAT_PAY=1 启用；
 * Stripe 要求 client:web）。
 */
export const PM_WECHAT = 'wechat_pay'

/**
 * 回跳成功页路径（拼在站点域名后）。
 */
export const SUCCESS_PATH = '/account?ok=1'

/**
 * 取消回跳页路径。
 */
export const CANCEL_PATH = '/account'

/**
 * webhook 认的两个事件（alipay/wechat 属异步支付，completed 时可能还 unpaid →
 * 到账走 async_payment_succeeded，同一处理器）。
 */
export const HANDLED_EVENTS: string[] = ['checkout.session.completed', 'checkout.session.async_payment_succeeded']

/**
 * 已到账的支付状态值。
 */
export const PAID = 'paid'

/**
 * 验签头名。
 */
export const SIG_HEADER = 'stripe-signature'

/*
 * (DAY_MS 2026-08-24 撤编:天毫秒收进 lib/time 的 DAY_MS)
 */

/**
 * 错误体：未配置收款（缺 STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET）。
 */
export const E_NOT_CONFIGURED = 'billing not configured'

/**
 * 错误体：要登录。
 */
export const E_LOGIN = 'login required'

/**
 * 错误体：plan 不在目录里。
 */
export const E_UNKNOWN_PLAN = 'unknown plan'

/**
 * 错误体：该包的价格环境变量没配。
 */
export const E_PRICE = 'price not configured'

/**
 * 错误体：验签失败。
 */
export const E_BAD_SIG = 'bad signature'

/**
 * 错误体：webhook 处理抛错（500 让 Stripe 重试对账）。
 */
export const E_INTERNAL = 'internal'

/**
 * Checkout 模式：一次性付款（无订阅）。
 */
export const MODE_PAYMENT = 'payment'

/**
 * wechat_pay 的 client 值（Stripe 要求 web）。
 */
export const WECHAT_CLIENT_WEB = 'web'

/**
 * 用户表的 collection 名（webhook 拨 proUntil 用）。
 */
export const COLLECTION_USERS = 'users'

/**
 * 开关型环境变量的真值写法（STRIPE_WECHAT_PAY=1）。
 */
export const ENV_ON = '1'
