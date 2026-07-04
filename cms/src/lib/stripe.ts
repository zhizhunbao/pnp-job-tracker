// Stripe 单例(E3-03):key 只进服务端 env,前端永远只拿 URL 跳转。
// 未配置 STRIPE_SECRET_KEY 时返回 null,调用方自行 503 —— 站点没配支付也能正常跑。
import Stripe from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}
