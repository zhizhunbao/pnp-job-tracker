/**
 * /api/resume/file — 「我的简历」原件存取的壳(GET 取原件、PUT 上传或替换、DELETE 删)。芯在 lib/resume/routes.ts。
 * 2026-10-06 一人多份:四个方法都按 `?id=` 指明哪一份,加 PATCH(设为默认)。
 * 2026-11-12 PATCH(设为默认)随「我的简历」并页撤。
 *
 * @author Frank
 * @time 2026-10-05 22:24:38
 */

export {
  resumeFileDeleteRoute as DELETE, resumeFileGetRoute as GET, resumeFilePutRoute as PUT,
} from '@/lib/resume/server'
