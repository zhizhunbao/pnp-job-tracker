/**
 * POST /api/stripe/webhook — proUntil 唯一写入方的壳。芯在 lib/stripe/routes.ts（第十一抽屉）。
 * ⚠️ URL 冻结：Stripe 后台 webhook 配置指着它，改路径要先改 Dashboard。
 *
 * @author Frank
 * @time 2026-08-23 07:00:00
 */

export { stripeWebhookRoute as POST } from '@/lib/stripe/server'
