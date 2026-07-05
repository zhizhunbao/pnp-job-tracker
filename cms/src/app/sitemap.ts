// sitemap(E7-03):核心页 + 榜单 + 地区统计矩阵(E5-04 §2 的 sitemap 收录)。Next 原生约定,零依赖。
import type { MetadataRoute } from 'next'
import { PROVS, BROAD_SLUGS } from './(frontend)/stats/shared'

// ⚠️ 本路由构建期静态烘焙,而 Docker 构建拿不到 Render env(Dockerfile 无 ARG)→ 实际生效的是 fallback,必须=正式域
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

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
