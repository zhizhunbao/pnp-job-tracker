/**
 * seo 域的行为:robots/核心 sitemap 纯拼装(构建期烘焙,零库依赖),
 * 分片计数与分片页取数(全纯收 db 注入),sitemapindex XML 拼装。
 * 2026-08-23 自 app/robots.ts、app/sitemap.ts、jobs·companies/sitemap.ts 收拢
 * (SITE 五份重复、`(payload.db as any).pool` 两处直取,一并消灭)。
 * 2026-09-26 /fe SEO 批:分片计数随固定片数(id 取模)退役;职位清单收窄到收录口径 SQL.SEO_JOB_OK,
 * lastmod 改真事件时刻,新开近 7 天新岗一册 jobs-new.xml。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
import { queryRows, SQL } from '../db'
import { fill } from '../template'
import { log, SEO_LOG } from '../log'
import {
  CACHE_1H, CO_PAGE_PREFIX, CO_PRIORITY, CO_SHARD_PATH, CO_SHARDS, CORE_PAGES, CT_XML, FREQ_WEEKLY,
  HDR_CACHE_CONTROL, HDR_CONTENT_TYPE, INDEX_ITEM_NOMOD_TPL, INDEX_ITEM_TPL, INDEX_XML_HEAD, INDEX_XML_TAIL,
  JOB_NEW_PATH, JOB_PAGE_PREFIX, JOB_PRIORITY, JOB_SHARD_PATH, JOB_SHARDS, NL, ROBOTS_ALLOW, ROBOTS_DISALLOW, ROBOTS_UA,
  URLSET_ITEM_NOMOD_TPL, URLSET_ITEM_TPL, URLSET_XML_HEAD, URLSET_XML_TAIL,
  PATH_SEP, SEO_TTL_MS, SITE, SITEMAP_INDEX_PATH, SITEMAP_PATH, TEXT_NONE,
} from './constants'
import { CACHE } from './variables'
import type {
  CoShardDbRow, CoShardEntriesIn, CoShardFact, CoShardRowsOut, EntryIn, Freq, IndexItemIn, IndexRowsOut, IndexXmlIn,
  JobShardDbRow, JobShardEntriesIn, JobShardFact, JobShardFacts, JobShardRowsOut, MaybeMs, MaybeShardNo, ModRows, PgTime,
  RefreshOut, Robots, ShardMods, ShardModsIn, ShardNoIn, ShardOfIn, ShardPageIn, ShardPageOut, ShardRowsIn, Sitemap,
  SitemapEntry,
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
 * 2026-09-26 撤 lastmod(/fe SEO「给 Google 新鲜信号」):原先每条填请求时刻 —— Google 每次来读都看到「刚改过」,
 * 是假新鲜信号,久了连真信号一起不信;核心页没有可靠的真改动时刻,整格不出(urlsetXmlOf 见空不出元素)。
 *
 * @returns 核心页 urlset。
 */
