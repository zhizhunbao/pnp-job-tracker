/**
 * 流量域的行为:挡非搜索类爬虫(页面门调),出站流量按浏览器标识 / 路径桶 / 来源地址三路记账、每小时出一次账。
 * 记账走 Node 内置的诊断频道(每发完一个响应广播一次),不给 http 打补丁;字节取连接累计写出量的差值,
 * 是压缩后、含响应头的真实出站量,与 Render 账单同口径。
 *
 * @author Frank
 * @time 2026-10-01 19:00:00
 */

import { log, TRAFFIC_LOG } from '../log'
import {
  BOT_BLOCK_RE, HDR_FORWARDED_FOR, HDR_UA, TRAFFIC_CHANNEL, TRAFFIC_DEEP_SEGS, TRAFFIC_FLUSH_MS, TRAFFIC_IP_SEP,
  TRAFFIC_KEY_MAX, TRAFFIC_MB_BYTES, TRAFFIC_MB_DIGITS, TRAFFIC_MODULE, TRAFFIC_NONE, TRAFFIC_OTHER, TRAFFIC_PATH_SEP,
  TRAFFIC_QUERY_SEP, TRAFFIC_TOP_LIMIT, TRAFFIC_UA_LEN,
} from './constants'
import { CACHE } from './variables'
import type {
  AddTallyIn, FinishHeaders, FinishMsg, FinishRequest, FinishSocket, HitFact, LogBookIn, TallyEntries, TallyEntry,
  TallyMap,
} from './types'

// =========================================================================
// 1. 挡爬虫
// =========================================================================

/**
 * 这个浏览器标识是不是要挡的非搜索类爬虫(名单与理由见 BOT_BLOCK_RE)。
 *
 * @param ua 请求头里的浏览器标识,没带就传空串。
 * @returns 要挡就是 true。
 */
export function isBlockedBot(ua: string): boolean {
  return BOT_BLOCK_RE.test(ua)
}

// =========================================================================
// 2. 记账
// =========================================================================

/**
 * 订诊断频道、起每小时出账的钟。进程启动时调一次;重复调不重复订(开发热重载会重跑启动钩子)。
 * 钟不拖住进程退出。
 *
 * @returns 没有返回值。
 */
export function installTrafficTap(): void {
  if (CACHE.installed) {
    return
  }
  CACHE.installed = true
  process.getBuiltinModule(TRAFFIC_MODULE).subscribe(TRAFFIC_CHANNEL, onResponseFinish)
  setInterval(flushTraffic, TRAFFIC_FLUSH_MS).unref()
}

/**
 * 一次响应记进总账与三路账本。
 *
 * @param hit 洗净的一次响应。
 * @returns 没有返回值。
 */
function recordHit(hit: HitFact): void {
  CACHE.total.count += 1
  CACHE.total.bytes += hit.bytes
  addTally({ book: CACHE.ua, key: hit.ua, bytes: hit.bytes })
  addTally({ book: CACHE.path, key: hit.path, bytes: hit.bytes })
  addTally({ book: CACHE.ip, key: hit.ip, bytes: hit.bytes })
}

/**
 * 往一路账本记一笔;键数到上限后,新键一律并进「其他」那一格。
 *
 * @param input 账本、键、字节。
 * @returns 没有返回值。
 */
function addTally(input: AddTallyIn): void {
  let key = input.key
  if (input.book.has(key) === false && input.book.size >= TRAFFIC_KEY_MAX) {
    key = TRAFFIC_OTHER
  }
  const t = input.book.get(key)
  if (t == null) {
    input.book.set(key, { count: 1, bytes: input.bytes })
    return
  }
  t.count += 1
  t.bytes += input.bytes
}

// =========================================================================
// 3. 出账
// =========================================================================

/**
 * 出这一小时的账:总账一行,三路各列前几名,然后全部清零。
 *
 * @returns 没有返回值。
 */
function flushTraffic(): void {
  log({
    tag: TRAFFIC_LOG.tag,
    text: TRAFFIC_LOG.hour + CACHE.total.count + TRAFFIC_LOG.mb + mbOf(CACHE.total.bytes),
  })
  logBook({ name: TRAFFIC_LOG.ua, book: CACHE.ua })
  logBook({ name: TRAFFIC_LOG.path, book: CACHE.path })
  logBook({ name: TRAFFIC_LOG.ip, book: CACHE.ip })
  CACHE.total = { count: 0, bytes: 0 }
  CACHE.ua.clear()
  CACHE.path.clear()
  CACHE.ip.clear()
}

/**
 * 一路账本按字节列前几名,一名一行。
 *
 * @param input 一路名与账本。
 * @returns 没有返回值。
 */
