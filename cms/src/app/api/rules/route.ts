/**
 * GET /api/rules?prov=XX — 某省门槛条文的壳(把脉页抽选表「门槛」弹框懒查;
 * 2026-09-13 Frank「点门槛 应该弹框吧 不应该跳页面吧」)。芯在 lib/official/routes.ts。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */

export { rulesRoute as GET } from '@/lib/official/server'
