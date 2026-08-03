// robots(E7-03):放开公开页,挡 admin/api;指向 sitemap。
import type { MetadataRoute } from 'next'

// ⚠️ 本路由构建期烘焙 + Docker 构建拿不到 Render env → fallback 必须=正式域。
// 同理**这里绝不能查库**(构建容器连不上正式库),所以分片清单交给 /sitemap-index.xml 现查现给。
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account'] }],
    // 2026-08-02:原先这里把每个分片逐条枚举,数字写死 → 分片数一变就得同步改,正是撑爆 sitemap 的
    // 同一颗雷。sitemapindex 是 sitemaps.org 0.9 标准格式,主流爬虫都认,只指索引即可。
    // 索引放第一位——GSC 手动提交只认一个 URL,提交索引即覆盖全部分片。
    sitemap: [`${SITE}/sitemap-index.xml`, `${SITE}/sitemap.xml`],
  }
}
