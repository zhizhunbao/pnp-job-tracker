// robots(E7-03):放开公开页,挡 admin/api;指向 sitemap。
import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pnp-cms.onrender.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account'] }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
