/**
 * GET /api/auth/google — Google 登录第 1 跳的壳。芯在 lib/auth/routes.ts(第十一抽屉,2026-08-23)。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */

/**
 * 强制动态渲染(每次都要新 state)。
 */
export const dynamic = 'force-dynamic'

export { googleStartRoute as GET } from '@/lib/auth/server'
