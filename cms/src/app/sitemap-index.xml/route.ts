/**
 * GET /sitemap-index.xml — 站点地图**索引**(#156,GSC 实测暴露)。
 *
 * 背景:/sitemap.xml 是 124 条的平铺表(核心页+榜单+统计矩阵),职位页在 /jobs/sitemap/N.xml 八个分片里。
 * robots.txt 把九个都列了,但 **GSC「提交站点地图」只认你手填的那一个** —— Frank 填了 /sitemap.xml,
 * 于是 Discovered pages 只有 124,三万多个职位页 Google 一个都没从 sitemap 拿到。
 *
 * 修:提供标准 sitemapindex,一次提交覆盖全部。Next 的 MetadataRoute.Sitemap 只能产 urlset 不能产
 * sitemapindex,所以这里用 route handler 直接吐 XML(零依赖)。分片数与 jobs/sitemap.ts 的 SHARDS 同源,
 * 改那边这边自动跟。
 */
import { SHARDS } from '../(frontend)/jobs/sitemap'
import { CO_SHARDS } from '../(frontend)/companies/sitemap'   // E8-09:公司页分片并入索引

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

export function GET() {
  const now = new Date().toISOString()
  const maps = [
    `${SITE}/sitemap.xml`,
    ...Array.from({ length: SHARDS }, (_, i) => `${SITE}/jobs/sitemap/${i}.xml`),
    ...Array.from({ length: CO_SHARDS }, (_, i) => `${SITE}/companies/sitemap/${i}.xml`),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((u) => `  <sitemap><loc>${u}</loc><lastmod>${now}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
