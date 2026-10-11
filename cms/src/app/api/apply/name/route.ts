/**
 * PATCH /api/apply/name —— 存投递署名(2026-10-10 Frank「删吧」:原 /api/queue/prefs 随智能投递撤,署名搬到 apply 域)。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-10 21:00:00
 */

export { applyNameRoute as PATCH } from '@/lib/apply/server'
