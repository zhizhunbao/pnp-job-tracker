/**
 * 榜单域的死值:榜 slug 白名单。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 全部合法榜 slug(固定两榜 + 每日总榜 + 每日分类榜)。路由先过它再取数。
 * `daily-top-*` 的大类段(E9-02)与 etl/10_build_rankings 的 BROAD_SLUG 镜像,勿单改。
 */
export const RANKING_SLUGS = new Set([
  'weekly-top', 'sponsor-likely', 'daily-top',
  'daily-top-tech', 'daily-top-health', 'daily-top-trades', 'daily-top-service', 'daily-top-business',
  'daily-top-education', 'daily-top-manufacturing', 'daily-top-resources', 'daily-top-arts', 'daily-top-management',
])

/**
 * /api/rankings/data 的榜名参数。
 */
export const P_SLUG = 'slug'

/**
 * 请求里没带 slug 参数时的起点值。空串一定不在 RANKING_SLUGS 白名单里,所以
 * `?slug=` 缺席与 `?slug=乱写` 走同一条路 —— 都落 400,不会因为「参数没给」就
 * 悄悄回落到某个默认榜(默认榜等于替调用方选了一份数据,而这是个公开只读接口,
 * 返回的榜单名必须是他自己点的)。
 */
export const SLUG_NONE = ''
