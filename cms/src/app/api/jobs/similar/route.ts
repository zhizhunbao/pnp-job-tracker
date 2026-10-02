/**
 * GET /api/jobs/similar — 相似雇主卡「展开 20 家」一页的壳(2026-10-02 Frank「相似雇主 3000 多?为什么只能展开 14 个」
 * 「全站统一 都改成 展开 20 和 收起」:卡头写同类总数,其余按页取到底)。芯在 lib/jobs/routes.ts。
 *
 * @author Frank
 * @time 2026-10-02 03:30:00
 */

export { jobsSimilarRoute as GET } from '@/lib/jobs/server'
