/**
 * POST /api/apply/inbound —— Resend 回调(退信 / 投诉记进退信名单;URL 冻结,下一批中转回信同一个口)。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

export { applyInboundRoute as POST } from '@/lib/apply/server'
