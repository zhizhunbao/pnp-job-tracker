/**
 * 雇主域的死值:页大小、制度清单、行业组与排序白名单、缓存时长、收窄上限、正则。
 * 2026-09-13 雇主板批二:板改读雇主池(employer_pool / employer_pool_buckets),designated / hiring 双口径退役。
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
 * 「连锁」判据:在招岗覆盖大西洋以外至少几个省(2026-09-05 Frank「AIP 应该是分两部分吧 一部分是当地的企业,
 * 一部分是像这个连锁的企业。当地的企业更容易 AIP 吧」)—— 连锁的指定按加盟法人逐家给(官方名单里是
 * 「10113 Newfoundland Ltd. o/a Mary Brown's」这种法人),按品牌名匹配是模糊命中;把脉页 AIP 表按此拆
 * 「本地 / 连锁」两张。Tim Hortons 9 省 → 连锁;Kent Building Supplies 四省全在大西洋 → 本地。
 */
export const CHAIN_PROVS_MIN = 2

/**
 * 对照最多几家(D3 拍板)。
 */
export const CMP_MAX = 4

/**
 * 对照最少几家:一家没得比,凑不满两家直接回空表(不是错,是没内容可对照)。
 */
export const CMP_MIN = 2

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
   * 行业组键(雇主板批二:板按 8 行业组切面;缺席 = 首屏只出选择器不摊表)。
   */
  group: 'group',

  /**
   * 只看无经验可投(值 ENTRY_ON)。
   */
  entry: 'entry',

  /**
   * 只看有技能类 LMIA 记录(值 ENTRY_ON;2026-09-13 Frank「筛选加一个 LMIA 的筛选」)。
   */
  lmia: 'lmia',

  /**
   * 排序方向(asc / desc;缺席 = 该键的默认方向)。
   */
  dir: 'dir',

  /**
   * 制度(直达参数:决策页「查雇主」带 program=AIP 进来,筛指定项目清单含它的雇主)。
   */
  program: 'program',

  /**
   * 省码。
   */
  prov: 'prov',

  /**
   * 雇主类别(POOL_SECTORS 之一;2026-09-18 雇主分类批一入库,雇主板类别下拉用)。
   */
  sector: 'sector',

  /**
   * 职业码。
   */
  noc: 'noc',

  /**
   * 页码。
   */
  page: 'page',

  /**
   * 社区/城市(2026-09-18 起雇主板市筛选用它:英文市名原样,只在选了省时生效)。
   */
  city: 'city',

  /**
   * 区(区名原样;只在选了市时生效,2026-09-18 区筛选)。
   */
  district: 'district',

  /**
   * 在招 EE 类别(联邦 EE 类别的中文标签,数据层原值;2026-09-19「全部类别」筛选,与职位板同名同义)。
   */
  ee: 'ee',

  /**
   * 公司分类键(POOL_CATEGORIES 之一;2026-09-19 晚,与雇主类型两级联动的第二级)。
   */
  category: 'cat',

  /**
   * 雇主名关键词。
   */
  q: 'q',

  /**
   * 每页行数(懒取端点)。
   */
  pageSize: 'pageSize',

  /**
   * 凭证视图(导出端点:aip/lmia/named)。
   */
  f: 'f',

  /**
   * 排序键(雇主板:POOL_SORTS 之一;导出端点:open/skilled)。
   */
  sort: 'sort',
} as const

/**
 * 雇主池的 8 行业组键(2026-09-13 Frank「八组」;顺序 = 下拉顺序;显示名走 i18n pulse.ind.*)。
 * ⚠ 值表的家在数据层 etl/noc GROUP_KEYS(经 mart 落 employer_pool_buckets.ind_group 与 noc_categories.ind_group),
 * 这里只是查询参数白名单的镜像;改组先改 noc 叶。
 */
export const POOL_GROUPS = ['health', 'stem', 'trades', 'food', 'transport', 'manufacturing', 'business', 'education'] as const

/**
 * 雇主板可点的排序主键白名单(与 `PoolSort` 联合逐字对齐;SQL 片段在 lib/db/sql.ts EMPLOYER_POOL_ORDER 按键取)。
 */
