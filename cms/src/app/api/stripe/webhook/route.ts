// Stripe webhook(E3-04):proUntil 的唯一写入方(字段级锁 admin-only,这里 overrideAccess 是设计意图)。
// 单事件模型:验签 → checkout 完成且 payment_status=paid → proUntil = max(now, 现值) + metadata.days。
// alipay/wechat 属异步支付方式,completed 时可能还 unpaid → 到账走 async_payment_succeeded,同一处理器。
// 幂等:拨过的 session.id 记在 user.stripeSessions,Stripe 重试/重放不重复叠加。
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type Stripe from 'stripe'
import config from '@/payload.config'
import { getStripe } from '@/lib/stripe'

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return NextResponse.json({ error: 'billing not configured' }, { status: 503 })

  const raw = await req.text()   // 验签必须 raw body,先 json() 会毁签名
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', secret)
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true })

  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true })  // 未到账不拨,等 async 事件

  const days = parseInt(session.metadata?.days || '', 10)
  const userId = session.client_reference_id
  if (!days || days <= 0 || !userId) return NextResponse.json({ received: true })  // 非本站发起的 session

  try {
    const payload = await getPayload({ config: await config })
    const user = await payload.findByID({ collection: 'users', id: userId, overrideAccess: true, disableErrors: true })
    if (!user) return NextResponse.json({ received: true })  // 用户已不存在,重试无意义

    const done: string[] = Array.isArray(user.stripeSessions) ? (user.stripeSessions as string[]) : []
    if (done.includes(session.id)) return NextResponse.json({ received: true })  // 重放幂等

    const now = new Date()
    const base = user.proUntil && new Date(user.proUntil) > now ? new Date(user.proUntil) : now  // 未过期续买=顺延,过期再买=从今起算
    await payload.update({
      collection: 'users',
      id: userId,
      overrideAccess: true,
      data: {
        proUntil: new Date(base.getTime() + days * 86400_000).toISOString(),
        stripeSessions: [...done, session.id],
        ...(typeof session.customer === 'string' ? { stripeCustomerId: session.customer } : {}),
      },
    })
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[stripe webhook]', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })  // 500 让 Stripe 重试对账
  }
}
