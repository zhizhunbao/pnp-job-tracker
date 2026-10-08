/**
 * POST /api/queue/decline —— 跳过「今日待投」里的一岗(2026-10-08)。芯在 lib/queue/routes.ts。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */

export { queueDeclineRoute as POST } from '@/lib/queue/server'
