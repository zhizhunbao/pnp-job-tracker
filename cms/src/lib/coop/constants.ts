/**
 * coop 域的常量(校内板:jobs 表里 status=campus 的帖,2026-09-13 立域;设计稿 docs/design/coop域-20260913.md)。
 * 只装 JSON 装得下的标量;SQL 住 lib/db/sql.ts 第 30 段。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */

/**
 * 校内板的渠道值(jobs.origin;etl/hireac 域写的板名,mart 按它给 status=campus)。
 */
export const COOP_ORIGIN = 'hireac'

/**
 * 一次取多少行(全板 604 帖量级,整表进 SSR;超过再谈分页取数)。
 */
export const COOP_ROWS_MAX = 2000
