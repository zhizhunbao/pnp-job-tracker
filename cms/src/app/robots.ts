// robots(E7-03):放开公开页,挡 admin/api;指向 sitemap。
import type { MetadataRoute } from 'next'

// ⚠️ 同 sitemap.ts:构建期烘焙 + Docker 构建无 env → fallback 必须=正式域
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account'] }],
    // E8-07:职位详情页 sitemap 分片(app/(frontend)/jobs/sitemap.ts generateSitemaps,固定 8 片)
    sitemap: [`${SITE}/sitemap.xml`, ...Array.from({ length: 8 }, (_, i) => `${SITE}/jobs/sitemap/${i}.xml`)],
  }
}
