/**
 * GET /api/sitemaps/[file] — 20 张站点地图的壳(2026-08-30 三族进 api 批,自顶层
 * /sitemaps 迁入;GSC 同日二次割接指新址)。芯 sitemapFileRoute 在 lib/seo。
 * robots 为本前缀开了 Allow 洞 —— 地图唯一读者是爬虫。
 *
 * @author Frank
 * @time 2026-08-30 02:00:00
 */

export { sitemapFileRoute as GET } from '@/lib/seo/server'

/**
 * 请求时现渲(分享图/地图/灌库都要现算,不吃构建期缓存)。
 */
export const dynamic = 'force-dynamic'
