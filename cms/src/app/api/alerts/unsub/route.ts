/**
 * GET /api/alerts/unsub — 周报一键退订的壳。芯在 lib/mail/routes.ts(第十一抽屉,2026-08-23)。
 *
 * @author Frank
 * @time 2026-08-09 04:20:00
 */

/**
 * 跑在 node 运行时(写库)。
 */
export const runtime = 'nodejs'

/**
 * 强制动态渲染。
 */
export const dynamic = 'force-dynamic'

export { alertsUnsubRoute as GET } from '@/lib/mail/server'
