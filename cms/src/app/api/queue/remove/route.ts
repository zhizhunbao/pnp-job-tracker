/**
 * POST /api/queue/remove —— 管理员在队列页删一条(2026-11-06 Frank「全都加一个删除按钮」)。芯在 lib/queue/routes.ts。
 *
 * @author Frank
 * @time 2026-11-06 00:40:00
 */

export { queueRemoveRoute as POST } from '@/lib/queue/server'
