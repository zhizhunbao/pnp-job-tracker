// sitemap(E7-03):核心页 + 榜单 + 地区统计矩阵(E5-04 §2 的 sitemap 收录)。Next 原生约定,零依赖。
import type { MetadataRoute } from 'next'
import { PROVS, BROAD_SLUGS } from './(frontend)/stats/shared'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pnp-cms.onrender.com').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const url = (path: string, priority: number, freq: MetadataRoute.Sitemap[0]['changeFrequency'] = 'daily') =>
    ({ url: `${SITE}${path}`, lastModified: now, changeFrequency: freq, priority })

  const core = [
    url('/jobs', 1),
    url('/pricing', 0.8, 'weekly'),
    url('/about', 0.5, 'monthly'),
    url('/legal/disclaimer', 0.3, 'monthly'),
    url('/legal/privacy', 0.3, 'monthly'),
    url('/legal/terms', 0.3, 'monthly'),
    url('/rankings/weekly-top', 0.9),
    url('/rankings/sponsor-likely', 0.9),
    url('/stats', 0.8),
  ]
  const stats = PROVS.flatMap((p) => [
    url(`/stats/${p.toLowerCase()}`, 0.7),
    ...BROAD_SLUGS.map(([slug]) => url(`/stats/${p.toLowerCase()}/${slug}`, 0.6)),
  ])
  return [...core, ...stats]
}
