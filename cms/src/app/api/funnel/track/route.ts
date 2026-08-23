/**
 * POST /api/funnel/track — 第一方漏斗计数的壳。芯在 lib/funnel/routes.ts(第十一抽屉,2026-08-23)。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */

/**
 * 强制动态渲染(计数端点没有可缓存的东西)。
 */
export const dynamic = 'force-dynamic'

/**
 * 跑在 node 运行时(要连库)。
 */
export const runtime = 'nodejs'

export { trackRoute as POST } from '@/lib/funnel/server'
