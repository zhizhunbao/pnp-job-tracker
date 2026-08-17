// E8-07:职位详情页 sitemap 分片(仅 active 岗,Frank 拍板;closed 页面保留可访问但不进 sitemap+noindex)。
//
// ⚠️ 2026-08-02 事故 + 定案:分片数**不再写死**。
// 原先 `SHARDS = 8` 固定 4 万容量,被在库 45,883 个在招岗撑爆(实测,按本文件的 ACTIVE 条件)。撑爆的方式是静默的:
// `ORDER BY id ASC LIMIT/OFFSET` 只取前 4 万,砍掉的正好是 **id 最大 = 最新入库的那批岗**
// (末片止于 id 11976493,而当日新岗 id 已到 15729081)—— 恰好砍掉最该被 Google 抓的那头,
// 无报错无日志。手动扩容只是把同一颗雷往后埋,所以改成按实际岗位数现算片数:岗位涨,片数自己涨。
//
// 关键前提(读 next-metadata-route-loader 源码确认):Next 16 的分片路由**每次请求都会 await
// generateSitemaps()**,并用它当白名单校验 id —— 所以它①可以是 async 查库,②不列出的 id 会 404
// (这也是扩容必须同时改这个函数的原因,光加容量不改白名单没用)。
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import * as SQL from '@/lib/db/sql'   // SQL 文本全在那儿,本文件只管取数与组装

// 生产坑(2026-07-20 首跑):sitemap 路由默认构建期静态烘焙——Render 构建容器查库失败 → 空片被烘死。
// force-dynamic=请求时现查(sitemap 访问频次极低,动态查无压力)。
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
export const SHARD_SIZE = 5000
const ACTIVE = `COALESCE(status,'open') <> 'closed'`

async function pool() {
  const payload = await getPayload({ config: await config })
  return (payload.db as any).pool
}

/** 在招岗数 → 需要几片。库不可达时回落 1 片(空片无害),绝不 0 片(0 片 = 整个 sitemap 消失)。 */
export async function jobShardCount(): Promise<number> {
  try {
    const { rows } = await (await pool()).query(SQL.jobsSitemapCount(ACTIVE))
    return Math.max(1, Math.ceil((rows[0]?.n ?? 0) / SHARD_SIZE))
  } catch (e) { console.error('[jobs-sitemap] count', e); return 1 }
}

export async function generateSitemaps() {
  return Array.from({ length: await jobShardCount() }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  // Next 16:id 以 Promise<string> 传入(实测 dev 抓包)——await+Number 双保险,老签名也兼容
  const shard = Number(await Promise.resolve(id))
  if (!Number.isFinite(shard)) return []
  try {
    const { rows } = await (await pool()).query(
      SQL.jobsSitemapPage(ACTIVE), [SHARD_SIZE, shard * SHARD_SIZE])
    return rows.map((r: any) => ({
      url: `${SITE}/jobs/${r.id}`,
      lastModified: r.last_seen ? new Date(r.last_seen) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (e) { console.error('[jobs-sitemap] shard', shard, e); return [] }   // 库不可达时空片,不 500(sitemap 请求不该打挂站点)
}
