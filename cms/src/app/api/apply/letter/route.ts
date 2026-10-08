/**
 * POST /api/apply/letter —— 按这一岗的 JD 与所选简历写求职信(模型通道见环境变量 APPLY_LETTER_PROVIDER)。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-07 06:00:00
 */

export { applyLetterRoute as POST } from '@/lib/apply/server'
