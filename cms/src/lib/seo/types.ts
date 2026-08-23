/**
 * seo 域的形状:Next 的 Metadata 路由类型起本地名 + 分片取数的契约。
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
 * 更新频率(库类型的联合起本地名,CORE_PAGES 的 freq 落进它)。
 */
export type Freq = MetadataRoute.Sitemap[0]['changeFrequency']

/**
 * 分片计数的入参。
 */
export type ShardCountIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db
}

/**
 * 分片计数的返回。
 */
export type ShardCountOut = Promise<number>

/**
 * 取一片 URL 的入参。
 */
export type ShardPageIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 片号(0 起;不在白名单的片号框架层已 404)。
   */
  shard: number
}

/**
 * 取一片 URL 的返回(库不可达回空片,不抛 —— sitemap 请求不该打挂站点)。
 */
export type ShardPageOut = Promise<Sitemap>

/**
 * 框架分片白名单一项(generateSitemaps 的返回单元)。
 */
export type ShardId = {
  /**
   * 片号。
   */
  id: number
}

/**
 * 分片白名单的返回。
 */
export type ShardIdsOut = Promise<ShardId[]>

/**
 * sitemapindex XML 拼装的入参。
 */
export type IndexXmlIn = {
  /**
   * 职位分片数。
   */
  jobs: number

  /**
   * 公司分片数。
   */
  companies: number

  /**
   * 索引落款时刻(ISO 串)。
   */
  now: string
}

/**
 * 分片查库行:职位(id + 最近可见)。
 */
export type JobShardDbRow = {
  /**
   * 职位主键。
   */
  id: number

  /**
   * 最近可见时刻;库里可空。
   */
  last_seen: string | null
}

/**
 * 分片查库行:公司(slug + 旗下岗最近可见)。
 */
export type CoShardDbRow = {
  /**
   * 公司 slug。
   */
  slug: string

  /**
   * 旗下在招岗的最近可见;可空。
   */
  last_seen: string | null
}
