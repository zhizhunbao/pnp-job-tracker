/**
 * GET /api/mail/run — 匹配版邮件提醒的壳(2026-08-23 api 目录与 lib 域对齐后的正名入口)。
 * 芯在 lib/mail/routes.ts(第十一抽屉);旧路径 /api/alerts/run 留过渡别名,etl 切完删。
 *
 * @author Frank
 * @time 2026-08-03 05:40:00
 */

/**
 * 跑在 node 运行时(连库 + 发信)。
 */
export const runtime = 'nodejs'

/**
 * 强制动态渲染。
 */
export const dynamic = 'force-dynamic'

/**
 * 整轮最长 5 分钟(千级用户逐个算匹配)。
 */
export const maxDuration = 300

export { alertsRunRoute as GET } from '@/lib/mail/server'