export function coreSitemapOf(): Sitemap {
  const out: SitemapEntry[] = []
  for (const p of CORE_PAGES) {
    out.push({
      url: `${SITE}${p.path}`,
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
// 2. 分片(白名单、单片、新岗册;全纯收 db 注入;清单全量一次拉齐进程内切片,一小时 TTL)
// =========================================================================
// 2026-09-03 GSC 实查定案(constants.SEO_TTL_MS):此前索引两个 count + 每片 OFFSET 现查,
// 索引 63 秒 / 分片 10–24 秒,Google 读索引后子表逐个超时 → 「发现 0 页」,新岗对 Google 不存在。
// 现在两侧各一次全量查询(45k 行 id+last_seen,亚秒)落 CACHE,计数与切片全在内存;
// 库抖时先吃过期缓存(有旧表不给空表),没有旧表才按原兜底(计数 1 片 / 分册空)。
// 2026-09-26 /fe SEO 批改判:职位清单收窄到收录口径(SQL.SEO_JOB_OK,当天 2.4 万行),片号改 id 对固定片数取模
// (constants.JOB_SHARDS / CO_SHARDS),lastmod 改真事件时刻;计数随固定片数退役 —— 没有旧表时索引照列满全部分片,
// 只是不给 lastmod,分册照旧回空。

/**
 * 职位分片一片(仅 active 岗;closed 页保留可访问但不进 sitemap+noindex,Frank 拍板)。
 * 库不可达回空片不抛 —— sitemap 请求不该打挂站点。
 * 2026-09-26 成员改收录口径(SQL.SEO_JOB_OK:在架 + 非重复 + 有投递邮箱 + 有发布日 + 正文够长 + 没过截止日),
 * 片号改 id 取模(constants.JOB_SHARDS)。
 *
 * @param input 连接与片号。
 * @returns 这一片的 urlset。
 */
export async function loadJobShardPage(input: ShardPageIn): ShardPageOut {
  if (Number.isFinite(input.shard) === false) {
    return []
  }
  const rows = await loadJobShardRows({ db: input.db })
  return jobShardEntriesOf({ rows: rows, shard: input.shard })
}

/**
 * 近 7 天新岗一册(jobs-new.xml;2026-09-26 /fe SEO「给 Google 新鲜信号」):收录口径里发布不满 7 天的岗,
 * 按 lastmod 倒序。同一网址也在它自己的取模片里 —— Google 允许一址多册,这一册是给 Google 的新鲜入口,片册管全量。
 * 库不可达同样回空册不抛。
 *
 * @param input 连接。
 * @returns 新岗册的 urlset。
 */
export async function loadJobsNewPage(input: ShardRowsIn): ShardPageOut {
  const rows = await loadJobShardRows(input)
  return jobsNewEntriesOf(rows)
}

/**
 * 公司分片一片(仅有在招岗的公司=有内容+可收录;无岗公司页 noindex 不进)。
 * 2026-09-26 片号改公司 id 取模(constants.CO_SHARDS),lastmod 改旗下在架岗最晚的上架时刻。
 *
 * @param input 连接与片号。
 * @returns 这一片的 urlset。
 */
export async function loadCompanyShardPage(input: ShardPageIn): ShardPageOut {
  if (Number.isFinite(input.shard) === false) {
    return []
  }
  const rows = await loadCompanyShardRows({ db: input.db })
  return coShardEntriesOf({ rows: rows, shard: input.shard })
}

/**
 * sitemapindex 要的两侧清单(2026-09-26 起片数固定,索引只拿清单算每片最晚的 lastmod;
 * 取代原 loadJobShardCount / loadCompanyShardCount 两个计数 —— 原判「列表与计数同一套条件,否则片数和内容对不上」
 * 由同一份缓存清单天然成立)。
 *
 * @param input 连接。
 * @returns 两侧全量清单(各自缓存槽里的,或空表)。
 */
export async function loadIndexRows(input: ShardRowsIn): IndexRowsOut {
  const [jobs, companies] = await Promise.all([loadJobShardRows(input), loadCompanyShardRows(input)])
  return { jobs, companies }
}

/**
 * 职位一片的条目:按 id 取模挑出落在这一片的岗 —— 片号只看自己的 id,关掉老岗不会让别的网址挪片。
 *
 * @param x 清单与片号。
 * @returns 这一片的 urlset(清单原序 = id 升序)。
 */
export function jobShardEntriesOf(x: JobShardEntriesIn): Sitemap {
  const out: SitemapEntry[] = []
  for (const r of x.rows) {
    if (shardOf({ id: r.id, shards: JOB_SHARDS }) === x.shard) {
      out.push(jobEntryOf(r))
    }
  }
  return out
}

/**
 * 近 7 天新岗册的条目:清单里 fresh 的岗,按 lastmod 倒序(最新的在最前)。
 *
 * @param rows 职位清单全量。
 * @returns 新岗册的 urlset。
 */
export function jobsNewEntriesOf(rows: JobShardFacts): Sitemap {
  const out: SitemapEntry[] = []
  for (const r of freshJobsOf(rows).sort(byModDesc)) {
    out.push(jobEntryOf(r))
  }
  return out
}

/**
 * 公司一片的条目(同职位侧:按公司 id 取模)。
 *
 * @param x 清单与片号。
 * @returns 这一片的 urlset(清单原序 = 公司 id 升序)。
 */
export function coShardEntriesOf(x: CoShardEntriesIn): Sitemap {
  const out: SitemapEntry[] = []
  for (const r of x.rows) {
    if (shardOf({ id: r.id, shards: CO_SHARDS }) === x.shard) {
      out.push(entryOf({ url: `${SITE}${CO_PAGE_PREFIX}${r.slug}`, priority: CO_PRIORITY, mod: r.mod }))
    }
  }
  return out
}

/**
 * 清单里近 7 天发布的岗(新数组 —— 调用方拿去排序不碰缓存槽)。
 *
 * @param rows 职位清单全量。
 * @returns fresh 的那些行(原序)。
 */
function freshJobsOf(rows: JobShardFacts): JobShardFacts {
  const out: JobShardFacts = []
  for (const r of rows) {
    if (r.fresh) {
      out.push(r)
    }
  }
  return out
}

/**
 * 片号:id 对固定片数取模 —— 一个 id 永远落同一片,与清单里还有谁无关(2026-09-26 改判,见 constants.JOB_SHARDS)。
 *
 * @param x 主键与片数。
 * @returns 片号(0 起,小于片数)。
 */
export function shardOf(x: ShardOfIn): number {
  return x.id % x.shards
}

/**
 * 职位一条(网址 = 详情页)。
 *
 * @param r 清单一行。
 * @returns urlset 一条。
 */
function jobEntryOf(r: JobShardFact): SitemapEntry {
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
 * 职位分片清单全量。有槽就立刻给槽里的(过期则顺手在后台刷新一次,请求本身不等库 ——
 * 线上 63 秒的病根是连接池被撑着时的等待,Google 读索引多半落在冷态);没槽才等现查。
 *
 * @param input 连接。
 * @returns 收录口径的岗 id + lastmod + 近 7 天旗全量(id 升序;2026-09-26 前是在架岗 id + last_seen)。
 */
async function loadJobShardRows(input: ShardRowsIn): JobShardRowsOut {
  const slot = CACHE.jobs
  if (slot != null) {
    if (Date.now() - slot.ts >= SEO_TTL_MS && CACHE.jobsBusy === false) {
      void refreshJobShardRows(input)
    }
    return slot.rows
  }
  await refreshJobShardRows(input)
  const fresh = CACHE.jobs
  if (fresh == null) {
    return []
  }
  return fresh.rows
}

/**
 * 职位清单现查一次落槽(失败留痕、槽不动 —— 旧表比空表值钱);busy 旗防过期瞬间多请求齐打库。
 *
 * @param input 连接。
 * @returns 无。
 */
async function refreshJobShardRows(input: ShardRowsIn): RefreshOut {
  CACHE.jobsBusy = true
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.jobsSitemapAll(SQL.SEO_JOB_OK), params: [], map: toJobShardFact })
    CACHE.jobs = { rows, ts: Date.now() }
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
  } finally {
    CACHE.jobsBusy = false
  }
}

/**
 * 公司分片清单全量(同职位侧一套律)。
 *
 * @param input 连接。
 * @returns 有在招岗的公司 id + slug + lastmod 全量(公司 id 升序;2026-09-26 前是 slug + last_seen)。
 */
async function loadCompanyShardRows(input: ShardRowsIn): CoShardRowsOut {
  const slot = CACHE.companies
  if (slot != null) {
    if (Date.now() - slot.ts >= SEO_TTL_MS && CACHE.companiesBusy === false) {
      void refreshCompanyShardRows(input)
    }
    return slot.rows
  }
  await refreshCompanyShardRows(input)
  const fresh = CACHE.companies
  if (fresh == null) {
    return []
  }
  return fresh.rows
}

/**
 * 公司清单现查一次落槽(同职位侧)。
 *
 * @param input 连接。
 * @returns 无。
 */
async function refreshCompanyShardRows(input: ShardRowsIn): RefreshOut {
  CACHE.companiesBusy = true
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.coSitemapAll(SQL.CO_SITEMAP_FROM), params: [], map: toCoShardFact })
    CACHE.companies = { rows, ts: Date.now() }
  } catch (e) {
    log({ tag: SEO_LOG.tag, text: SEO_LOG.pageFail + String(e) })
  } finally {
    CACHE.companiesBusy = false
  }
}

