/**
 * POST /api/ops/tick —— 本机调度单元每轮调一次:探活并判定报警。芯在 lib/ops/routes.ts。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */

export { opsTickRoute as POST } from '@/lib/ops/server'
