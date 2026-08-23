/**
 * GET /sitemap-index.xml — 站点地图索引的壳。芯在 lib/seo/routes.ts(第十一抽屉;
 * #156 GSC 只认手填的那一个 URL 的事故背景在芯的 JSDoc)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */

export { sitemapIndexRoute as GET } from '@/lib/seo/server'

export const dynamic = 'force-dynamic'
