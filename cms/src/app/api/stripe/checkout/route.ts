/**
 * POST /api/stripe/checkout — 发起时长包 Checkout 的壳。芯在 lib/stripe/routes.ts（第十一抽屉）。
 *
 * @author Frank
 * @time 2026-08-23 07:00:00
 */

export { stripeCheckoutRoute as POST } from '@/lib/stripe/server'
