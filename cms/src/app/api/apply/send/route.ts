/**
 * POST /api/apply/send —— 代发投递信(简历 + 求职信两个附件,回复地址 = 用户注册邮箱)。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

export { applySendRoute as POST } from '@/lib/apply/server'
