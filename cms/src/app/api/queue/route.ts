/**
 * GET /api/queue —— 本人的「今日待投」(智能投递队列 + 开关 + 条件齐不齐;2026-10-08)。芯在 lib/queue/routes.ts。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */

export { queueRoute as GET } from '@/lib/queue/server'
