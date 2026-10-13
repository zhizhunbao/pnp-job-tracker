/**
 * GET /api/myjobs/applied —「我的求职」取本人投过的岗(2026-10-06)。芯在 lib/myjobs/routes.ts。
 * 2026-10-12 加 DELETE(操作列「删除」)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */

export { myjobsAppliedDeleteRoute as DELETE, myjobsAppliedGetRoute as GET } from '@/lib/myjobs/server'
