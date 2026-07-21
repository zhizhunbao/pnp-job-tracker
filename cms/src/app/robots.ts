// robots(E7-03):放开公开页,挡 admin/api;指向 sitemap。
import type { MetadataRoute } from 'next'
import { SHARDS } from './(frontend)/jobs/sitemap'   // #156:分片数单一来源(原先这里写死 8,与 sitemap.ts 各写一份)

// ⚠️ 同 sitemap.ts:构建期烘焙 + Docker 构建无 env → fallback 必须=正式域
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account'] }],
    // #156:索引放第一位——GSC 手动提交只认一个 URL,提交索引即覆盖全部分片(实测只提交 /sitemap.xml
    // 时 Discovered pages 仅 124,三万职位页一个都没进);分片仍逐个列出,给不认索引的爬虫兜底。
    sitemap: [
      `${SITE}/sitemap-index.xml`,
      `${SITE}/sitemap.xml`,
      ...Array.from({ length: SHARDS }, (_, i) => `${SITE}/jobs/sitemap/${i}.xml`),
    ],
  }
}
