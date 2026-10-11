/**
 * PATCH /api/inbox/prefs —— 收到回信同时转到账户邮箱的开关(2026-10-10 批 3)。芯在 lib/inbox/routes.ts。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

export { inboxPrefsRoute as PATCH } from '@/lib/inbox/server'