// =========================================================================
// 3. sitemapindex(#156:GSC 手动提交只认一个 URL,索引一次覆盖全部分片)
// =========================================================================

/**
 * sitemapindex XML(Next 的 MetadataRoute.Sitemap 只能产 urlset 不能产 sitemapindex,
 * 所以这条走 route handler 直接吐 XML,零依赖)。索引放第一位。
 * 2026-09-26 改判(/fe SEO):片数固定(JOB_SHARDS / CO_SHARDS),每片落款 = 片内条目最晚的 lastmod
 * (原先整张索引填请求时刻,等于每次都说「全改了」);核心册不给落款(它的条目本身就没有 lastmod);
 * 近 7 天新岗册紧跟核心册。原兜底「库不可达回落 1 片、绝不 0 片(0 片 = 整个 sitemap 消失)」由固定片数天然成立:
 * 清单是空表时照列满全部分片,只是都不给落款。
 *
 * @param input 两侧清单(空表 = 库抖且没有旧表)。
 * @returns 完整 XML 文本。
 */
export function indexXmlOf(input: IndexXmlIn): string {
  const lines: string[] = [INDEX_XML_HEAD]
  lines.push(indexItemOf({ loc: `${SITE}${SITEMAP_PATH}`, mod: null }))
  lines.push(indexItemOf({ loc: `${SITE}${JOB_NEW_PATH}`, mod: newestOf(freshJobsOf(input.jobs)) }))
  for (const s of shardModsOf({ rows: input.jobs, shards: JOB_SHARDS })) {
    lines.push(indexItemOf({ loc: SITE + fill({ tpl: JOB_SHARD_PATH, params: { n: s.n } }), mod: s.mod }))
  }
  for (const s of shardModsOf({ rows: input.companies, shards: CO_SHARDS })) {
    lines.push(indexItemOf({ loc: SITE + fill({ tpl: CO_SHARD_PATH, params: { n: s.n } }), mod: s.mod }))
  }
  lines.push(INDEX_XML_TAIL)
  return lines.join(NL)
}

