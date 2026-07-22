// E8-09 B:公司详情页 sitemap 分片(仅有在招岗的公司=有内容+可收录;无岗公司页 noindex 不进)。
// 固定 8 片×5000 = 4 万容量(有岗公司 ~2.3 万,余量足);空片返回空列表无害。robots.ts + sitemap-index 列出全部分片。
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

// 同 jobs/sitemap.ts:force-dynamic 避免构建期烘焙查库失败(sitemap 访问频次极低)。
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
export const CO_SHARD_SIZE = 5000
export const CO_SHARDS = 8

export function generateSitemaps() {
  return Array.from({ length: CO_SHARDS }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  const shard = Number(await Promise.resolve(id))
  if (!Number.isFinite(shard)) return []
  try {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as any).pool
    // 只收有在招岗的公司(DISTINCT company_id),按 id 稳定分片
    const { rows } = await pool.query(
      `SELECT c.slug, max(j.last_seen) AS last_seen
       FROM companies c JOIN jobs j ON j.company_id = c.id
       WHERE COALESCE(j.status,'open') <> 'closed' AND c.slug IS NOT NULL AND c.slug <> ''
       GROUP BY c.id, c.slug
       ORDER BY c.id ASC LIMIT $1 OFFSET $2`, [CO_SHARD_SIZE, shard * CO_SHARD_SIZE])
    return rows.map((r: any) => ({
      url: `${SITE}/companies/${r.slug}`,
      lastModified: r.last_seen ? new Date(r.last_seen) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
  } catch (e) { console.error('[companies-sitemap] shard', shard, e); return [] }
}
