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
