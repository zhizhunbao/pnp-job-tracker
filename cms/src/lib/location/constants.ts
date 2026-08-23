/**
 * 地点域的死值:省码/省名。地点本身已由清洗脚本(etl/clean/04c)规范化进库,
 * 本域只做**显示**层的取用与拼串,不再解析。全站单一来源。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 有 PNP 的九省。**顺序只是声明顺序**,不是排名 —— 别拿前几个当默认
 * (chat/cards.ts:224 那条教训)。
 */
export const PNP_PROVINCES = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

/**
 * 认得出的省码判集:九省 + QC(魁省走自己的体系,不属 PNP,但用户会提、模型会给)。
 * 2026-08-19 从 `chat/normalize.ts` 搬来 —— 它在 chat 与 agent 里各写了一遍同一行,
 * 而省码是**全站口径**,不该由某个域拥有(域之间不互相取常量;共享叶子才是它的家)。
 * ⚠️ 顺带治了一个老雷:它原先住 `chat/tools.ts`(1141 行、依赖一大串),
 * 三处文件头注释记着它「初始化时 undefined / is not iterable」。本域零运行时 import,不会有那问题。
 */
export const ALL_PROVS = new Set([...PNP_PROVINCES, 'QC'])

/**
 * 省码 → 省全名。筛选值一律用全名(fProv/深链/保存的筛选都依赖它);
 * jobs/filters.shared 再导出给筛选侧。
 */
export const PROV_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec', MB: 'Manitoba', SK: 'Saskatchewan',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  NT: 'Northwest Territories', YT: 'Yukon', NU: 'Nunavut',
}

/**
 * 国家兜底值(有省没国家的行按加拿大)。
 */
export const COUNTRY_CANADA = 'Canada'

/**
 * 省名词条的 i18n 键前缀。
 */
export const PROV_KEY = 'prov.'

/**
 * Google 地图搜索链接前缀(query= 后接 encodeURIComponent 的查询串)。
 */
export const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query='

/**
 * 地图查询串的层级分隔。
 */
export const SEP_COMMA = ', '

/**
 * 地点层级名:省(mapQuery 的 field 值,与表格列 key 同名)。
 */
export const F_PROVINCE = 'province'

/**
 * 地点层级名:市。
 */
export const F_CITY = 'city'

/**
 * 地点层级名:国家。
 */
export const F_COUNTRY = 'country'

/**
 * 地点层级名:区。
 */
export const F_DISTRICT = 'district'

/**
 * 省名双语注记的左括号(全角,与站内文案一致)。
 */
export const NOTE_L = '('

/**
 * 省名双语注记的右括号。
 */
export const NOTE_R = ')'
