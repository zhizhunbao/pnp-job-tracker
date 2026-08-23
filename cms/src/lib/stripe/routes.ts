/**
 * 支付域的 HTTP 芯(第十一抽屉):/api/stripe/checkout(发起时长包 Checkout)与
 * /api/stripe/webhook(proUntil 的唯一写入方;URL 冻结 —— Stripe 后台配置指着它)。
 * 两处跨边界断言:stripeCheckoutRoute 的 `await req.json() as CheckoutBody`(网络 body
 * 先按声明形状收下再验);stripeWebhookRoute 的 `event.data.object as
 * StripeCheckoutSession`(事件形状由 Stripe 定,验签通过后按 HANDLED_EVENTS 收窄)。
 *
 * @author Frank
 * @time 2026-08-23 07:00:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import type Stripe from 'stripe'
import { BAD_REQUEST, SERVER_ERROR, UNAUTHORIZED, UNAVAILABLE } from '../http'
import { log, STRIPE_LOG } from '../log'
import { getUser } from '../quota/server'
import {
  CANCEL_PATH, COLLECTION_USERS, DAY_MS, E_BAD_SIG, E_INTERNAL, E_LOGIN, E_NOT_CONFIGURED, E_PRICE,
  E_UNKNOWN_PLAN, HANDLED_EVENTS, MODE_PAYMENT, PAID, PLANS, PM_ALIPAY, PM_CARD, PM_WECHAT, SIG_HEADER,
  ENV_ON, SUCCESS_PATH, WECHAT_CLIENT_WEB,
} from './constants'
import { getStripe } from './functions'
import type { CheckoutBody, CreateSessionIn, PayMethod, StripeCheckoutSession, WebhookUserDoc } from './types'

/**
 * POST /api/stripe/checkout {plan}:发起时长包 Checkout(E3-03,一次性买断 mode=payment)。
 * 韧性兜底(E3-06):live 模式下 alipay/wechat 若未获批,带上会让整个 Checkout 建不出来 ——
 * 失败自动退回纯卡(收款可用性 > 支付方式齐全),打日志提醒去 Dashboard 确认开通。
 * metadata.days 是 webhook 拨 proUntil 的唯一真相。
 *
 * @param req 请求(body 是 { plan: '30'|'90' })。
 * @returns { url } Checkout 跳转地址;未配置 503、未登录 401、plan 非法 400。
 */