/**
 * 索引一条:有落款给 lastmod,没有(核心册、空片)整个元素不出。
 *
 * @param x 分册网址与落款。
 * @returns `<sitemap>` 一行。
 */
function indexItemOf(x: IndexItemIn): string {
  if (x.mod == null) {
    return fill({ tpl: INDEX_ITEM_NOMOD_TPL, params: { loc: x.loc } })
  }
  return fill({ tpl: INDEX_ITEM_TPL, params: { loc: x.loc, mod: new Date(x.mod).toISOString() } })
}

/**
 * 每片最晚的 lastmod:片号 0 到片数减一逐片列(空片也占一格,给 null)。
 *
 * @param x 一侧清单与片数。
 * @returns 每片一格,片号升序。
 */
export function shardModsOf(x: ShardModsIn): ShardMods {
  const out: ShardMods = []
  for (let n = 0; n < x.shards; n += 1) {
    const inShard: ModRows = []
    for (const r of x.rows) {
      if (shardOf({ id: r.id, shards: x.shards }) === n) {
        inShard.push(r)
      }
    }
    out.push({ n: n, mod: newestOf(inShard) })
  }
  return out
}

/**
 * 一组行里最晚的 lastmod(没有真值的行不参与)。
 *
 * @param rows 行。
 * @returns 最晚时刻(毫秒);一个都没有是 null。
 */
function newestOf(rows: ModRows): MaybeMs {
  let best: MaybeMs = null
  for (const r of rows) {
    if (r.mod != null && (best == null || r.mod > best)) {
      best = r.mod
    }
  }
  return best
}

/**
 * urlset 序列化(核心/分片册;此前由 Next Metadata 框架文件序列化,2026-08-29 归目录批
 * 全家改走一个 route handler,序列化收回本域 —— 输出与框架同形,四格全给)。
 * 2026-09-26:lastmod 为空的条目走 URLSET_ITEM_NOMOD_TPL,整个元素不出(不出空标签;核心册全是这种)。
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
 * 职位分片原始行 → 本域形状(时刻折毫秒;近 7 天旗库里判好,这里只收成布尔)。
 * 2026-09-26 前是 id + last_seen 原样交回(toJobShardRow)。
 *
 * @param r 原始行。
 * @returns id + lastmod + 近 7 天旗。
 */
function toJobShardFact(r: JobShardDbRow): JobShardFact {
  return { id: r.id, mod: msOf(r.mod), fresh: r.fresh === true }
}

/**
 * 公司分片原始行 → 本域形状。
 * 2026-09-26 前是 slug + last_seen 原样交回(toCoShardRow)。
 *
 * @param r 原始行。
 * @returns 公司 id + slug + lastmod。
 */
function toCoShardFact(r: CoShardDbRow): CoShardFact {
  return { id: r.id, slug: r.slug, mod: msOf(r.mod) }
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

// =========================================================================
// 5. 回调(callbacks 抽屉撤编后的固定尾段;签名由语言定死,逐行特批)
// =========================================================================

/**
 * 新岗册的排序:lastmod 倒序(最新的在最前)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 Array.sort 定死(比较器,宪法钦定逐行特批形态)
function byModDesc(a: JobShardFact, b: JobShardFact): number {
  return modKeyOf(b.mod) - modKeyOf(a.mod)
}

/**
 * 排序键:没有 lastmod 的当最旧排到最后(收录口径要求有发布日,新岗册里实际不会有这种行)。
 *
 * @param v lastmod(毫秒)或 null。
 * @returns 排序用的毫秒数。
 */
function modKeyOf(v: MaybeMs): number {
  if (v == null) {
    return 0
  }
  return v
}
