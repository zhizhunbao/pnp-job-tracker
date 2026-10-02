/**
 * 相关职位按页续取的壳:一行转发(2026-09-23 立,原 /api/jobs/related/occ 只管同省同职业组;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:
 * 同公司组也按页取,两组并成本接口)。芯在 lib/jobs/routes.ts。
 *
 * @author Frank
 * @time 2026-09-23 19:29:33
 */
export { jobsRelatedPageRoute as GET } from '@/lib/jobs/server'
