/**
 * seo 域的形状:Next 的 Metadata 路由类型起本地名 + 职位站点地图取数的契约。
 * 2026-10-02 站点地图合成一个 jobs.xml(Frank「合成一个不行吗」「叫 jobs.xml 不行么」):索引 / 核心册 / 取模分片 /
 * 近 7 天新岗册的形状随之撤(IndexXmlIn、ShardPageIn、ShardOfIn、ShardModsIn、IndexItemIn、ShardNoIn 等)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import type { MetadataRoute } from 'next'
import type { Db } from '@/lib/db'

/**
 * 一张 urlset 站点地图(Next 库类型起本地名)。
 */
export type Sitemap = MetadataRoute.Sitemap

/**
 * 站点地图单条。
 */
export type SitemapEntry = MetadataRoute.Sitemap[0]

/**
 * robots.txt 的结构(Next 库类型起本地名)。
 */
export type Robots = MetadataRoute.Robots

/**
 * 更新频率(库类型的联合起本地名)。
 */
export type Freq = MetadataRoute.Sitemap[0]['changeFrequency']

/**
 * 职位清单取数的入参(原名 ShardRowsIn,分片撤后改名)。
 */
export type SitemapRowsIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db
}

/**
 * 站点地图条目或没有(null = 库查不到且没有旧缓存,出口回 503 让爬虫过会儿再来,不给空册)。
 */
export type MaybeSitemap = Sitemap | null

/**
 * `loadJobsSitemap` 的返回。
 */
export type JobsSitemapOut = Promise<MaybeSitemap>

/**
 * 职位清单查库行(id + lastmod;2026-10-02 前多一格近 7 天旗 fresh,随新岗册撤)。
 */
export type SitemapJobDbRow = {
  /**
   * 职位主键。
   */
  id: number

  /**
   * 上架时刻与整理版生成时刻取晚(SQL 里 GREATEST);库里可空。
   */
  mod: PgTime
}

/**
 * 职位清单一行(行构造器洗净:时刻折毫秒)。
 */
export type SitemapJobFact = {
  /**
   * 职位主键。
   */
  id: number

  /**
   * lastmod(毫秒);null = 库里没有真事件时刻,出口整格不出。
   */
  mod: MaybeMs
}

/**
 * 职位清单(id 升序)。
 */
export type SitemapJobFacts = SitemapJobFact[]

/**
 * 职位清单或没有(null = 没拉成过、也没有旧缓存)。
 */
export type MaybeSitemapJobFacts = SitemapJobFacts | null

/**
 * 职位清单全量的返回(缓存槽里的行,或 null)。
 */
export type SitemapJobsOut = Promise<MaybeSitemapJobFacts>

/**
 * pg 交回的时刻格(timestamptz 驱动解析成 Date;库里 NULL 是 null)。
 */
export type PgTime = Date | null

/**
 * 毫秒时刻或没有。
 */
export type MaybeMs = number | null

/**
 * entryOf() 入参:一条 urlset 的三格。
 */
export type EntryIn = {
  /**
   * 页面完整网址。
   */
  url: string

  /**
   * 优先级。
   */
  priority: number

  /**
   * lastmod(毫秒);null 整格不出。
   */
  mod: MaybeMs
}

/**
 * 职位清单的缓存槽(全量行 + 落槽时刻)。
 */
export type SitemapJobsSlot = {
  /**
   * 收录口径的岗全量(按 id 升序)。
   */
  rows: SitemapJobFacts

  /**
   * 落槽时刻(毫秒;TTL 判过期)。
   */
  ts: number
}

/**
 * 后台刷新一次的返回(只落槽,不回值)。
 */
export type RefreshOut = Promise<void>

/**
 * seo 域全部可变状态的形状。
 */
export type SeoCache = {
  /**
   * 职位清单;没拉过 null,过期由 TTL 判。
   */
  jobs: SitemapJobsSlot | null

  /**
   * 职位清单正在后台刷新(防过期瞬间多请求同时打库)。
   */
  jobsBusy: boolean
}
