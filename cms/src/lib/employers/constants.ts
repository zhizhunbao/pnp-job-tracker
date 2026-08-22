/**
 * 雇主域的死值:页大小、制度清单、缓存时长、收窄上限、正则。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

/**
 * 雇主板每页行数。
 */
export const EMP_PAGE_SIZE = 50

/**
 * SSR 只带第一页(#313:全量整包进 RSC payload 是 LCP 的真凶)。
 */
export const EMP_SSR_ROWS = 50

/**
 * 三个指定雇主制度(AIP 按省;RCIP/FCIP 按社区)。
 */
export const EMP_PROGRAMS = ['AIP', 'RCIP', 'FCIP'] as const

/**
 * 把脉页橱窗三分表 SSR 每表只带前 50 行(#313:桌面 10/页 → 首 5 页秒开),全量走 API 懒取。
 */
export const SE_SSR_ROWS = 50

/**
 * 对照最多几家(D3 拍板)。
 */
export const CMP_MAX = 4

/**
 * 对照选择篮的 localStorage 键(名录行/公司弹框共写)。
 */
export const CMP_KEY = 'cmpEmployers1'

/**
 * 进程内整表缓存的存活时长(毫秒)。Render 单实例 = 进程缓存即全局;
 * 过期先回旧值、后台刷新,只有冷启动第一请求真等(08-08 生产两次池楔死后加的保险)。
 */
export const CACHE_TTL_MS = 600_000

/**
 * B4 公司事实五列(founded_year 等):B3 还没建 DDL,生产库大概率没有 ——
 * 逐列探测(#280/E14-02 容缺先例),探到哪列就 SELECT/GROUP BY 哪列。
 */
export const FACT_COLS = ['founded_year', 'registry_status', 'staff_est', 'staff_est_src', 'sector'] as const

/**
 * named 表灯①的序值(#285 三灯默认序)。
 */
export const VERDICT_ORDER: Record<string, number> = {
  /**
   * 达标最前。
   */
  met: 0,

  /**
   * 待核居中。
   */
  unknown: 1,

  /**
   * 公共部门旁路,与待核同档。
   */
  public: 1,

  /**
   * 差项最后。
   */
  short: 2,
}

/**
 * 雇主板的 URL 参数名(SSR 与 API 同一套)。
 */
export const PARAM = {
  /**
   * 口径。
   */
  mode: 'mode',

  /**
   * 制度。
   */
  program: 'program',

  /**
   * 省码。
   */
  prov: 'prov',

  /**
   * 职业码。
   */
  noc: 'noc',

  /**
   * 页码。
   */
  page: 'page',

  /**
   * 社区/城市。
   */
  city: 'city',

  /**
   * 雇主名关键词。
   */
  q: 'q',
} as const

/**
 * 雇主板两种口径的字面量(与 `EmployerMode` 联合逐字对齐,比对时借它做类型收窄)。
 */
export const MODE = {
  /**
   * 本站库内在招。
   */
  hiring: 'hiring',

  /**
   * 官方指定名录。
   */
  designated: 'designated',
} as const

/**
 * 担保筛选的凭证视图字面量。
 */
export const VIEW = {
  /**
   * AIP 指定。
   */
  aip: 'aip',

  /**
   * LMIA 获批记录。
   */
  lmia: 'lmia',

  /**
   * 具名省清单命中。
   */
  named: 'named',
} as const

/**
 * 担保筛选的技能股排序字面量。
 */
export const SORT_SKILLED = 'skilled'

/**
 * jobs/match 的匹配档字面量(引擎的返回值,这里只比对)。
 */
export const LEVEL = {
  /**
   * 高匹配。
   */
  high: 'high',

  /**
   * 中匹配。
   */
  mid: 'mid',
} as const

/**
 * B4 探测列拼片段时的列前缀(companies 的表别名)。
 */
export const COL_PREFIX = 'c.'

/**
 * SQL 片段与逗号清单的连接符。
 */
export const JOIN_COMMA = ', '

/**
 * 一个数字字符(TEER 位校验)。
 */
export const DIGIT_RE = /\d/

/**
 * 一个空格(公司名归一的替换目标)。
 */
export const SPACE = ' '

/**
 * 下划线(维基条目 URL 里空白的替身)。
 */
export const UNDERSCORE = '_'

/**
 * 单个空格,全局(维基条目标题逐个空格换下划线 —— 与批量版逐字一致,不合并连续空白)。
 */
export const SPACE_GLOBAL_RE = / /g

/**
 * URL 与查询串的分隔符。
 */
export const URL_QS = '?'

/**
 * 竖线(Wikidata 多值参数的连接符)。
 */
export const PIPE = '|'

/**
 * Wikidata:检索动作。
 */
