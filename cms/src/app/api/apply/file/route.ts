/**
 * GET /api/apply/file?id=<投递行>&kind=resume|cover —— 「我的求职」一行的简历 / 求职信附件。芯在 lib/apply/routes.ts。
 *
 * @author Frank
 * @time 2026-10-07 06:00:00
 */

export { applyFileRoute as GET } from '@/lib/apply/server'
