/**
 * GET /api/myjobs/picks —「我的求职」今日推荐(2026-10-10 批 2)。芯在 lib/myjobs/routes.ts。
 * 2026-10-12 加 DELETE(操作列「删除」)。
 * 2026-11-11 任务书第 47 条:推荐行的删除钮撤,DELETE 随之撤。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */

export { myjobsPicksGetRoute as GET } from '@/lib/myjobs/server'
