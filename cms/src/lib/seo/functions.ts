/**
 * seo 域的行为:robots/核心 sitemap 纯拼装(构建期烘焙,零库依赖),
 * 分片计数与分片页取数(全纯收 db 注入),sitemapindex XML 拼装。
 * 2026-08-23 自 app/robots.ts、app/sitemap.ts、jobs·companies/sitemap.ts 收拢
 * (SITE 五份重复、`(payload.db as any).pool` 两处直取,一并消灭)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { queryRows, SQL } from '../db'
import { fill } from '../template'
import { log, SEO_LOG } from '../log'
import {
  CACHE_1H, CO_PAGE_PREFIX, CO_PRIORITY, CO_SHARD_PATH, CORE_PAGES, CT_XML, FREQ_WEEKLY,
  HDR_CACHE_CONTROL, HDR_CONTENT_TYPE, INDEX_ITEM_TPL, INDEX_XML_HEAD, INDEX_XML_TAIL,
  JOB_PAGE_PREFIX, JOB_PRIORITY, JOB_SHARD_PATH, NL, ROBOTS_ALLOW, ROBOTS_DISALLOW, ROBOTS_UA,
  URLSET_ITEM_TPL, URLSET_XML_HEAD, URLSET_XML_TAIL,
  PATH_SEP, SHARD_SIZE, SITE, SITEMAP_INDEX_PATH, SITEMAP_PATH, TEXT_NONE,
} from './constants'
import type {
  CoShardDbRow, Freq, IndexXmlIn, JobShardDbRow, Robots, ShardCountIn, ShardCountOut,
  MaybeShardNo, ShardNoIn, ShardPageIn, ShardPageOut, Sitemap, SitemapEntry,
} from './types'

// =========================================================================
// 1. 构建期烘焙件(robots / 核心 sitemap;零库依赖,index 门可安全出浏览器侧)
// =========================================================================

/**
 * robots.txt(E7-03):放开公开页,挡 admin/api/账号;只指 sitemapindex + 平铺表 ——
 * 分片不逐条枚举(枚举数字写死正是撑爆 sitemap 的同一颗雷,2026-08-02 定案)。
 *
 * @returns Next 认的 robots 结构(Sitemap 只声明入口一条 —— 2026-08-29 归目录批:
 * 核心册在索引里挂着,再单列一行就是同一件事报两遍)。
 */
export function robotsOf(): Robots {
  return {
    rules: [{ userAgent: ROBOTS_UA, allow: ROBOTS_ALLOW, disallow: ROBOTS_DISALLOW }],
    sitemap: [`${SITE}${SITEMAP_INDEX_PATH}`],
  }
}

/**
 * 核心页平铺表(E7-03):核心页 + 榜单;职位/公司页在分片里,这里不出。
 *
 * @returns 核心页 urlset。
 */
export function coreSitemapOf(): Sitemap {
  const now = new Date()
  const out: SitemapEntry[] = []
  for (const p of CORE_PAGES) {
    out.push({
      url: `${SITE}${p.path}`, lastModified: now,
      changeFrequency: freqOf(p.freq), priority: p.priority,
    })
  }
  return out
}

/**
 * 常量表里的频率串 → Next 的联合。体内那句 `as Freq` 是跨边界断言:
 * CORE_PAGES 的 freq 全是合法字面量,而常量表(JSON 形,叶子不 import)存不住库的联合类型,
 * 类型落位只能在这一行收。
 *
 * @param v 频率串。
 * @returns Next 认的频率。
 */
function freqOf(v: string): Freq {
  return v as Freq
}

// =========================================================================
// 2. 分片(计数、白名单、单片;全纯收 db 注入)
// =========================================================================

/**
 * 在招岗数 → 职位分片数。库不可达时回落 1 片(空片无害),绝不 0 片
 * (0 片 = 整个 sitemap 消失)。
 *
 * @param input 连接。
 * @returns 片数(≥1)。
 */
