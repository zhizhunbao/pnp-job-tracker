/**
 * /jobs/sitemap/[id].xml(职位分片)— 壳。芯在 lib/seo/functions.ts(2026-08-23 seo 立域批;
 * 分片自适应的 2026-08-02 撑爆定案与 Next 16 白名单机制详见芯的 JSDoc)。
 * 文件名与两个导出名都是 Next 定的;force-dynamic = 请求时现查
 * (构建期烘焙会在构建容器里查库失败烘出空片,2026-07-20 首跑实撞)。
 * 入口一行 getDb 注入(方案 A);id 在 Next 16 以 Promise<string> 传入(实测 dev 抓包),
 * await+Number 双保险是框架签名的接缝,留在壳里。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { getDb } from '@/lib/db/server'
import { loadJobShardIds, loadJobShardPage } from '@/lib/seo/server'
import type { Sitemap } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * 分片白名单(Next 每次请求都 await 它并用它校验片号)。
 *
 * @returns [{id}] 列表。
 */
export async function generateSitemaps() {
  return loadJobShardIds({ db: await getDb() })
}

/**
 * 一片职位 URL。
 *
 * @param input 框架传的片号(Next 16 是 Promise)。
 * @returns 这一片的 urlset。
 */
export default async function sitemap(input: { id: number | Promise<number | string> }): Promise<Sitemap> {
  const shard = Number(await Promise.resolve(input.id))
  return loadJobShardPage({ db: await getDb(), shard })
}
