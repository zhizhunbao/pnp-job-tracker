// 发起时长包 Checkout(E3-03,D8 修订:一次性买断 mode=payment,无订阅无 Portal)。
// 登录用户 POST {plan:'30'|'90'} → 返回 Stripe Checkout URL,前端跳转;回跳 /account?ok=1。
// WeChat Pay 待 Dashboard 确认开通后设 STRIPE_WECHAT_PAY=1 启用(Stripe 要求 client:web)。
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getUser } from '@/lib/entitlement'
import { getStripe } from '@/lib/stripe'

const PLANS: Record<string, { days: number; priceEnv: string }> = {
  '30': { days: 30, priceEnv: 'STRIPE_PRICE_30D' },
  '90': { days: 90, priceEnv: 'STRIPE_PRICE_90D' },
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'billing not configured' }, { status: 503 })

  const user = await getUser(req.headers)
  if (!user) return NextResponse.json({ error: 'login required' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan = PLANS[String(body?.plan)]
  if (!plan) return NextResponse.json({ error: 'unknown plan' }, { status: 400 })
  const price = process.env[plan.priceEnv]
  if (!price) return NextResponse.json({ error: 'price not configured' }, { status: 503 })

  const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const wechat = process.env.STRIPE_WECHAT_PAY === '1'
  const pmTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ['card', 'alipay']
  if (wechat) pmTypes.push('wechat_pay')

  const create = (types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[]) =>
    stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      payment_method_types: types,
      ...(types.includes('wechat_pay') ? { payment_method_options: { wechat_pay: { client: 'web' } } } : {}),
      success_url: `${site}/account?ok=1`,
      cancel_url: `${site}/account`,
      client_reference_id: String(user.id),
      customer_email: user.email,
      metadata: { days: String(plan.days) },   // webhook 按它拨 proUntil,唯一真相
    })

  // 韧性兜底(E3-06):live 模式下 alipay/wechat 若未获批,带上会让整个 Checkout 建不出来 ——
  // 失败自动退回纯卡(收款可用性 > 支付方式齐全),打日志提醒去 Dashboard 确认开通
  let session: Stripe.Checkout.Session
  try {
    session = await create(pmTypes)
  } catch (e) {
    if (pmTypes.length <= 1) throw e
    console.error('[checkout] non-card methods rejected, falling back to card-only:', e instanceof Error ? e.message : e)
    session = await create(['card'])
  }
  return NextResponse.json({ url: session.url })
}
