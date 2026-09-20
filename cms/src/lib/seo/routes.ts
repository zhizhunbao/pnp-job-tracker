/**
 * seo 域的 HTTP 芯(第十一抽屉):GET /sitemaps/[file] —— 20 张地图一个出口。
 * 2026-08-29 归目录批(Frank「能不能只有一个入口/都放到一个目录」):此前核心/分片册
 * 走 Next Metadata 框架文件(app 根 + jobs/companies 三处壳),索引另有一壳 ——
 * 四壳三处两种形;现在全家收进 /sitemaps/ 前缀、app/sitemaps/[file]/route.ts 一个壳,
 * 按件名分发。旧入口与旧核心册在 next.config 301 兜底;分片旧址不兜 —— GSC 实查
 * Google 从未读到过它们(索引 7/21 后未重读),改名零收录损失。
 *
 * 🔴 分片/索引取数的 getDb 裹在兜底里(08-23 裸构建事故的不变量;库抖时 sitemap
 * 请求也不该 500):索引取不到按两侧各 1 片出册(空片无害,绝不 0 片 —— 0 片 =
 * 整个 sitemap 消失),分册取不到回空册。日志留痕不静默。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { NOT_FOUND } from '../http'
import { getDb } from '../db/server'
import { log, SEO_LOG } from '../log'
import {
  coreSitemapOf, fileOf, indexHeadersOf, indexXmlOf, loadCompanyShardCount, loadCompanyShardPage,
  loadJobShardCount, loadJobShardPage, shardNoOf, urlsetXmlOf,
} from './functions'
import { SM_CO_FILE_RE, SM_FILE_CORE, SM_FILE_INDEX, SM_JOBS_FILE_RE } from './constants'
import type { Sitemap } from './types'

/**
 * GET /sitemaps/[file]:按件名分发 —— index.xml 现查两侧片数吐 sitemapindex
 * (#156 GSC 只认手填的那一个 URL,这里是全站唯一的分片清单来源,robots 只指它);
 * core.xml 吐核心页平铺册(零库依赖);jobs-N.xml / companies-N.xml 吐对应分册
 * (loadXxxShardPage 体内自带库抖兜底,这里只兜 getDb 那一口)。
 * 件名不合形 404;片号越界给空册(无害,索引不会列出越界号)。
 *
 * @param req 触发请求(读路径末段当件名)。
 * @returns XML 响应(一小时缓存);不认识的件名 404。
 */
export async function sitemapFileRoute(req: Request): Promise<Response> {
  const file = fileOf(req.url)
  if (file === SM_FILE_INDEX) {
    let jobs = 1
    let companies = 1
    try {
      const db = await getDb()
      const [j, c] = await Promise.all([loadJobShardCount({ db }), loadCompanyShardCount({ db })])
      jobs = j
      companies = c
    } catch (e) {
      log({ tag: SEO_LOG.tag, text: SEO_LOG.countFail + String(e) })
    }
    return new Response(indexXmlOf({ jobs, companies, now: new Date().toISOString() }), { headers: indexHeadersOf() })
  }
  if (file === SM_FILE_CORE) {
    return new Response(urlsetXmlOf(coreSitemapOf()), { headers: indexHeadersOf() })
  }
  const jobNo = shardNoOf({ re: SM_JOBS_FILE_RE, file: file })
  if (jobNo != null) {
    let rows: Sitemap = []
    try {
      rows = await loadJobShardPage({ db: await getDb(), shard: jobNo })
    } catch (e) {
      log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    }
    return new Response(urlsetXmlOf(rows), { headers: indexHeadersOf() })
  }
  const coNo = shardNoOf({ re: SM_CO_FILE_RE, file: file })
  if (coNo != null) {
    let rows: Sitemap = []
    try {
      rows = await loadCompanyShardPage({ db: await getDb(), shard: coNo })
    } catch (e) {
      log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    }
    return new Response(urlsetXmlOf(rows), { headers: indexHeadersOf() })
  }
  return new Response(null, { status: NOT_FOUND })
}