export const POOL_SORTS = ['star', 'open', 'designated', 'name', 'sector', 'province', 'city', 'lmia'] as const

/**
 * 排序方向白名单(与 `PoolDir` 联合逐字对齐)。
 */
export const POOL_DIRS = ['asc', 'desc'] as const

/**
 * 各排序键的默认方向(首点表头按它;再点反向):数字 / 布尔类降序,名字升序。
 */
export const POOL_SORT_DIR: Record<string, string> = {
  /**
   * 星级高在前。
   */
  star: 'desc',

  /**
   * 在招多在前。
   */
  open: 'desc',

  /**
   * 指定在前。
   */
  designated: 'desc',

  /**
   * 名字 A→Z。
   */
  name: 'asc',

  /**
   * 类别按键升序(2026-09-18 雇主板类别 / 省 / 市三列可点排序)。
   */
  sector: 'asc',

  /**
   * 省码 A→Z。
   */
  province: 'asc',

  /**
   * 城市名 A→Z。
   */
  city: 'asc',

  /**
   * LMIA 份数多在前(2026-09-18 字段面板里的可选列;它只当一列的排序键,榜的默认排序永不是它 —— 08-29「裸 LMIA 总量永不入排序」)。
   */
  lmia: 'desc',
}

/**
 * 方向键 → SQL 关键字(白名单之外到不了这)。
 */
export const POOL_DIR_SQL: Record<string, string> = {
  /**
   * 升序。
   */
  asc: 'ASC',

  /**
   * 降序。
   */
  desc: 'DESC',
}

/**
 * 方向兜底:降序(白名单键的默认方向全在 POOL_SORT_DIR 里,这是给索引签名的兜底)。
 */
export const POOL_DIR_DESC = 'desc'

/**
 * ORDER BY 里主列之后的空值处理:无论升降,空值一律沉底。
 */
export const ORDER_NULLS_LAST = ' NULLS LAST, '

/**
 * 主列与方向之间的空格。
 */
export const ORDER_SP = ' '

/**
 * 雇主板默认排序:切面星级(设计稿:默认按星级排、点列头切主键)。
 * 2026-09-19 Frank「这个排序是按什么排的」→「改成按在招数排」**改判**:默认 = 在招数降序。星级列 09-13 已撤,
 * 默认却还按它排,用户看到只招 1 个岗的排在招 187 个的前面、又看不到原因;星级仍是合法排序键(`?sort=star`),
 * 同分收尾里也还在。
 */
export const POOL_SORT_DEFAULT = 'open'

/**
 * 开关参数(entry / lmia)的开值(只认它;其余一律当没开)。
 */
export const ENTRY_ON = '1'

/**
 * 查证态搜索词里的 SQL 通配字符,去掉后再进 ILIKE(用户输 % 不是要通配)。
 */
export const Q_WILD_RE = /[%_]/g

/**
 * 全组页缓存键各段之间的分隔(竖线,词里出现也只是多一段,不撞键)。
 */
export const POOL_KEY_SEP = '|'

/**
 * 全组页缓存最多留几页(满了整个清空重来;查证态的搜词也进键,防 Map 无限长)。
 */
export const POOL_PAGES_MAX = 500

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
 * Wikidata 实体里指向英文维基百科条目的站点键。
 * 一个实体的 sitelinks 按站点分格(enwiki / zhwiki / jawiki…),
 * 只取英文站:公司条目以英文最全,中文站常常没有或是转写。
 */
export const WD_SITE_EN = 'enwiki'

/**
 * 简体中文标签键(大陆用法)。Wikidata 把中文按变体分了好几格,
 * 优先级 zh-cn → zh-hans → zh:先要大陆简体的实际用词,
 * 再退到「通用简体」,最后才退到不分变体的 zh(可能是繁体)。
 */
export const WD_LANG_ZH_CN = 'zh-cn'

/**
 * 通用简体中文标签键(不分地区)。zh-cn 没有时的第一退路。
 */
export const WD_LANG_ZH_HANS = 'zh-hans'

