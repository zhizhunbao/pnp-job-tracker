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
 * 站内回跳地址的白名单(2026-10-07 批 C:投递区升级时带 `/account?sec=sjobs&job=…`,付完回到那一岗;
 * 只认「我的」页带查询参数的地址,别的一律回账户页 —— 不做开放跳转)。
 */
export const BACK_RE = /^\/account\?[A-Za-z0-9=&_-]+$/

/**
 * 带回跳地址时,成功页尾巴上补的付成标记(账户页认 `ok=1` 出付款成功条)。
 */
export const OK_TAIL = '&ok=1'

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

/**
 * 从请求里没取到这一格时的初值(Checkout 的 plan、webhook 的验签头、metadata.days 三处共用)。
 * 三处都靠「空串取不到东西」自然落进各自的拒绝分支,不必为缺席单写一条判断:
 * `PLANS['']` 查不到 → 400 unknown plan;空签名过不了 constructEvent → 400 bad signature;
 * `parseInt('')` 是 NaN → 不拨天数、回 received 让 Stripe 别再重试。
 */
export const REQ_FIELD_NONE = ''

/**
 * 付款记录里没有收据地址时那一格的值(支付意图 / 扣款还是 id 串或空、或 Stripe 没给收据地址;前端见空串不出「收据」链)。
 */
export const RECEIPT_NONE = ''

/**
 * 十进制基数:`parseInt(session.metadata.days, RADIX_DEC)` 的第二个参数。
 * 🔴 不省、也不换成 `Number()` —— metadata 是 Stripe 那头带回来的**外部串**,不保证纯数字:
 * 省掉基数会让 `'0x10'` 这种被当十六进制读成 16;换 `Number()` 则把带尾巴的
 * `'30 days'` 从 30 变成 NaN。两样都改了语义,而这一格是往用户账上拨的**天数**。
 */
export const RADIX_DEC = 10

/**
 * 付款记录响应的缓存头:只给本人,哪一层都不许存(2026-10-08)。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 付款记录一次最多拉几笔(「我的订阅」页签;2026-10-08 懒查 Stripe,不落库)。一次性包一年最多十几笔,20 够用。
 */
export const PAYMENTS_LIMIT = 20

/**
 * 拉 Checkout 会话时顺带展开到收据:会话 → 支付意图 → 最近一笔扣款(receipt_url 在扣款上)。
 */
export const PAYMENTS_EXPAND = ['data.payment_intent.latest_charge']

/**
 * 只列付清了的会话(未付 / 取消的不出)。
 */
export const PAYMENTS_PAID = 'paid'

/**
 * Stripe 的时刻是秒,换成毫秒。
 */
export const S_TO_MS = 1000

/**
 * 金额以最小货币单位计(分);换成元。
 */
export const CENTS = 100

/**
 * 捕到的东西不是 Error(没有 message 可读)时,留痕正文那一格。
 * 日志于是只剩前缀,至少还看得出是哪一步挂的;
 * 不为了凑一句话去 String(e) —— 那印出来的可能是「object Object」,比空还难查。
 */
export const LOG_MSG_NONE = ''
