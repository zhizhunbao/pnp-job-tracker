/**
 * GET /api/stats/cities?prov= — 一个省的城市清单(城市英文名 + 中韩译名 + 在招岗数)的壳。
 * 芯在 lib/stats/routes.ts(2026-10-09「我的档案」批:所在地答案的可选城市下拉)。
 *
 * @author Frank
 * @time 2026-10-09 20:00:00
 */

export { statsCitiesRoute as GET } from '@/lib/stats/server'
