/**
 * 统计域的死值:大类 slug 表、省码与省名、职业统计的探测列清单、pg 错误码。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

/**
 * URL slug ↔ 本站大类(数据值);顺序即展示顺序。
 * 单一来源 = etl/noc_buckets.py 的 BROADS,改那边要同步这里。
 */
export const BROAD_SLUGS: [string, string][] = [
  ['management', '管理层'], ['business', '商务'], ['administration', '行政'], ['office', '文员'], ['finance', '金融'],
  ['accounting', '会计'], ['legal', '法律'], ['it', 'IT'], ['engineering', '工程'], ['science', '科学'],
  ['healthcare', '医疗'], ['education', '教育'], ['social-services', '社会服务'], ['arts', '艺术'], ['sport', '体育'],
  ['sales', '销售'], ['retail', '零售'], ['food-service', '餐饮'], ['hospitality', '住宿'], ['personal-services', '生活服务'],
  ['trades', '技工'], ['construction', '建筑'], ['transport', '运输'], ['logistics', '物流'], ['agriculture', '农业'],
  ['mining', '矿业'], ['manufacturing', '制造'],
]

/**
 * 统计页收录的 10 个省(展示序)。
 */
export const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS', 'NB', 'NL', 'PE']

/**
 * 两位省码 → 英文省全名。
 */
export const PROV_NAME: Record<string, string> = {
  /**
   * 安大略。
   */
  ON: 'Ontario',

  /**
   * 卑诗。
   */
  BC: 'British Columbia',

  /**
   * 阿尔伯塔。
   */
  AB: 'Alberta',

  /**
   * 萨省。
   */
  SK: 'Saskatchewan',

  /**
   * 曼省。
   */
  MB: 'Manitoba',

  /**
   * 魁北克。
   */
  QC: 'Quebec',

  /**
   * 新斯科舍。
   */
  NS: 'Nova Scotia',

  /**
   * 新不伦瑞克。
   */
  NB: 'New Brunswick',

  /**
   * 纽芬兰与拉布拉多。
   */
  NL: 'Newfoundland and Labrador',

  /**
   * 爱德华王子岛。
   */
  PE: 'Prince Edward Island',
}

/**
 * citation 来源要取的三个字段(岗量=Job Bank、薪资=ESDC、通道=省清单;复用 E4-04 field-sources 维度)。
 */
export const STAT_SOURCE_FIELDS = ['title', 'wageMedYr', 'pnp']

/**
 * 职业统计的**逐列探测**清单(E13-03 派生列,契约 v3;E14-02 担保率四列):
 * DDL 分批落库,少一列不该把其余几列一起打回 null —— 探到哪列就 SELECT 哪列,
 * 没探到的映射层给 null(前端「null=整块不渲」照旧;#280 同款容缺先例)。
 * 30 天窗(爬坡期假涨)与下架列(排水期虚高)口径未稳,不在此列(同入 E13-04)。
 */
export const OCC_EXTRA_COLUMNS = [
  'new14d', 'new14d_prev', 'mom14d', 'avg_days_open', 'pulse_score', 'pnp_provs', 'channel_tier',
  'dead_provs', 'pnp_provs_cond', 'sponsor_pos_q', 'sponsor_pos_skilled_q', 'jvws_vac_q', 'sponsor_rate',
]

/**
 * 探测出的附加列拼进 SELECT 的词头(', s.列名')。
 */
export const OCC_COL_PREFIX = ', s.'

/**
 * 城市统计榜取几行(market 主图口径)。
 */
export const CITY_LIMIT = 400

/**
 * 城市段全量口径取几行(/api/stats/city:表 1 全量分页 + 搜索都吃这一份;
 * 库内不同城市 ~2,700,3000 = 全量 + 余量,防意外行数把响应撑爆)。
 */
export const CITY_ALL_LIMIT = 3000

/**
 * 行业对比表取在招量前几的城市。
 */
export const CITY_IND_TOP = 10

/**
 * 留学院校表最多取几行(2026-09-12 一校一行:PGWP 子集全量 ~296 所,原 200 截尾实撞;
 * 视图端分页)。
 */
export const CITY_DLI_LIMIT = 400

/**
 * stats 表大类汇总行的 mid 值(旧行/mid 列未落地时读取层回填它)。
 */
export const MID_ALL = 'all'

/**
 * top_cities 列缺位时的空 JSON 数组串(消费端按 JSON 解析,不能给空串)。
 */
export const EMPTY_TOP_CITIES = '[]'

/**
 * pg 「列不存在」错误码(mid 列 / 探测列未落地的部署时序降级判据,E12-06 教训)。
 */
export const PG_UNDEFINED_COLUMN = '42703'

/**
 * pg 「表不存在」错误码(stats_city / stats_occupation 未落地的降级判据)。
 */
export const PG_UNDEFINED_TABLE = '42P01'

/**
 * /api/stats/fine 的三个参数名:省。
 */
export const P_PROV = 'prov'

/**
 * 大类。
 */
export const P_BROAD = 'broad'

/**
 * 中类。
 */
export const P_MID = 'mid'

/**
 * fine 下钻参数的长度上限(分类值最长的中文串远不到它;超限=不是分类值)。
 */
export const PARAM_LEN_MAX = 80

/**
 * fine 下钻单次最多回多少小类行。
 */
export const MAX_FINE_ROWS = 60

