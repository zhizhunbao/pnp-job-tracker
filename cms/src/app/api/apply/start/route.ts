/**
 * GET /api/apply/start?job=<id> —— 「我的」页投递一节的起始态(本岗、简历清单、署名、模板、状态)。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */

export { applyStartRoute as GET } from '@/lib/apply/server'
