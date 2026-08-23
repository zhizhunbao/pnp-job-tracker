/**
 * GET /api/alerts/run — ⏳ 过渡别名(2026-08-23 api 改名批):正名入口是 /api/mail/run,
 * 本壳只为 etl 的 auto_update 还在打旧路径;etl 切到新路径后整目录删掉(unsub 不动,它是冻结路径)。
 * 芯在 lib/mail/routes.ts。
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