/**
 * /api/stats/market 进程内缓存 TTL(与 start 页 homeCache 同 10 分钟)。
 */
export const MARKET_TTL_MS = 10 * 60_000

/**
 * /api/stats/market 的浏览器侧缓存头(5 分钟 + SWR 一小时:页间往返不重付)。
 */
export const MARKET_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/**
 * /api/stats/macro 进程内缓存 TTL(2026-09-10 SSR 瘦身:macro_series 长到 ~5,000 行把 /start
 * HTML 撑到 5MB+、水合卡死点击 —— 照 market 的形搬出 SSR 挂载后拉;与 homeCache 同 10 分钟)。
 */
export const MACRO_TTL_MS = 10 * 60_000

/**
 * /api/stats/macro 的浏览器侧缓存头(与 market 同口径)。
 */
export const MACRO_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/**
 * /api/stats/city 进程内缓存 TTL(2026-09-11 城市段重设计批:五份现查聚合,照 market 的形;
 * 与 homeCache 同 10 分钟)。
 */
export const CITY_TTL_MS = 10 * 60_000

/**
 * /api/stats/city 的浏览器侧缓存头(与 market 同口径)。
 */
export const CITY_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/**
 * 下钻参数没带时的初值(`?prov` `?broad` `?mid` 三处共用)。
 * 与「带了但是空」落成同一个值:三参缺一律 400 ——
 * 少一个维度查出来的就不是这张下钻表,宁可不给也不给半张。
 */
export const PARAM_NONE = ''

/**
 * 捕到的不是 pg 抛的错时,错误码那一格(只有 pg 的错误对象才挂 code)。
 * 空串与任何真错误码都不相等,于是「不是 pg 的错」自然走不进容缺分支、原样往上抛 ——
 * 容缺只该盖住「DDL 还没落地」这一种,别顺手把别的错也一起吞了。
 */
export const PG_CODE_NONE = ''

/**
 * 一列派生列都没探到时,拼给 SQL 的追加列片段。
 * 空片段 = SELECT 退回基础列,主图整块照常渲染(E13-02 的 DDL 分批落库,
 * 少一列不该把其余几列一起打回 null)。
 */
export const OCC_COL_NONE = ''

/**
 * 本站 27 大类 → 把脉页八行业组的归组表(键 = 大类数据值,值 = 组键;组键与三语组名
 * 走 IND_KEYS / pulse.ind.* 词条)。2026-09-11 Frank「今晚按八组直接算」拍板:
 * stats_city.by_broad 快照改按组聚合(组内所有岗的真中位薪,中位数不可由大类中位数拼出),
 * 重算 SQL 把本表当 jsonb 参数吃。
 * ⚠ 过渡家(2026-09-11 记欠账):同一套分组在 components/start 的 IND_BROADS 还有一份
 * 组→大类形(职业/雇主段按 NOC 大类归组用)—— 终局是分组下沉 etl/noc 成 noc_categories
 * 的组列(该处注释「第二个消费者出现时搬」,现在第二个消费者到了),下沉时两处同删。
 * 改这张表必须同步改 IND_BROADS,反之亦然。
 */
export const BROAD_TO_GROUP: Record<string, string> = {
  /**
   * 医疗组:大类只有一个。
   */
  '医疗': 'health',

  /**
   * STEM 组:IT。
   */
  'IT': 'stem',

  /**
   * STEM 组:工程。
   */
  '工程': 'stem',

  /**
   * STEM 组:科学。
   */
  '科学': 'stem',

  /**
   * 技工组:技工。
   */
  '技工': 'trades',

  /**
   * 技工组:建筑。
   */
  '建筑': 'trades',

  /**
   * 餐饮零售组:餐饮。
   */
  '餐饮': 'food',

  /**
   * 餐饮零售组:住宿。
   */
  '住宿': 'food',

  /**
   * 餐饮零售组:零售。
   */
  '零售': 'food',

  /**
   * 餐饮零售组:销售。
   */
  '销售': 'food',

  /**
   * 餐饮零售组:生活服务。
   */
  '生活服务': 'food',

  /**
   * 运输物流组:运输。
   */
  '运输': 'transport',

  /**
   * 运输物流组:物流。
   */
  '物流': 'transport',

  /**
   * 制造农矿组:制造。
   */
  '制造': 'manufacturing',

  /**
   * 制造农矿组:农业。
   */
  '农业': 'manufacturing',

  /**
   * 制造农矿组:矿业。
   */
  '矿业': 'manufacturing',

  /**
   * 商务办公组:管理层。
   */
  '管理层': 'business',

  /**
   * 商务办公组:商务。
   */
  '商务': 'business',

  /**
   * 商务办公组:行政。
   */
  '行政': 'business',

  /**
   * 商务办公组:文员。
   */
  '文员': 'business',

  /**
   * 商务办公组:金融。
   */
  '金融': 'business',

  /**
   * 商务办公组:会计。
   */
  '会计': 'business',

  /**
   * 商务办公组:法律。
   */
  '法律': 'business',

  /**
   * 教育文体组:教育。
   */
  '教育': 'education',

  /**
   * 教育文体组:社会服务。
   */
  '社会服务': 'education',

  /**
   * 教育文体组:艺术。
   */
  '艺术': 'education',

  /**
   * 教育文体组:体育。
   */
  '体育': 'education',
}