/**
 * 不分变体的中文标签键。最后一档退路 —— 它可能是繁体,
 * 但有个中文名总好过没有(公司名的繁简差异通常不影响认出是谁)。
 */
export const WD_LANG_ZH = 'zh'

/**
 * 韩文标签键。韩文只有一格,没有变体退路。
 */
export const WD_LANG_KO = 'ko'

/**
 * Wikidata:要取的语言标签(简繁与韩)。
 */
// 2026-08-24:原先这里逐字抄着 'en|zh|zh-cn|zh-hans|ko',与下面五个语言码常量
// 是同一份知识的两个副本 —— 加一门语言要改两处,漏一处就是「请求里要了、代码里不读」。
export const WD_LANGS = `${WD_LANG_EN}|${WD_LANG_ZH}|${WD_LANG_ZH_CN}|${WD_LANG_ZH_HANS}|${WD_LANG_KO}`

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
 * 三个捕获组 = 年(`$1`)、月(`$2`)、日(`$3`),`fmtFetched` 靠
 * `s.replace(DATE8_RE, '$1-$2-$3')` 一行转成 YYYY-MM-DD —— 照日期库(dayjs/luxon)的行规走,
 * 免得用五个 slice 下标把年月日的边界抄第二遍。锚点 `^…$` 不动:仍然是「整串八位」才算数,
 * 加组不改 `.test()` 的判定。
 */
export const DATE8_RE = /^(\d{4})(\d{2})(\d{2})$/

/**
 * `DATE8_RE` 三个捕获组的重排模板:年-月-日,即 YYYY-MM-DD。
 * 单列一个名字是因为 `$1`/`$2`/`$3` 的次序是**和上面那条正则绑死的**,两处要一起改。
 */
export const DATE8_DASHED = '$1-$2-$3'

/**
 * NOC 串的切分符:任何非数字段(逗号/空格/顿号混排都吃)。
 */
export const NOC_SPLIT_RE = /[^0-9]+/

/**
 * URL 参数的保留长度:行业组键(最长键 manufacturing 13 位)。
 */
export const CAP_GROUP = 16

/**
 * URL 参数的保留长度:排序键。
 */
export const CAP_SORT = 12

/**
 * URL 参数的保留长度:排序方向。
 */
export const CAP_DIR = 4

/**
 * URL 参数的保留长度:制度。
 */
export const CAP_PROGRAM = 8

/**
 * URL 参数的保留长度:省码。
 */
export const CAP_PROV = 4

/**
 * 探索队列:一次入队最多收多少个键(板上一批 50 行,留余量;多的截掉)。
 */
export const EXPLORE_KEYS_MAX = 60

/**
 * 探索队列:池主键的最长字符数(超长的键当脏数据丢掉)。
 */
export const EXPLORE_KEY_LEN_MAX = 200

/**
 * 探索队列:工人一次最多取多少条待办。
 */
export const EXPLORE_TAKE_MAX = 300

/**
 * 探索队列:工人没说取多少条时的默认条数。
 */
export const EXPLORE_TAKE_DEFAULT = 100

/**
 * 探索队列:工人取活时的条数参数名。
 */
export const P_EXPLORE_LIMIT = 'limit'

/**
 * 探索队列:工人交活时认的状态(done = 翻好了 / skip = 人名等不翻 / fail = 没翻成)。
 */
export const EXPLORE_STATUSES = ['done', 'skip', 'fail'] as const

/**
 * 探索队列状态:跳过(人名雇主等;板上连公司表里已有的音译也不显示)。
 */
export const EXPLORE_SKIP = 'skip'

/**
 * 探索队列:译名与备注的最长字符数(超长截断)。
 */
export const EXPLORE_TEXT_MAX = 120

/**
 * 官网那条工种(点开过的公司优先抓官网 / 找官网,2026-09-20)工人可写回的 stage 白名单;排队中由入队写,不在此列。
 */
export const SITE_STAGES = ['find', 'fetch', 'facts', 'done', 'none'] as const

/**
 * 官网那条工种:取活的工种参数名(find = 找官网,其余 = 抓官网)。
 */
export const P_SITE_KIND = 'kind'

/**
 * 官网那条工种:找官网工种的参数值。
 */
