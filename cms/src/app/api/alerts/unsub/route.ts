/**
 * GET /api/alerts/unsub — 周报一键退订的壳。芯在 lib/alerts/routes.ts(第十一抽屉)。
 * 冻结 URL:退订链接印在已发出去的邮件里,永不改路径。
 *
 * @author Frank
 * @time 2026-08-09 04:20:00
 */

export { alertsUnsubRoute as GET } from '@/lib/alerts/server'
