/**
 * GET /api/stripe/payments —— 「我的订阅」付款记录(按本人的 Stripe 客户 id 现查,不落库;2026-10-08)。芯在 lib/stripe/routes.ts。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */

export { stripePaymentsRoute as GET } from '@/lib/stripe/server'