export const SITE_KIND_FIND = 'find'

/**
 * 官网那条工种:一次取活的默认条数(一家要一两分钟,一轮一分钟,取多了也做不完)。
 */
export const SITE_TAKE_DEFAULT = 5

/**
 * 官网那条工种:一次取活的条数上限。
 */
export const SITE_TAKE_MAX = 20

/**
 * 官网那条工种:官网 / 出处 / 总部各格的最长字符数。
 */
export const SITE_TEXT_MAX = 300

/**
 * 官网那条工种:简介的最长字符数。
 */
export const SITE_BRIEF_MAX = 4000

/**
 * 官网那条工种:简介出处页的最多条数。
 */
export const SITE_SOURCES_MAX = 6

/**
 * 被用户看过的公司清单一次最多给多少条(数据层排队用;近 30 天的量远小于它)。
 */
export const SEEN_TAKE_MAX = 5000

/**
 * URL 参数的保留长度:本站大类键(最长「社会服务」「生活服务」四字,留余量)。
 */
export const CAP_BROAD = 12

/**
 * URL 参数的保留长度:市名(库里最长的市名 40 字上下)。
 */
export const CAP_CITY = 60

/**
 * URL 参数的保留长度:雇主类别键(最长 indigenous 10 字)。
 */
export const CAP_SECTOR = 12

/**
 * 雇主类别的筛选值白名单(下拉选项序 = 这个序)。前五个是库里 employer_pool.sector 的字面量
 * (数据层 etl/names sector_of,2026-09-18 雇主分类批一);`private` 是筛选专用词 —— 库里私营 = NULL,
 * 不存这个字面量,SQL 里按 `sector IS NULL` 判。
 */
export const POOL_SECTORS = ['federal', 'government', 'municipal', 'indigenous', 'public', 'private'] as const

/**
 * 探索队列交回的公司行业白名单 = 本站公司行业 15 类(私营雇主的公司分类;数据层 etl/explore 的 INDUSTRIES 同一套键)。
 * 交活接口只收这 15 个键 —— 2026-09-19 晚之前那一格不设白名单,旧工人交回的职位大类中文标签(金融 / IT …)从此当没答。
 */
export const EXPLORE_INDUSTRIES = [
  'tech', 'health', 'education', 'finance', 'professional', 'construction', 'manufacturing', 'retail', 'hospitality',
  'transport', 'energy', 'agriculture', 'realestate', 'media', 'services',
] as const

/**
 * 公司分类的筛选值白名单(2026-09-19 晚 Frank「应该单独弄一个公司的分类。和雇主类型联动」):私营 15 类(同 EXPLORE_INDUSTRIES)+
 * 公立机构 9 类 + 政府按职能 9 类(后两段是数据层 etl/names category_of 的值域)。哪一段配哪个雇主类型是展示层的事
 * (components/employers 的联动表),这里只管「这个字面量是不是一个认得的分类」。
 */
export const POOL_CATEGORIES = [
  'tech', 'health', 'education', 'finance', 'professional', 'construction', 'manufacturing', 'retail', 'hospitality',
  'transport', 'energy', 'agriculture', 'realestate', 'media', 'services',
  'hospital', 'healthauth', 'university', 'college', 'schoolboard', 'transit', 'utility', 'crown', 'public-other',
  'gov-admin', 'gov-police', 'gov-defence', 'gov-tax', 'gov-justice', 'gov-parks', 'gov-infra', 'gov-health', 'gov-edu',
] as const

/**
 * 私营的筛选值(库里是 NULL,见 POOL_SECTORS)。
 */
export const SECTOR_PRIVATE = 'private'

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
 * 职业码的位数:官方 NOC 2021 一律五位数字。`teerOf` 拿它认「这是不是一个像样的码」——
 * 只判长度不判全数字,是为了让「第二位是数字、其余位有脏字」的库存行仍能读出 TEER,
 * 不是漏了校验(严格形状另有 `NOC_RE`)。
 */
export const NOC_LEN = 5

