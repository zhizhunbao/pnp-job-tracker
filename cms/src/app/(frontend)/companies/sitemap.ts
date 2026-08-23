/**
 * /companies/sitemap/[id].xml(公司分片)— 壳。芯在 lib/seo/functions.ts
 * (2026-08-23 seo 立域批;仅有在招岗的公司进片,E8-09 B)。
 * 文件名与两个导出名都是 Next 定的;force-dynamic 与 id Promise 接缝同 jobs/sitemap.ts。
 *
 * 🔴 getDb 必须在壳里裹兜底 —— 原因与 jobs/sitemap.ts 头注同(Render 构建容器无
 * PAYLOAD_SECRET,构建期收集 generateSitemaps 会现调 getPayload,不兜整个 build 红)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { getDb } from '@/lib/db/server'
import { log, SEO_LOG } from '@/lib/log'
import { loadCompanyShardIds, loadCompanyShardPage } from '@/lib/seo/server'
import type { Sitemap } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * 分片白名单。库/Payload 不可达回落 1 片,绝不 0 片。
 *
 * @returns [{id}] 列表。
 */
export async function generateSitemaps() {
  try {
    return await loadCompanyShardIds({ db: await getDb() })
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.countFail + String(e) })
    return [{ id: 0 }]
  }
}

/**
 * 一片公司 URL。库/Payload 不可达回空片,不 500。
 *
 * @param input 框架传的片号(Next 16 是 Promise)。
 * @returns 这一片的 urlset。
 */
export default async function sitemap(input: { id: number | Promise<number | string> }): Promise<Sitemap> {
  const shard = Number(await Promise.resolve(input.id))
  try {
    return await loadCompanyShardPage({ db: await getDb(), shard })
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    return []
  }
}