export async function loadJobShardCount(input: ShardCountIn): ShardCountOut {
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.jobsSitemapCount(SQL.SITEMAP_ACTIVE), params: [], map: toCountN })
    return shardsOf(rows)
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.countFail + String(e) })
    return 1
  }
}

/**
 * 有在招岗的公司数 → 公司分片数(列表与计数同一套条件,否则片数和内容对不上)。
 *
 * @param input 连接。
 * @returns 片数(≥1)。
 */
export async function loadCompanyShardCount(input: ShardCountIn): ShardCountOut {
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.coSitemapCount(SQL.CO_SITEMAP_FROM), params: [], map: toCountN })
    return shardsOf(rows)
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.countFail + String(e) })
    return 1
  }
}

/**
 * 计数行 → 片数(向上取整,至少 1)。
 *
 * @param rows 单行计数结果集。
 * @returns 片数。
 */
function shardsOf(rows: number[]): number {
  let n = 0
  const rowsFirst = rows[0]
  if (rowsFirst != null) {
    n = rowsFirst
  }
  return Math.max(1, Math.ceil(n / SHARD_SIZE))
}

/**
 * 职位分片一片(仅 active 岗;closed 页保留可访问但不进 sitemap+noindex,Frank 拍板)。
 * 库不可达回空片不抛 —— sitemap 请求不该打挂站点。
 *
 * @param input 连接与片号。
 * @returns 这一片的 urlset。
 */
export async function loadJobShardPage(input: ShardPageIn): ShardPageOut {
  if (Number.isFinite(input.shard) === false) {
    return []
  }
  try {
    const rows = await queryRows({
      db: input.db, sql: SQL.jobsSitemapPage(SQL.SITEMAP_ACTIVE),
      params: [SHARD_SIZE, input.shard * SHARD_SIZE], map: toJobShardRow,
    })
    const out: SitemapEntry[] = []
    for (const r of rows) {
      out.push({
        url: `${SITE}${JOB_PAGE_PREFIX}${r.id}`, lastModified: seenOf(r.last_seen),
        changeFrequency: freqOf(FREQ_WEEKLY), priority: JOB_PRIORITY,
      })
    }
    return out
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    return []
  }
}

/**
 * 公司分片一片(仅有在招岗的公司=有内容+可收录;无岗公司页 noindex 不进)。
 *
 * @param input 连接与片号。
 * @returns 这一片的 urlset。
 */
export async function loadCompanyShardPage(input: ShardPageIn): ShardPageOut {
  if (Number.isFinite(input.shard) === false) {
    return []
  }
  try {
    const rows = await queryRows({
      db: input.db, sql: SQL.coSitemapPage(SQL.CO_SITEMAP_FROM),
      params: [SHARD_SIZE, input.shard * SHARD_SIZE], map: toCoShardRow,
    })
    const out: SitemapEntry[] = []
    for (const r of rows) {
      out.push({
        url: `${SITE}${CO_PAGE_PREFIX}${r.slug}`, lastModified: seenOf(r.last_seen),
        changeFrequency: freqOf(FREQ_WEEKLY), priority: CO_PRIORITY,
      })
    }
    return out
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
    return []
  }
}

/**
 * last_seen 格 → 落款时间(可空,空取当下 —— 老文件同口径)。
 *
 * @param v 库里的时刻串。
 * @returns Date。
 */
function seenOf(v: string | null): Date {
  if (v == null || v === '') {
    return new Date()
  }
  return new Date(v)
}

// =========================================================================
// 3. sitemapindex(#156:GSC 手动提交只认一个 URL,索引一次覆盖全部分片)
// =========================================================================

/**
 * sitemapindex XML(Next 的 MetadataRoute.Sitemap 只能产 urlset 不能产 sitemapindex,
 * 所以这条走 route handler 直接吐 XML,零依赖)。索引放第一位。
 *
 * @param input 两侧片数与落款时刻。
 * @returns 完整 XML 文本。
 */
