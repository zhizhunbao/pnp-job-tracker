/**
 * GET /api/stats/city — 把脉页城市段五份(城市全量榜 / 城 × 大类 / 大类三语名 / 试点社区 / 城市 DLI)的壳。
 * 芯在 lib/stats/routes.ts(2026-09-11 城市段重设计批,设计稿 docs/design/把脉页城市段-20260911.md)。
 *
 * @author Frank
 * @time 2026-09-11 16:30:00
 */

export { statsCityRoute as GET } from '@/lib/stats/server'
