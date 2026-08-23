/**
 * /jobs/sitemap/[id].xml(职位分片)— 壳。芯在 lib/seo/functions.ts(2026-08-23 seo 立域批;
 * 分片自适应的 2026-08-02 撑爆定案与 Next 16 白名单机制详见芯的 JSDoc)。
 * 文件名与两个导出名都是 Next 定的;force-dynamic = 请求时现查。
 * 入口一行 getDb 注入(方案 A);id 在 Next 16 以 Promise<string> 传入(实测 dev 抓包),
 * await+Number 双保险是框架签名的接缝,留在壳里。
 *
 * 🔴 getDb 必须在壳里裹兜底(2026-08-23 Render 实撞,2026-07-20 老坑重踩):force-dynamic
 * 挡不住 Next 构建期收集 generateSitemaps,而 Render 构建容器没有 PAYLOAD_SECRET ——
 * getPayload 一抛整个 build 红。老文件的 try/catch 连着取连接一起兜(回落 1 片),
 * 取数下沉后 getDb 挪出了兜底,这层守护必须跟着搬进壳。本地 build 有 .env,闸测不出这类差异。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { getDb } from '@/lib/db/server'
import { log, SEO_LOG } from '@/lib/log'
import { loadJobShardIds, loadJobShardPage } from '@/lib/seo/server'
import type { Sitemap } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * 分片白名单(Next 每次请求都 await 它并用它校验片号)。
 * 库/Payload 不可达回落 1 片(空片无害),绝不 0 片(0 片 = 整个 sitemap 消失)。
 *
 * @returns [{id}] 列表。
 */
export async function generateSitemaps() {
  try {
    return await loadJobShardIds({ db: await getDb() })
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.countFail + String(e) })
    return [{ id: 0 }]
  }
}

/**
 * 一片职位 URL。库/Payload 不可达回空片,不 500(sitemap 请求不该打挂站点)。
 *
 * @param input 框架传的片号(Next 16 是 Promise)。
 * @returns 这一片的 urlset。
 */
export default async function sitemap(input: { id: number | Promise<number | string> }): Promise<Sitemap> {
  const shard = Number(await Promise.resolve(input.id))
  try {
    return await loadJobShardPage({ db: await getDb(), shard })
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    return []
  }
}
