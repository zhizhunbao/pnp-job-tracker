/**
 * GET /api/resume/files — 「我的简历」取本人简历清单的壳(2026-10-06 一人多份,取代原 /api/resume/file/meta)。
 * 芯在 lib/resume/routes.ts。
 *
 * @author Frank
 * @time 2026-10-05 22:24:38
 */

export { resumeFilesRoute as GET } from '@/lib/resume/server'
