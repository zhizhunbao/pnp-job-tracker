/**
 * GET /seed — 纯加载器的壳（?reset=1 清库重建；token 必带）。
 * 芯在 lib/mart/routes.ts（第十一抽屉）；URL 不动，etl/docker 调用点零改。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

export { seedRoute as GET } from '@/lib/mart/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
