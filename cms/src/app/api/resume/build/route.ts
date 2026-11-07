/**
 * POST /api/resume/build — 生成简历(填好的草稿排成英文 PDF,存成「我的简历」新的一份)的壳。
 * 芯在 lib/resume/routes.ts。
 *
 * @author Frank
 * @time 2026-11-07 15:00:00
 */

export { resumeBuildRoute as POST } from '@/lib/resume/server'
