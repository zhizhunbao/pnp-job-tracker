/**
 * GET /sitemaps/[file] —— 20 张站点地图的唯一壳(2026-08-29 归目录批,Frank
 * 「能不能只有一个入口/都放到一个目录」)。芯在 lib/seo/routes.ts 的 sitemapFileRoute,
 * 按件名分发 index/core/jobs-N/companies-N;旧四壳(app/sitemap.ts、
 * app/sitemap-index.xml/、jobs 与 companies 的 sitemap.ts)同批退役,
 * 旧入口与旧核心册在 next.config 301 兜底。
 *
 * @author Frank
 * @time 2026-08-29 23:30:00
 */

export { sitemapFileRoute as GET } from '@/lib/seo/server'

export const dynamic = 'force-dynamic'
