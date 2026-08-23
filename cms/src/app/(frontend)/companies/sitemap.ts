/**
 * /companies/sitemap/[id].xml(公司分片)— 壳。芯在 lib/seo/functions.ts
 * (2026-08-23 seo 立域批;仅有在招岗的公司进片,E8-09 B)。
 * 文件名与两个导出名都是 Next 定的;force-dynamic 与 id Promise 接缝同 jobs/sitemap.ts。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { getDb } from '@/lib/db/server'
import { loadCompanyShardIds, loadCompanyShardPage } from '@/lib/seo/server'
import type { Sitemap } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * 分片白名单。
 *
 * @returns [{id}] 列表。
 */
export async function generateSitemaps() {
  return loadCompanyShardIds({ db: await getDb() })
}

/**
 * 一片公司 URL。
 *
 * @param input 框架传的片号(Next 16 是 Promise)。
 * @returns 这一片的 urlset。
 */
export default async function sitemap(input: { id: number | Promise<number | string> }): Promise<Sitemap> {
  const shard = Number(await Promise.resolve(input.id))
  return loadCompanyShardPage({ db: await getDb(), shard })
}
