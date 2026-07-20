// E8-07:职位详情页 sitemap 分片(仅 active 岗,Frank 拍板;closed 页面保留可访问但不进 sitemap+noindex)。
// 固定 8 片×5000 = 4 万容量(在库 ~2.1 万,余量足);空片返回空列表无害。robots.ts 列出全部分片。
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

// 生产坑(2026-07-20 首跑):sitemap 路由默认构建期静态烘焙——Render 构建容器查库失败 → 空片被烘死。
// force-dynamic=请求时现查(sitemap 访问频次极低,动态查无压力)。
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
export const SHARD_SIZE = 5000
export const SHARDS = 8

export function generateSitemaps() {
  return Array.from({ length: SHARDS }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  // Next 16:id 以 Promise<string> 传入(实测 dev 抓包)——await+Number 双保险,老签名也兼容
  const shard = Number(await Promise.resolve(id))
  if (!Number.isFinite(shard)) return []
  try {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as any).pool
    const { rows } = await pool.query(
      `SELECT id, last_seen FROM jobs WHERE COALESCE(status,'open') <> 'closed'
       ORDER BY id ASC LIMIT $1 OFFSET $2`, [SHARD_SIZE, shard * SHARD_SIZE])
    return rows.map((r: any) => ({
      url: `${SITE}/jobs/${r.id}`,
      lastModified: r.last_seen ? new Date(r.last_seen) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (e) { console.error('[jobs-sitemap] shard', shard, e); return [] }   // 库不可达时空片,不 500(sitemap 请求不该打挂站点)
}