export function indexXmlOf(input: IndexXmlIn): string {
  const locs: string[] = [`${SITE}${SITEMAP_PATH}`]
  for (let i = 0; i < input.jobs; i += 1) {
    locs.push(SITE + fill({ tpl: JOB_SHARD_PATH, params: { n: i } }))
  }
  for (let i = 0; i < input.companies; i += 1) {
    locs.push(SITE + fill({ tpl: CO_SHARD_PATH, params: { n: i } }))
  }
  const lines: string[] = [INDEX_XML_HEAD]
  for (const loc of locs) {
    lines.push(fill({ tpl: INDEX_ITEM_TPL, params: { loc, mod: input.now } }))
  }
  lines.push(INDEX_XML_TAIL)
  return lines.join(NL)
}

/**
 * urlset 序列化(核心/分片册;此前由 Next Metadata 框架文件序列化,2026-08-29 归目录批
 * 全家改走一个 route handler,序列化收回本域 —— 输出与框架同形,四格全给)。
 *
 * @param entries 一册的条目。
 * @returns 完整 XML 文本。
 */
export function urlsetXmlOf(entries: Sitemap): string {
  const lines: string[] = [URLSET_XML_HEAD]
  for (const e of entries) {
    let mod: string = TEXT_NONE
    if (e.lastModified != null) {
      mod = new Date(e.lastModified).toISOString()
    }
    let freq: string = TEXT_NONE
    if (e.changeFrequency != null) {
      freq = e.changeFrequency
    }
    let pri: string = TEXT_NONE
    if (e.priority != null) {
      pri = String(e.priority)
    }
    lines.push(fill({ tpl: URLSET_ITEM_TPL, params: { loc: e.url, mod: mod, freq: freq, pri: pri } }))
  }
  lines.push(URLSET_XML_TAIL)
  return lines.join(NL)
}

/**
 * sitemapindex 的响应头(XML 类型 + 一小时缓存)。
 *
 * @returns 键值对。
 */
export function indexHeadersOf(): Record<string, string> {
  return { [HDR_CONTENT_TYPE]: CT_XML, [HDR_CACHE_CONTROL]: CACHE_1H }
}

// =========================================================================
// 4. 行构造器(rows 抽屉撤编后的固定尾段)
// =========================================================================

/**
 * 计数行 → 数字。
 *
 * @param r 原始行。
 * @returns n 格。
 */
function toCountN(r: { n: number }): number {
  return r.n
}

/**
 * 职位分片原始行 → 本域形状。
 *
 * @param r 原始行。
 * @returns id + last_seen。
 */
function toJobShardRow(r: JobShardDbRow): JobShardDbRow {
  return { id: r.id, last_seen: r.last_seen }
}

/**
 * 公司分片原始行 → 本域形状。
 *
 * @param r 原始行。
 * @returns slug + last_seen。
 */
function toCoShardRow(r: CoShardDbRow): CoShardDbRow {
  return { slug: r.slug, last_seen: r.last_seen }
}

/**
 * 请求 URL → 末段件名(万册壳的分发键;取不出给空串,让分发落到 404 支)。
 *
 * @param url 请求完整 URL。
 * @returns 件名。
 */
export function fileOf(url: string): string {
  const last = new URL(url).pathname.split(PATH_SEP).pop()
  if (last == null) {
    return TEXT_NONE
  }
  return last
}

/**
 * 件名按分册形取片号(具名捕获组 `n`;不合形给 null)。
 *
 * @param x 分册形与件名。
 * @returns 片号;不合形 null。
 */
export function shardNoOf(x: ShardNoIn): MaybeShardNo {
  const m = x.re.exec(x.file)
  if (m == null || m.groups == null) {
    return null
  }
  return Number(m.groups.n)
}
