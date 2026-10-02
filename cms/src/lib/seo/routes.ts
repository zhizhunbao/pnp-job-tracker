/**
 * seo 域的 HTTP 芯(第十一抽屉):GET /sitemaps/[file] —— 站点地图一个出口。
 * 2026-08-29 归目录批(Frank「能不能只有一个入口/都放到一个目录」):此前核心/分片册
 * 走 Next Metadata 框架文件(app 根 + jobs/companies 三处壳),索引另有一壳 ——
 * 四壳三处两种形;现在全家收进 /sitemaps/ 前缀、app/sitemaps/[file]/route.ts 一个壳,
 * 按件名分发。旧入口与旧核心册在 next.config 301 兜底;分片旧址不兜 —— GSC 实查
 * Google 从未读到过它们(索引 7/21 后未重读),改名零收录损失。
 *
 * 🔴 取数的 getDb 裹在兜底里(08-23 裸构建事故的不变量;库抖时 sitemap 请求也不该 500)。日志留痕不静默。
 * 2026-09-26 /fe SEO 批改判:片数固定(职位 10 片 + 公司 8 片 + 近 7 天新岗册 jobs-new.xml + 核心册 = 20 张)。
 * 2026-09-29 公司 8 片撤出(Frank「撤吧」:缺数据稿批 4 的公司核实标记落地前,公司页不报给 Google),现 12 张。
 * 2026-10-02 合成一张 jobs.xml(Frank「合成一个不行吗」「叫 jobs.xml 不行么」):index.xml / core.xml / jobs-N.xml /
 * jobs-new.xml 一律落 404;库查不到又没有旧缓存回 503(原先回 200 空册,Google 记成「已发现 0」)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { NOT_FOUND, UNAVAILABLE } from '../http'
import { getDb } from '../db/server'
import { log, SEO_LOG } from '../log'
import { fileOf, loadJobsSitemap, sitemapHeadersOf, urlsetXmlOf } from './functions'
import { SM_FILE_JOBS } from './constants'
import type { MaybeSitemap } from './types'

/**
 * GET /sitemaps/[file]:只认 jobs.xml —— 吐收录口径全部职位页的 urlset(robots 只指它,GSC 只交它)。
 * 其余件名 404;库查不到且没有旧缓存回 503(爬虫过会儿重读,不给空册)。
 *
 * @param req 触发请求(读路径末段当件名)。
 * @returns XML 响应(一小时缓存);不认识的件名 404;没数据 503。
 */
export async function sitemapFileRoute(req: Request): Promise<Response> {
  if (fileOf(req.url) !== SM_FILE_JOBS) {
    return new Response(null, { status: NOT_FOUND })
  }
  let entries: MaybeSitemap = null
  try {
    entries = await loadJobsSitemap({ db: await getDb() })
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
  }
  if (entries == null) {
    return new Response(null, { status: UNAVAILABLE })
  }
  return new Response(urlsetXmlOf(entries), { headers: sitemapHeadersOf() })
}