function logBook(input: LogBookIn): void {
  let rank = 1
  for (const e of topOf(input.book)) {
    log({
      tag: TRAFFIC_LOG.tag,
      text: input.name + TRAFFIC_LOG.rank + rank + TRAFFIC_LOG.mb + mbOf(e.tally.bytes) + TRAFFIC_LOG.req
        + e.tally.count + TRAFFIC_LOG.sep + e.key,
    })
    rank += 1
  }
}

/**
 * 账本按字节从大到小的前几行。
 *
 * @param book 一路账本。
 * @returns 前 TRAFFIC_TOP_LIMIT 行。
 */
function topOf(book: TallyMap): TallyEntries {
  const all: TallyEntries = []
  for (const [key, tally] of book) {
    all.push({ key, tally })
  }
  all.sort(byBytesDesc)
  return all.slice(0, TRAFFIC_TOP_LIMIT)
}

/**
 * 字节换成兆字节的显示串。
 *
 * @param bytes 字节数。
 * @returns 保留一位小数的兆字节。
 */
function mbOf(bytes: number): string {
  return (bytes / TRAFFIC_MB_BYTES).toFixed(TRAFFIC_MB_DIGITS)
}

// =========================================================================
// 4. 行构造器
// =========================================================================

/**
 * 诊断消息 → 洗净的一次响应:三路键都给值(没有就记「-」),字节按连接差值算好。
 *
 * @param m 诊断频道的消息。
 * @returns 洗净的一次响应。
 */
function toHit(m: FinishMsg): HitFact {
  return { ua: uaOf(m.request.headers), path: pathOf(m.request), ip: ipOf(m.request.headers), bytes: sentOf(m.socket) }
}

/**
 * 浏览器标识,截到 TRAFFIC_UA_LEN。
 *
 * @param h 请求头。
 * @returns 截短的标识;没带就是「-」。
 */
function uaOf(h: FinishHeaders): string {
  const v = h[HDR_UA]
  if (v == null || String(v) === '') {
    return TRAFFIC_NONE
  }
  return String(v).slice(0, TRAFFIC_UA_LEN)
}

/**
 * 路径分桶:切掉查询串,只看第一段;`/api`、`/_next` 多看一段。
 *
 * @param r 请求。
 * @returns 路径桶,如 `/jobs`、`/api/sitemaps`、`/`。
 */
function pathOf(r: FinishRequest): string {
  if (r.url == null) {
    return TRAFFIC_NONE
  }
  const [bare] = r.url.split(TRAFFIC_QUERY_SEP)
  if (bare == null) {
    return TRAFFIC_NONE
  }
  const [, head, sub] = bare.split(TRAFFIC_PATH_SEP)
  if (head == null || head === '') {
    return TRAFFIC_PATH_SEP
  }
  if (TRAFFIC_DEEP_SEGS.includes(head) && sub != null && sub !== '') {
    return TRAFFIC_PATH_SEP + head + TRAFFIC_PATH_SEP + sub
  }
  return TRAFFIC_PATH_SEP + head
}

/**
 * 来源地址:转发头里的第一个。
 *
 * @param h 请求头。
 * @returns 来源地址;没有转发头就是「-」。
 */
function ipOf(h: FinishHeaders): string {
  const v = h[HDR_FORWARDED_FOR]
  if (v == null) {
    return TRAFFIC_NONE
  }
  const [first] = String(v).split(TRAFFIC_IP_SEP)
  if (first == null || first.trim() === '') {
    return TRAFFIC_NONE
  }
  return first.trim()
}

/**
 * 本次响应写出去的字节:连接累计写出量减上次记账时的水位(长连接上前后多个请求共用一条连接)。
 *
 * @param s 送这个响应的连接。
 * @returns 本次的字节。
 */
function sentOf(s: FinishSocket): number {
  const prev = CACHE.sentBy.get(s)
  CACHE.sentBy.set(s, s.bytesWritten)
  if (prev == null) {
    return s.bytesWritten
  }
  return s.bytesWritten - prev
}

// =========================================================================
// 5. 回调(签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 诊断频道的监听器:每发完一个响应记一笔。入参的 `unknown` 是 Node 定死的监听器签名
 * (频道不知道消息形状);体内那句 `as FinishMsg` 是跨边界断言 —— 这条频道的消息形状由 Node 文档定死,
 * 只在这一行收窄。
 *
 * @param message 诊断消息。
 * @returns 没有返回值。
 */
// eslint-disable-next-line local/no-unknown-type, local/typed-signature -- 签名由外部库定死(diagnostics_channel 的 ChannelListener)
function onResponseFinish(message: unknown): void {
  recordHit(toHit(message as FinishMsg))
}

/**
 * 出账排序:字节大的在前。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
function byBytesDesc(a: TallyEntry, b: TallyEntry): number {
  return b.tally.bytes - a.tally.bytes
}
