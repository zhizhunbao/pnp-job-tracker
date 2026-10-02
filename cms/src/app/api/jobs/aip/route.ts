/**
 * GET /api/jobs/aip — AIP 弹框指定雇主卡的壳(2026-10-02 三弹框统一第 3 步,Frank「不需要一次查询 1574 家吧」:弹框打开才按省 +
 * 本岗公司归一名取本岗雇主与同招牌的几家)。芯在 lib/jobs/routes.ts。
 *
 * @author Frank
 * @time 2026-10-02 00:40:00
 */

export { jobsAipRoute as GET } from '@/lib/jobs/server'
