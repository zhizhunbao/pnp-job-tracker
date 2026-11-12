/**
 * points 域的子桶 tables 的常量 —— 官方表取数、单件缓存与行构造(getScoreTables 一族),/api/points/factors 的省过滤小件。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 决策页官方表包(2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * 表包缓存时长(10 分钟)。为什么要缓存见 variables.ts 头注(2026-08-12 立,
 * prod-pool-wedge 教训:站级聚合禁每请求现算)。
 */
export const SCORE_TTL_MS = 600_000

/**
 * drawsRecent 每省最多取几轮有分数的抽选(9 省 × 6 ≈ 54 行,随 SSR 走)。
 */
export const RECENT_ROUNDS = 6

/**
 * 只收 13 省区码 —— pnp_draws 里还有联邦轮(province='FED'),那是 EE 不是省提名,
 * 不进 overview 与竞争表。
 */
export const PNP_PROV_CODES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU']

/**
 * difficulty json 里名额竞争因子的 key。
 */
export const COMP_KEY = 'comp'

/**
 * flow 口径期里年与月的拼接符('YYYY-MM')。
 */
export const PERIOD_SEP = '-'

/**
 * 英文月份缩写 → 两位月数(IRCC 月度表的 throughMonth 用)。
 */
export const MONTH_NUM: Record<string, string> = {
  /**
   * 一月。
   */
  Jan: '01',

  /**
   * 二月。
   */
  Feb: '02',

  /**
   * 三月。
   */
  Mar: '03',

  /**
   * 四月。
   */
  Apr: '04',

  /**
   * 五月。
   */
  May: '05',

  /**
   * 六月。
   */
  Jun: '06',

  /**
   * 七月。
   */
  Jul: '07',

  /**
   * 八月。
   */
  Aug: '08',

  /**
   * 九月。
   */
  Sep: '09',

  /**
   * 十月。
   */
  Oct: '10',

  /**
   * 十一月。
   */
  Nov: '11',

  /**
   * 十二月。
   */
  Dec: '12',
}

/**
 * /api/points/factors 的省清单参数名。
 */
export const P_PROVS = 'provs'

/**
 * provs 参数**没带**时的原始串:空串切出零个合法省码,路由据此只回「有表的省清单」,
 * 不回任何一张分值表。不写成 null 是为了让下一行的 split 一视同仁 —— 带不带参数,
 * 解析路径只有一条。
 */
export const PROVS_NONE = ''

/**
 * 省清单的分隔符。
 */
export const PROV_SEP = ','

/**
 * 合法省码形状(两位大写)。
 */
export const PROV_CODE_RE = /^[A-Z]{2}$/
