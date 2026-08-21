// E8-09 B:公司详情页 sitemap 分片(仅有在招岗的公司=有内容+可收录;无岗公司页 noindex 不进)。
// 分片数按实际公司数现算,不写死 —— 同 jobs/sitemap.ts 的 2026-08-02 定案(那边有事故详述)。
// 现值约 28,119 家(6 片),没爆过;改成自适应是为了不留第二颗同款雷。
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SQL } from '@/lib/db'   // SQL 文本全在那儿,本文件只管取数与组装

// 同 jobs/sitemap.ts:force-dynamic 避免构建期烘焙查库失败(sitemap 访问频次极低)。
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
const CO_SHARD_SIZE = 5000

// 「有在招岗的公司」——列表与计数必须同一套条件,否则片数和内容对不上
const CO_FROM = SQL.CO_SITEMAP_FROM

async function pool() {
  const payload = await getPayload({ config: await config })
  return (payload.db as any).pool
}

/** 有岗公司数 → 需要几片。库不可达时回落 1 片,绝不 0 片。 */
export async function companyShardCount(): Promise<number> {
  try {
    const { rows } = await (await pool()).query(SQL.coSitemapCount(CO_FROM))
    return Math.max(1, Math.ceil((rows[0]?.n ?? 0) / CO_SHARD_SIZE))
  } catch (e) { console.error('[companies-sitemap] count', e); return 1 }
}

export async function generateSitemaps() {
  return Array.from({ length: await companyShardCount() }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  const shard = Number(await Promise.resolve(id))
  if (!Number.isFinite(shard)) return []
  try {
    const { rows } = await (await pool()).query(
      SQL.coSitemapPage(CO_FROM), [CO_SHARD_SIZE, shard * CO_SHARD_SIZE])
    return rows.map((r: any) => ({
      url: `${SITE}/companies/${r.slug}`,
      lastModified: r.last_seen ? new Date(r.last_seen) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
  } catch (e) { console.error('[companies-sitemap] shard', shard, e); return [] }
}
