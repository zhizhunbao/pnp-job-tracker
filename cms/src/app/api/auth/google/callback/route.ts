/**
 * GET /api/auth/google/callback — Google 登录第 2 跳的壳。芯在 lib/auth/routes.ts
 * (第十一抽屉,2026-08-23)。⚠️ 本目录路径登记在 Google 控制台的 redirect_uri 里,动它=登录当场断。
 *
 * @author Frank
 * @time 2026-08-01 18:59:44
 */

/**
 * 强制动态渲染。
 */
export const dynamic = 'force-dynamic'

/**
 * 跑在 node 运行时(要连库签会话)。
 */
export const runtime = 'nodejs'

export { googleCallbackRoute as GET } from '@/lib/auth/server'
