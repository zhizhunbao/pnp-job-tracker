/**
 * GET /api/version — 部署身份自报的壳。芯在 lib/version/routes.ts(第十一抽屉)。
 * 2026-08-24 下沉成域:这个壳此前从没进过任何闸名单(枚举名单漏了它),
 * 壳里带着实现也一直没人发现 —— 见 lib/version/routes.ts 的由来注释。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */
export const dynamic = 'force-dynamic'

export { versionRoute as GET } from '@/lib/version/server'
