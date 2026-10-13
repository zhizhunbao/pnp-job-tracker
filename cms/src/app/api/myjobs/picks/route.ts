/**
 * GET /api/myjobs/picks —「我的求职」今日推荐(2026-10-10 批 2)。芯在 lib/myjobs/routes.ts。
 * 2026-10-12 加 DELETE(操作列「删除」)。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */

export { myjobsPicksDeleteRoute as DELETE, myjobsPicksGetRoute as GET } from '@/lib/myjobs/server'
