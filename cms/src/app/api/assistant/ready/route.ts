/**
 * GET /api/assistant/ready — 对话助手探活的壳。芯在 lib/assistant/routes.ts。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

export { assistantReadyRoute as GET } from '@/lib/assistant/server'

/**
 * 每次请求现算(结果随盒子在不在线变,不能在构建时定死)。
 */
export const dynamic = 'force-dynamic'
