/**
 * GET / POST /api/alerts/unsub — 周报一键退订的壳(GET=信里的退订链接;POST=邮箱界面的一键退订,2026-11-11)。芯在 lib/alerts/routes.ts(第十一抽屉)。
 * 冻结 URL:退订链接印在已发出去的邮件里,永不改路径。
 *
 * @author Frank
 * @time 2026-08-09 04:20:00
 */

export { alertsUnsubGetRoute as GET, alertsUnsubPostRoute as POST } from '@/lib/alerts/server'
