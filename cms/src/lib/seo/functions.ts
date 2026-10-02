/**
 * seo 域的行为:robots 纯拼装(构建期烘焙,零库依赖),职位站点地图 jobs.xml 的取数(纯收 db 注入)与 XML 序列化。
 * 2026-08-23 自 app/robots.ts、app/sitemap.ts、jobs·companies/sitemap.ts 收拢
 * (SITE 五份重复、`(payload.db as any).pool` 两处直取,一并消灭)。
 * 2026-09-26 /fe SEO 批:分片计数随固定片数(id 取模)退役;职位清单收窄到收录口径 SQL.SEO_JOB_OK,
 * lastmod 改真事件时刻,新开近 7 天新岗一册 jobs-new.xml。
 * 2026-10-02 站点地图合成一个 jobs.xml(Frank「合成一个不行吗」「叫 jobs.xml 不行么」):取模分片(shardOf / jobShardEntriesOf /
 * shardModsOf / shardNoOf)、sitemapindex(indexXmlOf / loadIndexRows)、新岗册(jobsNewEntriesOf 与它的比较器)、
 * 核心册(coreSitemapOf)整段撤;库查不到又没有旧缓存时回 null,由出口给 503,不再吐空册。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { queryRows, SQL } from '../db'
import { fill } from '../template'
import { log, SEO_LOG } from '../log'
import {
  CACHE_1H, CT_XML, FREQ_WEEKLY, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE,
  JOB_PAGE_PREFIX, JOB_PRIORITY, NL, PATH_SEP, ROBOTS_ALLOW, ROBOTS_DISALLOW, ROBOTS_UA, SEO_TTL_MS, SITE,
  SITEMAP_JOBS_PATH, TEXT_NONE, URLSET_ITEM_NOMOD_TPL, URLSET_ITEM_TPL, URLSET_XML_HEAD, URLSET_XML_TAIL,
} from './constants'
import { CACHE } from './variables'
import type {
  EntryIn, Freq, JobsSitemapOut, MaybeMs, PgTime, RefreshOut, Robots, Sitemap, SitemapEntry,
  SitemapJobDbRow, SitemapJobFact, SitemapJobFacts, SitemapJobsOut, SitemapRowsIn,
} from './types'

// =========================================================================
// 1. 构建期烘焙件(robots;零库依赖,index 门可安全出浏览器侧)
// =========================================================================

/**
 * robots.txt(E7-03):放开公开页,挡 admin/api/账号;Sitemap 只声明一条。
 * 2026-10-02 起指职位站点地图 jobs.xml(原指 sitemapindex index.xml)。
 *
 * @returns Next 认的 robots 结构。
 */
export function robotsOf(): Robots {
  return {
    rules: [{ userAgent: ROBOTS_UA, allow: ROBOTS_ALLOW, disallow: ROBOTS_DISALLOW }],
    sitemap: [`${SITE}${SITEMAP_JOBS_PATH}`],
  }
}

/**
 * 常量里的频率串 → Next 的联合。体内那句 `as Freq` 是跨边界断言:
 * 常量表(JSON 形,叶子不 import)存不住库的联合类型,类型落位只能在这一行收。
 *
 * @param v 频率串。
 * @returns Next 认的频率。
 */
function freqOf(v: string): Freq {
  return v as Freq
}

// =========================================================================
// 2. 职位站点地图(全纯收 db 注入;清单全量一次拉齐,一小时 TTL)
// =========================================================================
// 2026-09-03 GSC 实查定案(constants.SEO_TTL_MS):此前索引两个 count + 每片 OFFSET 现查,
// 索引 63 秒 / 分片 10–24 秒,Google 读索引后子表逐个超时 → 「发现 0 页」,新岗对 Google 不存在。
// 现在一次全量查询落 CACHE;库抖时先吃过期缓存(有旧表不给空表)。

/**
 * 职位站点地图的全部条目(收录口径 SQL.SEO_JOB_OK 的岗,id 升序,lastmod 取真事件时刻)。
 * 库查不到且没有旧缓存给 null —— 空册会被 Google 记成「已发现 0」(2026-10-01 jobs-3 实撞),出口改回 503 让它过会儿再读。
 *
 * @param input 连接。
 * @returns 条目;没有数据给 null。
 */
export async function loadJobsSitemap(input: SitemapRowsIn): JobsSitemapOut {
  const rows = await loadSitemapJobs(input)
  if (rows == null) {
    return null
  }
  return jobEntriesOf(rows)
}

/**
 * 职位清单 → 条目(清单原序 = id 升序)。
 *
 * @param rows 职位清单全量。
 * @returns urlset 条目。
 */
export function jobEntriesOf(rows: SitemapJobFacts): Sitemap {
  const out: SitemapEntry[] = []
  for (const r of rows) {
    out.push(jobEntryOf(r))
  }
  return out
}

/**
 * 职位一条(网址 = 详情页)。
 *
 * @param r 清单一行。
 * @returns urlset 一条。
 */
