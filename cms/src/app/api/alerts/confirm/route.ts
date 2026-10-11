/**
 * GET /api/alerts/confirm — 换收件邮箱的确认链接(2026-10-10 批 2)。芯在 lib/alerts/routes.ts。
 * 冻结 URL:确认链接印在已发出去的确认信里,永不改路径。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */

export { alertsConfirmRoute as GET } from '@/lib/alerts/server'