/**
 * 职业码第二位(TEER 位)的具名捕获:组名 `teer`。
 * 首位写 `[\s\S]` 不写 `.` —— `.` 不吃换行,库存里带换行的脏码会从「第二位是数字」被误判成「不像样」。
 * 不锚尾、不校验其余位:长度归 `NOC_LEN` 判,其余位有脏字仍要读得出 TEER(理由见 `NOC_LEN`)。
 */
export const NOC_TEER_RE = /^[\s\S](?<teer>\d)/

/**
 * 排序后取中位数的折半除数:`sals[floor(length / MEDIAN_HALF)]`。
 * 偶数条取偏上那一格(不取两格平均)—— 与旧实现一致,岗位薪资只是展示口径,不做统计学中位数。
 */
export const MEDIAN_HALF = 2

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
 * K 调查:从官网标记行提取 URL。组名 `url`;取值走 `siteMatch.groups.url`,不按位置数括号。
 */
export const SITE_PICK_RE = /\[SITE\]=\s*(?<url>\S+)/

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

/**
 * 懒取端点每页行数上限(乱传大数也压不垮查询)。
 */
export const PAGE_SIZE_MAX = 100

/**
 * 懒取端点的浏览器缓存头(2 分钟 + SWR 10 分钟)。
 */
export const EMP_CACHE_CONTROL = 'public, max-age=120, stale-while-revalidate=600'

/**
 * 橱窗三分表的浏览器缓存头(5 分钟 + SWR 1 小时)。
 */
export const SPONSORS_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/**
 * 导出端点的缓存头(付费名单不进任何缓存)。
 */
export const CSV_CACHE_CONTROL = 'no-store'

/**
 * 排序键:按在招数(导出端点 sort 的默认值;SORT_SKILLED 的另一半)。
 */
export const SORT_OPEN = 'open'

/**
 * 导出筛选 city 参数长度上限。
 */
export const CITY_LEN_MAX = 60

/**
 * 导出筛选 q 参数长度上限。
 */
export const EXPORT_Q_LEN_MAX = 80

/**
 * 公司信息懒探索的公司名长度上限(再长不是公司名)。
 */
export const NAME_LEN_MAX = 200

/**
 * 公司现查请求上的「这一页有过真人动作」标记头(页面那头 components/companies 发;值是 HUMAN_YES 才联网现查)。
 * 2026-09-19:09-11~09-17 每天上千次公司现查,被查的全是长尾小雇主(平均 1.6 个在招岗、一堆私人雇主)、24 小时匀速每 20~40 秒一次,
 * 每 IP 每天 10 次的匿名限流拦不住(IP 分散在 150 个以上)—— 不守 robots 的无头浏览器顺着站点地图把公司页挨个渲染,每渲染一页
 * 就替我们打一次联网搜索,把盒子的出口 IP 在 Brave / DuckDuckGo / Startpage 那头打成了黑名单(searxng 0 结果,AI 简介从此裸答)。
 * 库里已有的简介照给(不花钱);没有的,没带标记就回 204,不进额度闸、不打网关。
 */
export const HDR_HUMAN = 'x-human'

/**
 * 标记值:这一页有过真人动作。
 */
export const HUMAN_YES = '1'

/**
 * 请求头名:浏览器标识(现查留痕用 —— 下回再有成批现查,日志里一眼看得出是谁)。
 */
export const HDR_UA = 'user-agent'

/**
 * 现查留痕里浏览器标识最多记多少字。
 */
export const UA_LOG_MAX = 120

/**
 * 请求头名:接受语言(真浏览器每个请求都自动带;Googlebot 渲染时不带 —— 站上给爬虫出英文页认的也是这一条)。
 */
export const HDR_ACCEPT_LANGUAGE = 'accept-language'

/**
 * 五位职业码的形状(导出筛选 noc 参数验形)。
 */
export const NOC5_RE = /^\d{5}$/

/**
 * 导出筛选认的省码(担保三表只覆盖这十省)。
 */
