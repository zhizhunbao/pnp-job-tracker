/**
 * 流量域的死值:挡哪些爬虫、按什么分桶记账、多久出一次账。
 * 立域缘由(2026-10-01):9 月 Render 出站流量 130 GB(8 月 23 GB),9/25 05:00–9/27 21:00 EDT 每小时约 700 MB,
 * Hobby 档没有带 UA 的请求日志、也不能按路径筛,查不出是谁;Googlebot、本机容器、真人三家已排除。
 *
 * @author Frank
 * @time 2026-10-01 19:00:00
 */

// =========================================================================
// 1. 挡爬虫
// =========================================================================

/**
 * 直接回 403 的爬虫(浏览器标识里含其一即中,不分大小写;2026-10-01 Frank「他瞎爬跑我的流量」,
 * 拍「拦非搜索类」):只挡 AI 训练与 SEO 工具两类 —— 它们不给本站带一个访客,只吃流量。
 * 搜索引擎(Googlebot / bingbot / DuckDuckBot / Applebot 等)一个不挡:Google 招聘富结果是最大入口。
 * 只认自报身份的;冒充浏览器的挡不住,要靠下面的记账找出来再补。
 */
export const BOT_BLOCK_RE =
  /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|meta-externalagent|Amazonbot|cohere-ai|Diffbot|ImagesiftBot|Timpibot|AhrefsBot|SemrushBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|serpstatbot|barkrowler/i

// =========================================================================
// 2. 记账
// =========================================================================

/**
 * Node 内置的诊断频道模块(运行时现取,不写顶层 import —— 页面门在边缘运行时也引本域的挡爬虫判定)。
 */
export const TRAFFIC_MODULE = 'node:diagnostics_channel'

/**
 * Node 每发完一个响应就在这条诊断频道上广播一次(内置件,不用给 http 打补丁)。
 */
export const TRAFFIC_CHANNEL = 'http.server.response.finish'

/**
 * 浏览器标识截多长进账(完整串常上 200 字,前段已足够认出是谁)。
 */
export const TRAFFIC_UA_LEN = 160

/**
 * 每一路最多记多少个不同的键,超了的新键并进「其他」—— 有人每次换标识也撑不爆内存。
 */
export const TRAFFIC_KEY_MAX = 5000

/**
 * 路径分桶时要多看一段的前缀(`/api/sitemaps`、`/_next/static` 才说得清是什么;其余只看第一段,
 * `/jobs/123` 归 `/jobs`)。
 */
export const TRAFFIC_DEEP_SEGS = ['api', '_next']

/**
 * 路径分隔符。
 */
export const TRAFFIC_PATH_SEP = '/'

/**
 * 查询串的起点(分桶前切掉)。
 */
export const TRAFFIC_QUERY_SEP = '?'

/**
 * 转发头里多个地址的分隔(第一个是真实来源)。
 */
export const TRAFFIC_IP_SEP = ','

/**
 * 浏览器标识头名。
 */
export const HDR_UA = 'user-agent'

/**
 * 转发来源地址头名(Render 边缘填)。
 */
export const HDR_FORWARDED_FOR = 'x-forwarded-for'

/**
 * 这一格没值(没带标识、没有转发头、没有路径)。
 */
export const TRAFFIC_NONE = '-'

/**
 * 键数超限后,新键并进的那一格。
 */
export const TRAFFIC_OTHER = '(other)'

// =========================================================================
// 3. 出账
// =========================================================================

/**
 * 多久出一次账并清零:一小时,与 Render 流量图的分辨率对齐,方便对时刻。
 */
export const TRAFFIC_FLUSH_MS = 3_600_000

/**
 * 每一路列前几名(按字节)。
 */
export const TRAFFIC_TOP_LIMIT = 8

/**
 * 字节换算兆字节的除数。
 */
export const TRAFFIC_MB_BYTES = 1_048_576

/**
 * 兆字节保留几位小数。
 */
export const TRAFFIC_MB_DIGITS = 1