function jobEntryOf(r: SitemapJobFact): SitemapEntry {
  return entryOf({ url: `${SITE}${JOB_PAGE_PREFIX}${r.id}`, priority: JOB_PRIORITY, mod: r.mod })
}

/**
 * urlset 一条:lastmod 只在有真事件时刻时给,没有就整格不出、不拿请求时刻顶
 * (2026-09-26 撤原 seenOf 的「空取当下」)。
 *
 * @param x 网址、优先级与 lastmod。
 * @returns urlset 一条。
 */
function entryOf(x: EntryIn): SitemapEntry {
  const e: SitemapEntry = { url: x.url, changeFrequency: freqOf(FREQ_WEEKLY), priority: x.priority }
  if (x.mod != null) {
    e.lastModified = new Date(x.mod)
  }
  return e
}

/**
 * 职位清单全量。有槽就立刻给槽里的(过期则顺手在后台刷新一次,请求本身不等库 ——
 * 线上 63 秒的病根是连接池被撑着时的等待);没槽才等现查,现查也失败给 null。
 *
 * @param input 连接。
 * @returns 收录口径的岗 id + lastmod 全量(id 升序);没有给 null。
 */
async function loadSitemapJobs(input: SitemapRowsIn): SitemapJobsOut {
  const slot = CACHE.jobs
  if (slot != null) {
    if (Date.now() - slot.ts >= SEO_TTL_MS && CACHE.jobsBusy === false) {
      void refreshSitemapJobs(input)
    }
    return slot.rows
  }
  await refreshSitemapJobs(input)
  const fresh = CACHE.jobs
  if (fresh == null) {
    return null
  }
  return fresh.rows
}

/**
 * 职位清单现查一次落槽(失败留痕、槽不动 —— 旧表比空表值钱);busy 旗防过期瞬间多请求齐打库。
 *
 * @param input 连接。
 * @returns 无。
 */
async function refreshSitemapJobs(input: SitemapRowsIn): RefreshOut {
  CACHE.jobsBusy = true
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.jobsSitemapAll(SQL.SEO_JOB_OK), params: [], map: toSitemapJobFact })
    CACHE.jobs = { rows, ts: Date.now() }
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
  } finally {
    CACHE.jobsBusy = false
  }
}

// =========================================================================
// 3. XML 序列化与响应头
// =========================================================================

/**
 * urlset 序列化(此前由 Next Metadata 框架文件序列化,2026-08-29 归目录批
 * 全家改走一个 route handler,序列化收回本域 —— 输出与框架同形,四格全给)。
 * 2026-09-26:lastmod 为空的条目走 URLSET_ITEM_NOMOD_TPL,整个元素不出(不出空标签)。
 *
 * @param entries 一册的条目。
 * @returns 完整 XML 文本。
 */
export function urlsetXmlOf(entries: Sitemap): string {
  const lines: string[] = [URLSET_XML_HEAD]
  for (const e of entries) {
    let tpl: string = URLSET_ITEM_NOMOD_TPL
    let mod: string = TEXT_NONE
    if (e.lastModified != null) {
      tpl = URLSET_ITEM_TPL
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
    lines.push(fill({ tpl: tpl, params: { loc: e.url, mod: mod, freq: freq, pri: pri } }))
  }
  lines.push(URLSET_XML_TAIL)
  return lines.join(NL)
}

/**
 * 站点地图的响应头(XML 类型 + 一小时缓存;原名 indexHeadersOf,索引撤后改名)。
 *
 * @returns 键值对。
 */
export function sitemapHeadersOf(): Record<string, string> {
  return { [HDR_CONTENT_TYPE]: CT_XML, [HDR_CACHE_CONTROL]: CACHE_1H }
}

// =========================================================================
// 4. 行构造器(rows 抽屉撤编后的固定尾段)
// =========================================================================

/**
 * 职位清单原始行 → 本域形状(时刻折毫秒)。
 * 2026-09-26 前是 id + last_seen 原样交回(toJobShardRow);2026-10-02 前多收一格近 7 天旗(toJobShardFact)。
 *
 * @param r 原始行。
 * @returns id + lastmod。
 */
function toSitemapJobFact(r: SitemapJobDbRow): SitemapJobFact {
  return { id: r.id, mod: msOf(r.mod) }
}

/**
 * 库里的时刻格 → 毫秒;库里 NULL 保 null。原 seenOf(last_seen 格 → 落款时间,可空,空取当下 —— 老文件同口径)
 * 2026-09-26 撤:拿请求时刻顶空格正是 lastmod 失真的来源,空就是空,由出口整格不出。
 *
 * @param v pg 交回的时刻。
 * @returns 毫秒;没有是 null。
 */
function msOf(v: PgTime): MaybeMs {
  if (v == null) {
    return null
  }
  return v.getTime()
}

/**
 * 请求 URL → 末段件名(壳的分发键;取不出给空串,让分发落到 404 支)。
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