export const EXPORT_PROVS: string[] = ['NS', 'NB', 'NL', 'PE', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC']

/**
 * 错误体:要 Pro(导出是付费交付物)。
 */
export const E_PRO = 'pro'

/**
 * CSV 表头(只含库内可核验事实列,无任何「好签/成功率」字样 —— 凭证=粗筛信号非担保承诺)。
 */
export const CSV_HEAD: string[] = ['employer', 'aip_designated', 'lmia_3mo', 'lmia_6mo', 'lmia_1yr', 'lmia_positions_2yr', 'lmia_skilled', 'lmia_last_quarter', 'pnp_streams', 'pnp_in_demand_hit', 'open_jobs', 'provinces', 'city']

/**
 * CSV 列分隔符。
 */
export const CSV_SEP = ','

/**
 * CSV 行分隔符。
 */
export const CSV_NL = '\n'

/**
 * CSV 布尔真值(aip/named 两列)。
 */
export const CSV_YES = 'yes'

/**
 * CSV 空格(数值缺位)。
 */
export const CSV_EMPTY = ''

/**
 * CSV 开头的 BOM(Excel 打开中文别名不乱码)。
 */
export const CSV_BOM = '\ufeff'

/**
 * 需要加引号的格(含逗号/引号/换行才加,Excel 兼容)。
 */
export const CSV_QUOTE_RE = /[",\n]/

/**
 * CSV 引号。
 */
export const CSV_QUOTE = '"'

/**
 * CSV 格内引号的转义写法。
 */
export const CSV_QUOTE_ESC = '""'

/**
 * 格内找引号的正则(全局替换用)。
 */
export const CSV_QUOTE_G_RE = /"/g

/**
 * CSV 响应的 Content-Type。
 */
export const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8'

/**
 * CSV 响应的下载文件名头值。
 */
export const CSV_DISPOSITION = 'attachment; filename="sponsor-employers.csv"'

/**
 * 公司简介五节标记行（ai_brief 生成侧的口径主人在本域；翻译时剖出标记只翻正文）。
 * 2026-09-20 加 OFFICES / NEWCOMERS / BENEFITS 三节(数据层 mart 把官网整理记录的后三节接在官网版简介后面,翻译时同样只翻正文)。
 */
export const CO_MARKS_RE = /^(\[(?:WHAT|BASE|SIZE|FOUNDED|NOTE|OFFICES|NEWCOMERS|BENEFITS)\]\s*)(.*)$/

/**
 * 简介翻译的 IP 日限。
 */
export const CO_IP_DAILY = 60

/**
 * 简介翻译限额键前缀。
 */
export const CO_LIMIT_PREFIX = 'cotr:'

/**
 * 筛选参数没给,或给了但不合法(省码不是两位、职业码不是五位、制度不在三个之内)——
 * 这一格**不筛**,不是「筛出空结果」。URL 参数缺席、paramOf 取不到、三个 clean 变量的初值
 * 都落它:宁可少筛一格给全量,也不拿猜出来的值把用户的结果悄悄削掉。
 * 🔵 这里**不写类型注解**:`SponsorFilters.f` 的联合自带这个空串(`'' | 'aip' | 'lmia' | 'named'`),
 * 只有保持字面量类型才落得进那个联合;写成 `: string` 当场 tsc 红。
 */
export const FILTER_UNSET = ''

/**
 * 没有日期。两处共用:名录抓取日(designated 口径的 fetched)与公司调查日(ai_fetched)。
 * 三种情况都落它 —— 查挂了回的空表、hiring 口径本来就不读名录、库里那一格是 NULL。
 * 空表也照发一格空串而不是省掉这个字段:前端读的是同一个形状,少一格就得多写一套判断。
 */
export const FETCHED_NONE = ''

/**
 * B4 公司事实列一列都没探到时的 SQL 片段:一个字都不拼,担保聚合的 SELECT 与 GROUP BY
 * 退回没有那五列的原样(#280/E14-02 容缺先例 —— 生产库大概率还没建 founded_year 那批,
 * 探到哪列拼哪列,探不到就当没有,不许因为缺列让整条查询挂掉)。
 */
export const SQL_FRAG_NONE = ''

/**
 * 没有省。担保行的 provs 是空数组(表行没有单一地址),或对照聚合的岗位一个省都没落上。
 * 判定引擎收到它就走「不按省判门槛」那条路 —— 空串是「这行没有省」,不是「全国」。
 */
export const PROVINCE_NONE = ''

/**
 * 对照聚合喂给匹配引擎的岗位不带 LMIA 季度事实:对照只看在招与档案匹配,LMIA 那三格
 * 一律不填 —— 数值两格给 null,字符串这格就是空串,两种写法说的是同一件事「没查这格」。
 */
export const LMIA_QUARTER_NONE = ''

/**
 * 没有官网。两处共用:库里 ai_website 是 NULL,或模型这次回答里没给出合法的 [SITE] 行。
 * 写库前它会被翻回 NULL(不存空串);前端凭空串决定不渲染官网链接。
 */
export const WEBSITE_NONE = ''

/**
 * 官网标记行整行删掉时的替身:[SITE] 那行是给我们解析用的协议行、不是简介正文,
 * 而 URL 已经先被 SITE_PICK_RE 取走了,所以这里一个字都不留。
 */
export const SITE_LINE_DROP = ''

/**
 * 维基没有这门语言的名字(zh 三个变体全空,或 ko 缺)。别名留空不瞎猜 ——
 * 音译或机翻出来的公司名比没有更糟:用户会拿它去搜,搜不到。
 */
export const ALIAS_NONE = ''

/**
 * 请求体里没给公司名。body 解不出来、name 不是字符串、trim 完什么都不剩,三种都落它,
 * 随后一律 400。这一格是必填项 —— 空串不是「查全部公司」。
 */
export const NAME_UNSET = ''

/**
 * 请求体里没给目标语种。随后过 TRANS_LANGS 白名单必然落空 → 400。
 * 不给它挑一个默认语种:猜错语种等于把用户看不懂的译文当成他要的。
 */
export const LANG_UNSET = ''







/**
 * 懒翻公司名:译名最长(2026-09-14 Frank「公司名也做一个懒加载翻译」);超过 = 模型在解释不是在译,丢弃不落库。
 */
export const ALIAS_MAX_LEN = 40

/**
 * 懒翻公司名的每 IP 日限(与简介翻译同一桶)。
 */
export const ALIAS_LIMIT_PREFIX = 'coal:'

/**
 * 别名缓存键分隔。
 */
export const ALIAS_KEY_SEP = '|'

/**
 * 懒翻公司名给模型的一句话(公司名当纯文本行翻,翻译器不知道它是名字;拼在名字前让它照名字译)。
 */
export const ALIAS_PREFIX = ''

/**
 * 换行(译名只取第一行)。
 */
export const NEWLINE = '\n'

/**
 * 连锁品牌译名核定表(2026-09-23 Frank「subway 翻译也是错的」,选「品牌译名核定表」):名字里认出这些品牌的雇主,
 * 中 / 韩文名一律用表里的,盖掉模型给的和库里已有的。来由:懒翻接口不带品牌旁证,09-14 把 Subway 按字面译成「地铁」
 * 写进公司表;探索工人 09-19 翻对了「赛百味」,却被「公司表已有同版本译名就不动」挡在门外;加盟店的法人名
 * (Tastiest II Subway Limited、PRATIK & BROTHERS LTD O/A SUBWAY)模型也常译成「……地铁」或只译法人那半截。
 * 只收有通行中文名、名字不撞姓氏和普通词的大连锁:Wendy's / Harvey's / Desjardins 撞姓氏,Shell / Metro 撞普通词,不收;
 * 酒店不收(一个品牌下好几个子品牌,模型给的「万怡」「智选假日」比统一成母品牌准)。加一行 = 加一个品牌,中韩两格都要填。
 */
export const BRAND_ALIASES = {
  /**
   * Subway;09-14 懒翻成「地铁」实撞。
   */
  subway: { re: /\bsubway\b/i, zh: '赛百味', ko: '서브웨이' },

  /**
   * McDonald's;只认带 s 的写法(McDonald 单独是常见姓氏,McDonald Construction 之类不是它)。
   */
  mcdonalds: { re: /\bmc ?donald['’]?s\b/i, zh: '麦当劳', ko: '맥도날드' },

  /**
   * Tim Hortons;库里译名有「蒂姆·霍顿斯」「蒂姆霍顿斯温莎」几种,统一成探索工人提示词里的写法。
   */
  timhortons: { re: /\btim horton['’]?s?\b/i, zh: '蒂姆霍顿', ko: '팀홀튼' },

  /**
   * KFC。
   */
  kfc: { re: /\bkfc\b|\bkentucky fried chicken\b/i, zh: '肯德基', ko: '케이에프씨' },

  /**
   * Pizza Hut。
   */
  pizzahut: { re: /\bpizza hut\b/i, zh: '必胜客', ko: '피자헛' },

  /**
   * Domino's;只认带 s 的写法(Domino 单独撞 Dominion 之类的普通词)。
   */
  dominos: { re: /\bdomino['’]?s\b/i, zh: '达美乐', ko: '도미노피자' },

  /**
   * Dairy Queen。
   */
  dairyqueen: { re: /\bdairy queen\b/i, zh: '冰雪皇后', ko: '데어리퀸' },

  /**
   * Burger King。
   */
  burgerking: { re: /\bburger king\b/i, zh: '汉堡王', ko: '버거킹' },

  /**
   * Starbucks。
   */
  starbucks: { re: /\bstarbucks\b/i, zh: '星巴克', ko: '스타벅스' },

  /**
   * Boston Pizza。
   */
  bostonpizza: { re: /\bboston pizza\b/i, zh: '波士顿披萨', ko: '보스턴 피자' },

  /**
   * Walmart。
   */
  walmart: { re: /\bwal-?mart\b/i, zh: '沃尔玛', ko: '월마트' },

  /**
   * Home Depot。
   */
  homedepot: { re: /\bhome depot\b/i, zh: '家得宝', ko: '홈디포' },

  /**
   * Canadian Tire;库里有「加拿大轮胎商店041号」之类带门店号的,统一成品牌名。
   */
  canadiantire: { re: /\bcanadian tire\b/i, zh: '加拿大轮胎', ko: '캐나디안 타이어' },

  /**
   * Loblaw / Loblaws;探索工人 09-19 译成「乐购公司」(乐购是 Tesco)实撞。
   */
  loblaw: { re: /\bloblaws?\b/i, zh: '罗布劳', ko: '로블로' },

  /**
   * Sobeys;库里有「索比斯资本」「索贝斯资本有限公司」两种。
   */
  sobeys: { re: /\bsobeys\b/i, zh: '索贝斯', ko: '소비스' },

  /**
   * Esso(加油站加盟店)。
   */
  esso: { re: /\besso\b/i, zh: '埃索', ko: '에쏘' },

  /**
   * Petro-Canada;库里有一行把同店的 A&W 并进来译成「派特罗加拿大/A&W快餐」。
   */
  petrocanada: { re: /\bpetro[- ]?canada\b/i, zh: '加拿大石油', ko: '페트로캐나다' },

  /**
   * RBC 加拿大皇家银行。
   */
  rbc: { re: /\brbc\b|\broyal bank of canada\b/i, zh: '加拿大皇家银行', ko: '캐나다왕립은행' },

  /**
   * TD 道明银行(TD Securities 之类不带 Bank 的子公司不认)。
   */
  td: { re: /\btd bank\b|\btd canada trust\b|\btoronto-dominion\b/i, zh: '道明银行', ko: '토론토도미니언은행' },

  /**
   * Scotiabank 丰业银行。
   */
  scotiabank: { re: /\bscotiabank\b|\bbank of nova scotia\b/i, zh: '丰业银行', ko: '스코샤은행' },

  /**
   * BMO 满地可银行;探索工人 09-19 译成「丰业金融集团」(丰业是 Scotiabank)实撞。
   */
  bmo: { re: /\bbmo\b|\bbank of montreal\b/i, zh: '满地可银行', ko: '몬트리올은행' },

  /**
   * CIBC 加拿大帝国商业银行。
   */
  cibc: { re: /\bcibc\b|\bcanadian imperial bank of commerce\b/i, zh: '加拿大帝国商业银行', ko: '캐나다임페리얼상업은행' },
}

/**
 * 官网简介翻译缓存键的尾巴。
 */
export const DESC_KEY_TAIL = '|desc'
