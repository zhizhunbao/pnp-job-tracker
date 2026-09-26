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
 * 分片清单取数的入参(2026-09-26 前叫 ShardCountIn「分片计数的入参」;计数随固定片数退役,清单取数沿用这个形)。
 */
export type ShardRowsIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db
}

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
 * sitemapindex XML 拼装的入参(2026-09-26 由「两侧片数 + 落款时刻」改成两侧清单:片数固定,落款取片内最晚)。
 */
export type IndexXmlIn = {
  /**
   * 职位清单全量(空表 = 库抖且没有旧表;索引照列满全部分片,只是不给 lastmod)。
   */
  jobs: JobShardFacts

  /**
   * 公司清单全量(同上)。
   */
  companies: CoShardFacts
}

/**
 * `loadIndexRows` 的返回(两侧清单,即 sitemapindex 拼装的入参)。
 */
export type IndexRowsOut = Promise<IndexXmlIn>

/**
 * 分片查库行:职位(id + lastmod + 近 7 天旗;2026-09-26 前是 id + 最近可见 last_seen)。
 */
export type JobShardDbRow = {
  /**
   * 职位主键。
   */
  id: number

  /**
   * 上架时刻与整理版生成时刻取晚(SQL 里 GREATEST);库里可空。
   */
  mod: PgTime

  /**
   * 近 7 天发布(SQL 里判);发布日为空时 pg 给 null(收录口径已排除这种行,形状照实写)。
   */
  fresh: boolean | null
}

/**
 * 职位清单一行(行构造器洗净:时刻折毫秒,近 7 天旗收成布尔)。
 */
export type JobShardFact = {
  /**
   * 职位主键(片号 = 它对 JOB_SHARDS 取模)。
   */
  id: number

  /**
   * lastmod(毫秒);null = 库里没有真事件时刻,出口整格不出。
   */
  mod: MaybeMs

  /**
   * 近 7 天发布(jobs-new 册的成员)。
   */
  fresh: boolean
}

/**
 * 职位清单(id 升序)。
 */
export type JobShardFacts = JobShardFact[]

/**
 * 分片查库行:公司(id + slug + 旗下在架岗最晚的上架时刻;2026-09-26 前是 slug + 旗下岗最近可见)。
 */
export type CoShardDbRow = {
  /**
   * 公司主键。
   */
  id: number

  /**
   * 公司 slug。
   */
  slug: string

  /**
   * 旗下在架岗最晚的 first_seen;可空。
   */
  mod: PgTime
}

/**
 * 公司清单一行(行构造器洗净)。
 */
export type CoShardFact = {
  /**
   * 公司主键(片号 = 它对 CO_SHARDS 取模)。
   */
  id: number

  /**
   * 公司 slug。
   */
  slug: string

  /**
   * lastmod(毫秒);null = 旗下在架岗都没有上架时刻,出口整格不出。
   */
  mod: MaybeMs
}

/**
 * 公司清单(公司 id 升序)。
 */
export type CoShardFacts = CoShardFact[]

/**
 * pg 交回的时刻格(timestamptz 驱动解析成 Date;库里 NULL 是 null)。
 */
export type PgTime = Date | null

/**
 * 毫秒时刻或没有。
 */
export type MaybeMs = number | null

/**
 * 带 lastmod 的一行(职位、公司两侧清单共有的两格;索引按它取片内最晚)。
 */
export type ModRow = {
  /**
   * 主键(片号 = 它对片数取模)。
   */
  id: number

  /**
   * lastmod(毫秒);null = 没有真值。
   */
  mod: MaybeMs
}

/**
 * 带 lastmod 的行清单。
 */
export type ModRows = ModRow[]

/**
 * `shardOf` 的入参。
 */
export type ShardOfIn = {
  /**
   * 主键。
   */
  id: number

  /**
   * 固定片数(JOB_SHARDS / CO_SHARDS)。
   */
  shards: number
}

/**
 * `jobShardEntriesOf` 的入参。
 */
export type JobShardEntriesIn = {
  /**
   * 职位清单全量。
   */
  rows: JobShardFacts

  /**
   * 要的片号。
   */
  shard: number
}

/**
 * `coShardEntriesOf` 的入参。
 */
export type CoShardEntriesIn = {
  /**
   * 公司清单全量。
   */
  rows: CoShardFacts

  /**
   * 要的片号。
   */
  shard: number
}

/**
 * `entryOf` 的入参(urlset 一条要的三样)。
 */
export type EntryIn = {
  /**
   * 详情页绝对网址。
   */
  url: string

  /**
   * sitemap 优先级。
   */
  priority: number

  /**
   * lastmod(毫秒);null 整格不出。
   */
  mod: MaybeMs
}

/**
 * `shardModsOf` 的入参。
 */
export type ShardModsIn = {
  /**
   * 一侧清单全量。
   */
  rows: ModRows

  /**
   * 固定片数。
   */
  shards: number
}

/**
 * 一片的落款。
 */
export type ShardMod = {
  /**
   * 片号(0 起)。
   */
  n: number

  /**
   * 片内条目最晚的 lastmod(毫秒);空片或全无真值 null。
   */
  mod: MaybeMs
}

/**
 * 每片的落款(片号升序,一片一格)。
 */
export type ShardMods = ShardMod[]

/**
 * `indexItemOf` 的入参(索引一条)。
 */
export type IndexItemIn = {
  /**
   * 分册绝对网址。
   */
  loc: string

  /**
   * 落款(毫秒);null 整格不出。
   */
  mod: MaybeMs
}

/**
 * `shardNoOf` 的入参(万册壳分发:件名对分册形)。
 */
export type ShardNoIn = {
  /**
   * 分册件名形(具名捕获组 `n` = 片号)。
   */
  re: RegExp

  /**
   * 路径末段件名。
   */
  file: string
}

/**
 * 片号或不合形。
 */
export type MaybeShardNo = number | null

/**
 * 职位分片清单的缓存槽(全量行 + 落槽时刻)。
 */
export type JobShardSlot = {
  /**
   * 收录口径的岗全量(按 id 升序;片号按 id 对 JOB_SHARDS 取模在进程内挑 —— 2026-09-26 前是在架岗全量、
   * 切片按 SHARD_SIZE 在进程内做)。
   */
  rows: JobShardFacts

  /**
   * 落槽时刻(毫秒;TTL 判过期)。
   */
  ts: number
}

/**
 * 公司分片清单的缓存槽。
 */
export type CoShardSlot = {
  /**
   * 有在招岗的公司全量(按公司 id 升序)。
   */
  rows: CoShardFacts

  /**
   * 落槽时刻(毫秒)。
   */
  ts: number
}

/**
 * 职位分片清单全量的返回(缓存槽里的行,或空表)。
 */
export type JobShardRowsOut = Promise<JobShardFacts>

/**
 * 公司分片清单全量的返回。
 */
export type CoShardRowsOut = Promise<CoShardFacts>

/**
 * 后台刷新一次的返回(只落槽,不回值)。
 */
export type RefreshOut = Promise<void>

/**
 * seo 域全部可变状态的形状。
 */
export type SeoCache = {
  /**
   * 职位分片清单;没拉过 null,过期由 TTL 判。
   */
  jobs: JobShardSlot | null

  /**
   * 公司分片清单;没拉过 null。
   */
  companies: CoShardSlot | null

  /**
   * 职位清单正在后台刷新(防过期瞬间多请求同时打库)。
   */
  jobsBusy: boolean

  /**
   * 公司清单正在后台刷新。
   */
  companiesBusy: boolean
}
