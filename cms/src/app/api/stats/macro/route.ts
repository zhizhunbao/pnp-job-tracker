/**
 * GET /api/stats/macro — 把脉页宏观两份(macro_series + pnp_ops_stats)的壳。
 * 芯在 lib/stats/routes.ts(第十一抽屉;2026-09-10 SSR 瘦身批自 /start 直出拆出)。
 *
 * @author Frank
 * @time 2026-09-10 23:50:00
 */

export { statsMacroRoute as GET } from '@/lib/stats/server'