export async function stripeCheckoutRoute(req: Request): Promise<Response> {
  const stripe = getStripe()
  if (stripe == null) {
    return Response.json({ error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  const user = await getUser(req.headers)
  if (user == null) {
    return Response.json({ error: E_LOGIN }, { status: UNAUTHORIZED })
  }
  let body: CheckoutBody | null = null
  try {
    body = await req.json() as CheckoutBody
  } catch {
    body = null
  }
  let planKey = ''
  if (body != null) {
    planKey = String(body.plan)
  }
  const plan = PLANS[planKey]
  if (plan == null) {
    return Response.json({ error: E_UNKNOWN_PLAN }, { status: BAD_REQUEST })
  }
  const price = process.env[plan.priceEnv]
  if (price == null || price === '') {
    return Response.json({ error: E_PRICE }, { status: UNAVAILABLE })
  }
  let site = new URL(req.url).origin
  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (siteEnv != null && siteEnv !== '') {
    site = siteEnv
  }
  const pmTypes: PayMethod[] = [PM_CARD, PM_ALIPAY]
  if (process.env.STRIPE_WECHAT_PAY === ENV_ON) {
    pmTypes.push(PM_WECHAT)
  }
  let session: Stripe.Checkout.Session
  try {
    session = await createSession({ stripe, types: pmTypes, price, site, userId: String(user.id), email: user.email, days: plan.days })
  } catch (e) {
    if (pmTypes.length <= 1) {
      throw e
    }
    let msg = ''
    if (e instanceof Error) {
      msg = e.message
    }
    log({ tag: STRIPE_LOG.tag, text: STRIPE_LOG.fallbackCard + msg })
    session = await createSession({ stripe, types: [PM_CARD], price, site, userId: String(user.id), email: user.email, days: plan.days })
  }
  return Response.json({ url: session.url })
}

/**
 * POST /api/stripe/webhook:proUntil 的唯一写入方(字段级锁 admin-only,这里 overrideAccess
 * 是设计意图)。单事件模型:验签 → checkout 完成且 payment_status=paid → proUntil =
 * max(now, 现值) + metadata.days。幂等:拨过的 session.id 记在 user.stripeSessions,
 * Stripe 重试/重放不重复叠加。验签必须 raw body(先 json() 会毁签名)。
 *
 * @param req 请求(Stripe 事件)。
 * @returns { received };验签失败 400、处理抛错 500(让 Stripe 重试对账)。
 */
// eslint-disable-next-line local/function-length -- 76 行:验签→筛事件→幂等→拨天数一条不可拆的对账流水,每步都握着上一步的产物;拆开就是把钱链路的中间量摊给一串传参
export async function stripeWebhookRoute(req: Request): Promise<Response> {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (stripe == null || secret == null || secret === '') {
    return Response.json({ error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  const raw = await req.text()
  let sig = ''
  const sigHeader = req.headers.get(SIG_HEADER)
  if (sigHeader != null) {
    sig = sigHeader
  }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch {
    return Response.json({ error: E_BAD_SIG }, { status: BAD_REQUEST })
  }
  if (HANDLED_EVENTS.includes(event.type) === false) {
    return Response.json({ received: true })
  }
  const session = event.data.object as StripeCheckoutSession
  if (session.payment_status !== PAID) {
    return Response.json({ received: true })
  }
  let daysRaw = ''
  if (session.metadata != null && session.metadata.days != null) {
    daysRaw = session.metadata.days
  }
  const days = parseInt(daysRaw, 10)
  const userId = session.client_reference_id
  if (Number.isFinite(days) === false || days <= 0 || userId == null || userId === '') {
    return Response.json({ received: true })
  }
  try {
    const payload = await getPayload({ config: await config })
    const rawUser = await payload.findByID({ collection: COLLECTION_USERS, id: userId, overrideAccess: true, disableErrors: true })
    if (rawUser == null) {
      return Response.json({ received: true })
    }
    const user = rawUser as WebhookUserDoc
    let done: string[] = []
    if (Array.isArray(user.stripeSessions)) {
      done = user.stripeSessions
    }
    if (done.includes(session.id)) {
      return Response.json({ received: true })
    }
    const now = new Date()
    let base = now
    if (user.proUntil != null && new Date(user.proUntil) > now) {
      base = new Date(user.proUntil)
    }
    const proUntil = new Date(base.getTime() + days * DAY_MS).toISOString()
    const sessions = done.concat([session.id])
    if (typeof session.customer === 'string') {
      await payload.update({
        collection: COLLECTION_USERS, id: userId, overrideAccess: true,
        data: { proUntil: proUntil, stripeSessions: sessions, stripeCustomerId: session.customer },
      })
    } else {
      await payload.update({
        collection: COLLECTION_USERS, id: userId, overrideAccess: true,
        data: { proUntil: proUntil, stripeSessions: sessions },
      })
    }
    return Response.json({ received: true })
  } catch (e) {
    let msg = ''
    if (e instanceof Error) {
      msg = e.message
    }
    log({ tag: STRIPE_LOG.tag, text: STRIPE_LOG.webhookFailed + msg })
    return Response.json({ error: E_INTERNAL }, { status: SERVER_ERROR })
  }
}

/**
 * 建一个 Checkout 会话(主尝试与退卡兜底两处共用;支付方式之外的参数完全一致)。
 * 体内 wechat_pay 才带 payment_method_options(Stripe 要求 client:web)。
 *
 * @param input Stripe 客户端、支付方式、价格、站点与用户三样。
 * @returns 会话。
 */
// eslint-disable-next-line local/routes-shape -- 主尝试与退卡兜底共用的会话构建小件,非 HTTP 芯本体
function createSession(input: CreateSessionIn): Promise<Stripe.Checkout.Session> {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: MODE_PAYMENT,
    line_items: [{ price: input.price, quantity: 1 }],
    payment_method_types: input.types,
    success_url: input.site + SUCCESS_PATH,
    cancel_url: input.site + CANCEL_PATH,
    client_reference_id: input.userId,
    customer_email: input.email,
    metadata: { days: String(input.days) },
  }
  if (input.types.includes(PM_WECHAT)) {
    params.payment_method_options = { wechat_pay: { client: WECHAT_CLIENT_WEB } }
  }
  return input.stripe.checkout.sessions.create(params)
}
