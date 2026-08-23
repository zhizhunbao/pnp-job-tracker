/**
 * GET /api/mail/run — 匹配版邮件提醒的壳(2026-08-23 api 目录与 lib 域对齐后的正名入口)。
 * 芯在 lib/mail/routes.ts(第十一抽屉);旧路径 /api/alerts/run 别名已随 etl 切换删除(2026-08-23)。
 *
 * @author Frank
 * @time 2026-08-03 05:40:00
 */

export { mailRunRoute as GET } from '@/lib/mail/server'
