/**
 * GET /api/employers/explore/seen — 被用户看过的公司清单的壳(带 x-seed-token;数据层排队用)。芯在 lib/employers/routes.ts。
 *
 * @author Frank
 * @time 2026-09-20 22:00:00
 */
export { employersExploreSeenRoute as GET } from '@/lib/employers/server'
