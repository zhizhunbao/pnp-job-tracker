/**
 * GET /api/alerts/run — 跑一轮提醒的壳。芯在 lib/alerts/routes.ts(第十一抽屉;
 * 2026-08-23 两域拍板后 alerts 即正名,当日上午的 /api/mail/run 方向作废未上生产)。
 * etl 的 auto_update seed 成功后打这里(同一把 x-seed-token)。
 *
 * @author Frank
 * @time 2026-08-03 05:40:00
 */

export { alertsRunRoute as GET } from '@/lib/alerts/server'
