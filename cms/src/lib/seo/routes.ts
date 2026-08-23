/**
 * seo 域的 HTTP 芯(第十一抽屉):GET /sitemap-index.xml。
 * robots/sitemap 本体走 Next Metadata 框架文件(app/ 下的壳),不经这里 ——
 * 只有 sitemapindex 是标准 route handler(Next 的 MetadataRoute 产不出 sitemapindex)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { getDb } from '../db/server'
import { indexHeadersOf, indexXmlOf, loadCompanyShardCount, loadJobShardCount } from './functions'

/**
 * GET /sitemap-index.xml:现查两侧片数吐 sitemapindex(#156 GSC 只认手填的那一个 URL;
 * 这里是全站唯一的分片清单来源,robots 只指向它)。
 *
 * @param _req 触发请求(不读)。
 * @returns XML 响应(一小时缓存)。
 */
export async function sitemapIndexRoute(_req: Request): Promise<Response> {
  const db = await getDb()
  const [jobs, companies] = await Promise.all([
    loadJobShardCount({ db }), loadCompanyShardCount({ db }),
  ])
  const xml = indexXmlOf({ jobs, companies, now: new Date().toISOString() })
  return new Response(xml, { headers: indexHeadersOf() })
}
