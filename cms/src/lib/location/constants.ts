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

/**
 * 地点某一格没有值时的显示层占位:空串。
 * 本域交出去的四格(country / prov / city / district)与省名都用它 ——
 * 调用方要么直接把这几格拼进页面,要么 `filter(Boolean)` 把没有的那几级丢掉,
 * 两条路都吃空串、都不吃 null:一个 null 拼进地址就会在页面上印出 "null" 四个字母。
 * (库里的「没有」是 NULL,到了这一层统一翻成空串,翻译点只此一处。)
 */
export const LOC_NONE = ''

/**
 * 浏览器时区 → 省码(加拿大各省时区一一对应的那几个;America/Toronto 同时是安省与魁省,靠浏览器语言再分;
 * America/Halifax 分不出 NS / NB / PE,不预选)。
 */
export const TZ_PROVINCE: Record<string, string> = {
  /**
   * 卑诗。
   */
  'America/Vancouver': 'BC',

  /**
   * 阿省。
   */
  'America/Edmonton': 'AB',

  /**
   * 萨省(不用夏令时,自成一区)。
   */
  'America/Regina': 'SK',

  /**
   * 曼省。
   */
  'America/Winnipeg': 'MB',

  /**
   * 安省(魁省设备现在也报这个名,见 TZ_EASTERN)。
   */
  'America/Toronto': 'ON',

  /**
   * 老浏览器给魁省的名(已废,留着兜底)。
   */
  'America/Montreal': 'QC',

  /**
   * 纽芬兰(自成半小时区)。
   */
  'America/St_Johns': 'NL',
}

/**
 * 加拿大境内、但不在 TZ_PROVINCE 里的那些时区名(分不出省,或是领地):不预选省,但也不算境外。
 * 2026-10-03 付费闭环批 A1 立(访客向导「现在在哪个省」题:时区对不上省、又不在这张表里,才预选「加拿大境外」)。
 * 取自 IANA 时区库 CA 段(zone.tab)的全集减去 TZ_PROVINCE 的键,已并作别名的旧名一并列上。
 */
export const TZ_CANADA_OTHER: readonly string[] = [
  'America/Halifax', 'America/Glace_Bay', 'America/Moncton', 'America/Goose_Bay', 'America/Blanc-Sablon',
  'America/Nipigon', 'America/Thunder_Bay', 'America/Iqaluit', 'America/Pangnirtung', 'America/Atikokan',
  'America/Rainy_River', 'America/Resolute', 'America/Rankin_Inlet', 'America/Swift_Current',
  'America/Cambridge_Bay', 'America/Yellowknife', 'America/Inuvik', 'America/Creston', 'America/Dawson_Creek',
  'America/Fort_Nelson', 'America/Whitehorse', 'America/Dawson',
]

/**
 * 加拿大旧式时区名的前缀(Canada/Eastern、Canada/Atlantic 这一族,老系统还会报)。
 */
export const TZ_CANADA_HEAD = 'Canada/'

/**
 * 东部时区名:命中它时再看浏览器语言,法语当魁省。
 */
export const TZ_EASTERN = 'America/Toronto'

/**
 * 法语浏览器语言的前缀(fr / fr-CA)。
 */
export const LANG_FR_HEAD = 'fr'

/**
 * 魁省省码(东部时区 + 法语浏览器 = 魁省)。
 */
export const PROV_QC = 'QC'

/**
 * 首帧脚本的模板(homeGateJsOf 填两个槽):设备时区在清单里,就往 `<head>` 插一段样式;
 * 浏览器 API 拿不到(老环境)就什么都不做。2026-09-26 /fe 首页 Frank「首屏整表替换」立。
 * 🔴 这是浏览器直接执行的源码(页面 JS 到之前就跑,没有打包器替它转译):只许 ES5 写法,改它等于改线上脚本。
 */
export const HOME_GATE_JS = '(function(){try{var z=__ZONES__;'
  + 'if(z.indexOf(Intl.DateTimeFormat().resolvedOptions().timeZone)<0){return}'
  + "var s=document.createElement('style');s.textContent=__CSS__;document.head.appendChild(s)"
  + '}catch(e){}})()'

/**
 * 首帧脚本模板里「时区清单」那个槽(填 TZ_PROVINCE 的键,JSON 数组)。
 */
export const HOME_GATE_ZONES_SLOT = '__ZONES__'

/**
 * 首帧脚本模板里「命中时插的样式」那个槽(填调用方给的样式,JSON 字符串)。
 */
export const HOME_GATE_CSS_SLOT = '__CSS__'