export const WD_ACTION_SEARCH = 'wbsearchentities'

/**
 * Wikidata:取实体动作。
 */
export const WD_ACTION_ENTITIES = 'wbgetentities'

/**
 * Wikidata:只搜条目。
 */
export const WD_TYPE_ITEM = 'item'

/**
 * Wikidata:检索语言。
 */
export const WD_LANG_EN = 'en'

/**
 * Wikidata:要取的三类属性。
 */
export const WD_PROPS = 'labels|aliases|sitelinks'

/**
 * Wikidata:要取的语言标签(简繁与韩)。
 */
export const WD_LANGS = 'en|zh|zh-cn|zh-hans|ko'

/**
 * fetch 的 format 参数键。
 */
export const FORMAT_KEY = 'format'

/**
 * fetch 的 format 参数值。
 */
export const FORMAT_JSON = 'json'

/**
 * 5 位职业码。
 */
export const NOC_RE = /^\d{5}$/

/**
 * 两位省码。
 */
export const PROV_RE = /^[A-Z]{2}$/

/**
 * 名录抓取日的八位紧凑写法(20260419)。
 */
export const DATE8_RE = /^\d{8}$/

/**
 * NOC 串的切分符:任何非数字段(逗号/空格/顿号混排都吃)。
 */
export const NOC_SPLIT_RE = /[^0-9]+/

/**
 * URL 参数的保留长度:mode。
 */
export const CAP_MODE = 12

/**
 * URL 参数的保留长度:制度。
 */
export const CAP_PROGRAM = 8

/**
 * URL 参数的保留长度:省码。
 */
export const CAP_PROV = 4

/**
 * URL 参数的保留长度:职业码。
 */
export const CAP_NOC = 8

/**
 * URL 参数的保留长度:页码。
 */
export const CAP_PAGE = 6

/**
 * URL 参数的保留长度:社区与雇主名关键词。
 */
export const CAP_TEXT = 80

/**
 * 页码上限(防滚动条式深翻打爆内存切片)。
 */
export const PAGE_MAX = 9999

/**
 * 职业人话名一次最多查几个码。
 */
export const NOC_TITLES_MAX = 500

/**
 * 日期展示截断长度(YYYY-MM-DD)。
 */
export const DATE_LEN = 10

/**
 * K 调查:单公司调查的超时(毫秒;联网检索慢,给足)。
 */
export const RESEARCH_TIMEOUT_MS = 60_000

/**
 * K 调查:简介的最短长度(短于它 = 模型没查到还硬答,拒收)。
 */
export const BRIEF_MIN = 20

/**
 * K 调查:简介的最长长度(长于它 = 模型放飞,拒收)。
 */
export const BRIEF_MAX = 900

/**
 * K 调查:回答里的官网标记行(校验后剥离)。
 */
export const SITE_LINE_RE = /\[SITE\]=[^\n]*/g

/**
 * K 调查:从官网标记行提取 URL。
 */
export const SITE_PICK_RE = /\[SITE\]=\s*(\S+)/

/**
 * K 调查:合法官网 URL。
 */
export const HTTP_URL_RE = /^https?:\/\/\S+$/i

/**
 * K 调查:整条拒收标记。
 */
export const NOT_FOUND_RE = /NOT_FOUND/

/**
 * K 调查:五节新版缓存的识别标记(三节/散文格式的存量视为过期,当没缓存)。
 */
export const BRIEF_V2_MARK = '[FOUNDED]'

/**
 * Wikidata API 入口(严格名称匹配的唯一查询点,批量脚本已退役)。
 */
export const WD_API = 'https://www.wikidata.org/w/api.php'

/**
 * Wikidata 请求的 User-Agent(WMF 礼仪:说明用途与联系方式)。
 */
export const WD_UA = 'offer2pr-company-facts/1.0 (lazy enrichment; contact via site)'

/**
 * Wikidata 查询超时(毫秒)。
 */
export const WD_TIMEOUT_MS = 10_000

/**
 * Wikidata 一次取几个候选。
 */
export const WD_LIMIT = '3'

/**
 * 公司名归一:去掉法定后缀(Inc/Ltd/Corp…,与 etl/clean/_enrich_company_facts.py 同门槛)。
 */
export const SUFFIX_RE = /\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|holdings?)\b\.?/gi

/**
 * 公司名归一:标点归空格。
 */
export const PUNCT_RE = /[.,]/g

/**
 * 公司名归一:连续空白收一格。
 */
export const SPACES_RE = /\s+/g

/**
 * 英文维基条目 URL 的前缀(命中 enwiki sitelink 时拼接)。
 */
export const ENWIKI_BASE = 'https://en.wikipedia.org/wiki/'
