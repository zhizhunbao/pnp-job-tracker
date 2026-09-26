/**
 * GET /api/jobs/pnp — 省提名清单与抽选两张整表的壳(2026-09-26 /fe 首页 Frank:首页不再内联这两张表,
 * 字段弹框打开才懒取)。芯在 lib/jobs/routes.ts。
 *
 * @author Frank
 * @time 2026-09-26 14:20:29
 */

export { jobsPnpRoute as GET } from '@/lib/jobs/server'
