/**
 * 统计域的形状 —— **本域自己声明,不从别的域取**(唯一例外:`import type` 自 db 基础设施叶子)。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

import type { Db } from '../db'

/**
 * 库标量一格(窄行取数用;json 列另走各自的 json 形状)。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行(窄查询 + 词汇表收窄)。
 */
export type Row = Record<string, Cell>

/**
 * JSON 列也在场时的一格(json/jsonb 列驱动可能已解析成对象)。
 */
export type JsonCell = string | number | boolean | null | JsonObj | JsonCell[]

/**
 * JSON 对象格。
 */
export type JsonObj = { [k: string]: JsonCell }

/**
 * 带 JSON 列的一行。
 */
export type JsonRow = Record<string, JsonCell>

/**
 * 可空字符串(官方没写保 null)。
 */
export type MaybeStr = string | null

/**
 * 字符串清单。
 */
export type StrList = string[]

/**
 * 字符串清单的异步返回。
 */
export type StrListOut = Promise<StrList>

/**
 * 地区统计一行(stats 表;省 × 大类,mid='all' 为大类汇总行)。
 */
export type StatRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 本站大类(数据值,中文)。
   */
  broad: string

  /**
   * NOC 中类;'all'=大类汇总行(旧行/mid 列未落地时读取层回填 'all')。
   */
  mid: string

  /**
   * 在招岗数;没算保 null。
   */
  openJobs: number | null

  /**
   * 近 7 天新增;没算保 null。
   */
  new7d: number | null

  /**
   * 中位年化时薪折算;没算保 null。
   */
  medianWageAnnual: number | null

  /**
   * 中位年薪(标注年薪的岗);没算保 null。
   */
  medianSalaryAnnual: number | null

  /**
   * 具名通道岗数;没算保 null。
   */
  namedJobs: number | null

  /**
   * 通道名清单串。
   */
  streamLabels: string

  /**
   * AIP 岗数;没算保 null。
   */
  aipJobs: number | null

  /**
   * Top 城市 JSON 串(缺位给 '[]',消费端按 JSON 解析)。
   */
  topCities: string

  /**
   * 抓取日。
   */
  fetched: string

  /**
   * E12-07 难度指数(jsonb 透传,仅 broad=all 行有值)。
   */
  difficulty: StatDifficulty
}

/**
 * 地区统计行的复数。
 */
export type StatRows = StatRow[]

/**
 * 一行地区统计的原始行(三条 stats 查询共用;降级路没有 mid/difficulty 两列,
 * 读取层照 `== null` 收)。numeric 列 pg 交回字符串,词汇表一网收。
 */
export type StatDbRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 本站大类。
   */
  broad: string | null

  /**
   * NOC 中类;大类汇总行是 'all'。
   */
  mid: string | null

  /**
   * 在招岗数。
   */
  open_jobs: number | string | null

  /**
   * 近 7 天新增。
   */
  new7d: number | string | null

  /**
   * 中位年化时薪折算。
   */
  median_wage_annual: number | string | null

  /**
   * 中位年薪。
   */
  median_salary_annual: number | string | null

  /**
   * 具名通道岗数。
   */
  named_jobs: number | string | null

  /**
   * 通道名清单串。
   */
  stream_labels: string | null

  /**
   * AIP 岗数。
   */
  aip_jobs: number | string | null

  /**
   * Top 城市 JSON 串。
   */
  top_cities: string | null

  /**
   * 抓取日。
   */
  fetched: string | null

  /**
   * E12-07 难度指数(jsonb,仅 broad=all 行有值)。
   */
  difficulty: StatDifficulty
}

/**
 * `loadStats` 的入参。
 */
export type StatsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

    /**
   * true=带中类行(仅图表下钻用);false=只回大类层 —— 既有页面(省页/对比/表格)
   * 口径不变不重复计数。
   */
  withMid: boolean
}

/**
 * `loadStats` 的返回。
 */
export type StatsOut = Promise<StatRows>

/**
 * difficulty 列的透传形态:jsonb 驱动可能给对象,文本列绕行时是字符串,没有是 null。
 */
export type StatDifficulty = string | JsonObj | null

/**
 * citation 来源一行(field-sources 维度)。
 */
export type SrcRow = {
  /**
   * 字段名。
   */
  field: string

  /**
   * 发布方。
   */
  publisher: string

  /**
   * 出处 URL。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string
}

/**
 * citation 来源行的复数。
 */
export type SrcRows = SrcRow[]

/**
 * `loadStatSources` 的返回。
 */
export type SrcRowsOut = Promise<SrcRows>

/**
 * IRCC 体量一格(数 + 口径年)。
 */
export type ProvVolNum = {
  /**
   * 数。
   */
  n: number

  /**
   * 口径年。
   */
  year: string
}

/**
 * `ProvVolNum` 或没有。
 */
export type MaybeProvVolNum = ProvVolNum | null

/**
 * 省卡 IRCC 体量(批B #133:provinces.info jsonb,与 E8-12 省弹框同源同口径)。
 */
export type ProvVol = {
  /**
   * 学签;官方缺位保 null。
   */
  study: ProvVolNum | null

  /**
   * TFWP 工签;官方缺位保 null。
   */
  tfwp: ProvVolNum | null

  /**
   * IMP 工签;官方缺位保 null。
   */
  imp: ProvVolNum | null

  /**
   * 省提名拿到 PR;官方缺位保 null。
   */
  pnpPr: ProvVolNum | null
}

/**
 * `ProvVol` 或没有。
 */
export type MaybeProvVol = ProvVol | null

/**
 * `ProvVolJson` 或没有。
 */
export type MaybeProvVolJson = ProvVolJson | null

/**
 * `ProvVolNumJson` 或没有。
 */
export type MaybeProvVolNumJson = ProvVolNumJson | null

/**
 * info json 里的体量一格(只声明本域真正读的两格)。
 */
export type ProvVolNumJson = {
  /**
   * 数。
   */
  n: number | string | null

  /**
   * 口径年。
   */
  year: string | number | null
}

/**
 * provinces.info json 里本域读的那几格。
 */
export type ProvVolJson = {
  /**
   * 学签。
   */
  study: ProvVolNumJson | null

  /**
   * TFWP 工签。
   */
  tfwp: ProvVolNumJson | null

  /**
   * IMP 工签。
   */
  imp: ProvVolNumJson | null

  /**
   * 省提名拿到 PR。
   */
  pnpPr: ProvVolNumJson | null
}

/**
 * info 一格的原料:json 列驱动可能已解析成对象,经文本列绕行时是字符串。
 */
export type ProvVolRaw = ProvVolJson | string | null

/**
 * `StatDiffJson` 或没有。
 */
export type MaybeStatDiff = StatDiffJson | null

/**
 * 一行省份维度洗净后的事实(json 的解析与体量提取都在 rows 做完,functions 拿到即有效)。
 */
export type StatProvInfoFact = {
  /**
   * 两位省码。
   */
  code: string

  /**
   * 省卡体量四格;没有则 null。
   */
  info: MaybeProvVol
}

/**
 * 一行各省难度洗净后的事实(json 的解析与 tier 提取都在 rows 做完)。
 */
export type StatProvDiffFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 难度档;没有则 null。
   */
  tier: MaybeStr
}

/**
 * 省卡增补一行(体量 + 难度档)。
 */
export type ProvExtra = {
  /**
   * IRCC 体量;没有则 null。
   */
  info: MaybeProvVol

  /**
   * 难度档(stats.difficulty broad=all 行的 tier);没有则 null。
   */
  tier: MaybeStr
}

/**
 * 省码 → 省卡增补。
 */
export type ProvExtraMap = Record<string, ProvExtra>

/**
 * `loadProvExtra` 的返回。
 */
export type ProvExtraOut = Promise<ProvExtraMap>

/**
 * difficulty json 里本域读的那一格(tier;完整形状归 points)。
 */
export type StatDiffJson = {
  /**
   * 难度档。
   */
  tier: string | null
}

/**
 * difficulty 一格的原料(两条路同 `ProvVolRaw`)。
 */
export type StatDiffRaw = StatDiffJson | string | null

/**
 * 一行省份维度(SQL.PROVINCES_INFO)。
 */
export type StatProvInfoDbRow = {
  /**
   * 两位省码。
   */
  code: string | null

  /**
   * info json 原料。
   */
  info: ProvVolRaw
}

/**
 * 省份维度行的复数。
 */
export type StatProvInfoDbRows = StatProvInfoDbRow[]

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY)。
 */
export type StatProvDiffDbRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 难度 json 原料。
   */
  difficulty: StatDiffRaw
}

/**
 * 难度行的复数。
 */
export type StatProvDiffDbRows = StatProvDiffDbRow[]

/**
 * E8-14 统计主图·职业粒度一行(mart 算好,前端零计算透传)。
 *
 * E13-03 派生指标(契约 v3,见 docs/implementation/E13-把脉首页/00_总设计与口径.md §3 修订 v3):
 * 上前端的只有 new14d / new14dPrev(分母)/ mom14d(14 天发帖环比)/ avgDaysOpen / pulseScore。
 * **30 天口径与下架口径都不进这个类型**:
 *   · mom30d 的分母窗卡在抓取全国化爬坡期(全员假涨),有成熟度闸门,约 8-31 后才可信;
 *   · closed30d/net30d 的判死日≠真实下架日,7-25 起的排水期虚高。
 * 凡上前端的数字必须经得起「怎么算的」追问 —— 两者同入 E13-04。
 * 列可能还没落库:读取层逐列探测(loadOccStats),缺列即 null,
 * 前端「null=该卡/该行/该榜整块不渲染」(绝不显示 0 或 NaN)。
 */
export type OccRow = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 两位省码('all'=全国行)。
   */
  province: string

  /**
   * 中文名(本站 04f/04g 译名)。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 官方英文名(引用依据)。
   */
  titleEn: string

  /**
   * 韩文名(noc_descriptions 借来;名字的家在那张表)。
   */
  titleKo: string

  /**
   * TEER;未分类保 null。
   */
  teer: number | null

  /**
   * 本站大类。
   */
  broad: string

  /**
   * NOC 中类。
   */
  mid: string

  /**
   * NOC 小类。
   */
  fine: string

  /**
   * 在招岗数;没算保 null。
   */
  openJobs: number | null

  /**
   * 近 7 天新增;没算保 null。
   */
  new7d: number | null

  /**
   * 中位年化时薪折算;没算保 null。
   */
  medianWageAnnual: number | null

  /**
   * 时薪低位年化;没算保 null。
   */
  wageLowAnnual: number | null

  /**
   * 时薪高位年化;没算保 null。
   */
  wageHighAnnual: number | null

  /**
   * 中位年薪;没算保 null。
   */
  medianSalaryAnnual: number | null

  /**
   * 年薪样本数;没算保 null。
   */
  salaryN: number | null

  /**
   * 具名通道岗数;没算保 null。
   */
  namedJobs: number | null

  /**
   * 近 14 天新增;列未落库保 null。
   */
  new14d: number | null

  /**
   * 上一个 14 天窗(环比分母);列未落库保 null。
   */
  new14dPrev: number | null

  /**
   * 14 天发帖环比;列未落库保 null。
   */
  mom14d: number | null

  /**
   * 平均在架天数;列未落库保 null。
   */
  avgDaysOpen: number | null

  /**
   * 把脉分;列未落库保 null。
   */
  pulseScore: number | null

  /**
   * 省提名具名清单命中的省串;列未落库保 null。
   */
  pnpProvs: string | null

  /**
   * 通道档;列未落库保 null。
   */
  channelTier: string | null

  /**
   * E13-08 完全无路可走的省(''=处处有路;null=未落库或 TEER 未分类不判)。
   */
  deadProvs: string | null

  /**
   * E13-09 先省内工作 6 个月可提名的省(pnpProvs 同步收紧为拿 offer 即可)。
   */
  pnpProvsCond: string | null

  /**
   * E14-02 担保率分子·全量口径(担保侧观测量);列未落库保 null。
   */
  sponsorPosQ: number | null

  /**
   * E14-02 担保率分子·技能股口径;列未落库保 null。
   */
  sponsorPosSkilledQ: number | null

  /**
   * E14-02 担保率分母(StatCan JVWS 官方空缺季度数);列未落库保 null。
   */
  jvwsVacQ: number | null

  /**
   * E14-02 担保率(分子/分母的 0-1 小数;>1 是已知方法论偏差,见 E14-01 §7.4 农业案例,非 bug)。
   */
  sponsorRate: number | null
}

/**
 * 职业统计行的复数。
 */
export type OccRows = OccRow[]

/**
 * `loadOccStats` 的返回。
 */
export type OccRowsOut = Promise<OccRows>

/**
 * 宏观原样行的透传形(macro_series / pnp_ops_stats 零读格透传给 /api/stats/macro,
 * 行构造在消费端 —— 不透明化 `= object` 的既有先例;2026-09-11 lint 收账补名)。
 */
export type RawRows = object[]

/**
 * `loadMacroRows` / `loadPnpOpsRows` 的返回。
 */
export type RawRowsOut = Promise<RawRows>

/**
 * E8-14 统计主图·城市粒度一行(城市译名借 cities 维度表,小镇留空 → 前端回退英文原名)。
 */
export type CityRow = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文名(48 个主要城市有,小镇空串)。
   */
  cityZh: string

  /**
   * 城市韩文名(同上)。
   */
  cityKo: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 在招岗数;没算保 null。
   */
  openJobs: number | null

  /**
   * 近 7 天新增;没算保 null。
   */
  new7d: number | null

  /**
   * 中位年化时薪折算;没算保 null。
   */
  medianWageAnnual: number | null

  /**
   * 中位年薪;没算保 null。
   */
  medianSalaryAnnual: number | null

  /**
   * 年薪样本数;没算保 null。
   */
  salaryN: number | null

  /**
   * 具名通道岗数;没算保 null。
   */
  namedJobs: number | null

  /**
   * 城市级专属通道(RCIP / FCIP / RCIP+FCIP,mart 段19 城×省打标聚合);没有专属通道是 null。
   */
  pilot: string | null

  /**
   * CSD 人口(StatCan 17-10-0155 年度估计,2026-09-11 城市段批二;人工核定城市清单外是 null)。
   */
  population: number | null

  /**
   * 🔴 所在都会区(CMA)失业率(14-10-0459 月度季调)—— CMA 口径不是本市,展示层列名必须写
   * 「都会区失业率」;不在任何 CMA 是 null。
   */
  unempRate: number | null
}

/**
 * 城市统计行的复数。
 */
export type CityRows = CityRow[]

/**
 * `loadCityStats` 的入参(limit 分口径:market 主图取前 CITY_LIMIT,城市段全量取 CITY_ALL_LIMIT)。
 */
export type CityStatsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 最多取几行。
   */
  limit: number
}

/**
 * `loadCityStats` 的返回。
 */
export type CityRowsOut = Promise<CityRows>

/**
 * 城市 × 大类在招一行(SQL.CITY_INDUSTRY;城市段「行业对比」表)。
 */
export type CityIndustryRow = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 本站大类(数据值,中文;三语列头借 BroadLabelRow)。
   */
  broad: string

  /**
   * 该城该大类在招岗数。
   */
  n: number
}

/**
 * 城 × 大类计数行的复数。
 */
export type CityIndustryRows = CityIndustryRow[]

/**
 * `loadCityIndustry` 的返回。
 */
export type CityIndustryOut = Promise<CityIndustryRows>

/**
 * 城市快照的大类分布一行(SQL.CITY_INDUSTRY 的原始行;by_broad 是 seed 聚合的 jsonb,
 * pg 驱动已解析成对象 —— 跨边界形状,读取层展开时逐格收窄)。
 */
export type CityBroadDbRow = {
  /**
   * 城市英文名(库里可空)。
   */
  city: string | null

  /**
   * 两位省码(库里可空)。
   */
  province: string | null

  /**
   * 大类 → 在招数(jsonb;没聚合到是 null)。
   */
  by_broad: Record<string, number | string | null> | null
}

/**
 * 大类三语名一行(SQL.CITY_BROAD_LABELS;行业对比列头)。
 */
export type BroadLabelRow = {
  /**
   * 本站大类(数据值,中文)。
   */
  broad: string

  /**
   * 英文名。
   */
  broadEn: string

  /**
   * 韩文名。
   */
  broadKo: string
}

/**
 * `loadBroadLabels` 的返回。
 */
export type BroadLabelsOut = Promise<BroadLabelRow[]>

/**
 * 试点社区一行(SQL.CITY_PILOTS;城市段「试点社区」表)。
 */
export type PilotCommRow = {
  /**
   * 社区官方名(含省尾巴,形如 'Sudbury, ON';展示层去尾)。
   */
  name: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 通道类型(RCIP / FCIP)。
   */
  type: string

  /**
   * 社区覆盖城市的在招岗数(0 是事实:JB 全省全职业覆盖)。
   */
  openJobs: number
}

/**
 * `loadCityPilots` 的返回。
 */
export type PilotCommsOut = Promise<PilotCommRow[]>

/**
 * 城市 DLI 统计一行(SQL.CITY_DLI_STATS;城市段「留学城市」表)。
 */
export type DliCityRow = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文名(借 cities 维度,缺则空串)。
   */
  cityZh: string

  /**
   * 城市韩文名(同上)。
   */
  cityKo: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * DLI 院校数。
   */
  n: number

  /**
   * 其中公立。
   */
  publicN: number

  /**
   * 其中毕业可申工签(PGWP 资格)。
   */
  gradN: number
}

/**
 * `loadDliCities` 的返回。
 */
export type DliCitiesOut = Promise<DliCityRow[]>

/**
 * 把脉页趋势段·逐日在招量一行(SQL.STATS_DAILY_SERIES:日期 × 大类,十省已加总)。
 */
export type DailyRow = {
  /**
   * 日期(YYYY-MM-DD)。
   */
  date: string

  /**
   * 本站大类;'all' = 该日全国汇总行。
   */
  broad: string

  /**
   * 该日该大类在招量(十省加总)。
   */
  openJobs: number
}

/**
 * 逐日在招量清单(按日期升序)。
 */
export type DailyRows = DailyRow[]

/**
 * `loadDailySeries` 的返回。
 */
export type DailyRowsOut = Promise<DailyRows>

/**
 * 通道筛选的职业码清单(E8-14 ⑥,只取**职业粒度能判定**的两条)。
 */
export type ChannelNocs = {
  /**
   * 省提名具名清单(pnp_occupations)里的码。
   */
  pnp: StrList

  /**
   * 联邦 EE 类别(ee_categories)里的码。
   */
  ee: StrList
}

/**
 * `loadChannelNocs` 的返回。
 */
export type ChannelNocsOut = Promise<ChannelNocs>

/**
 * 单条通道码清单查询的入参。
 */
export type ChannelNocsQueryIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 固定语句(PNP_NOCS_DISTINCT / EE_NOCS_DISTINCT 二选一)。
   */
  sql: string
}

/**
 * 捕到的错误的本地名(库类型先起本地名,签名里不出现外部类型)。
 */
export type CaughtError = Error

/**
 * pg 抛出来的错误形状(code 是 pg 挂上去的,TS 看不见 —— pgCodeOf 的跨边界断言目标)。
 */
export type PgFailure = Error & {
  /**
   * pg 错误码(如 42703)。
   */
  code: string
}

/**
 * fine 下钻的一行（小类 + 在招计数）。
 */
export type FineRow = {
  /**
   * 小类名（数据层中文值）。
   */
  fine: string

  /**
   * 在招岗数。
   */
  n: number
}

/**
 * `loadFineCounts` 的入参。
 */
export type FineCountsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

    /**
   * 省码。
   */
  prov: string

  /**
   * 大类。
   */
  broad: string

  /**
   * 中类。
   */
  mid: string
}

/**
 * `loadFineCounts` 的返回。
 */
export type FineRowsOut = Promise<FineRow[]>

/**
 * /api/stats/market 四件套缓存的一格。
 */
export type MarketSlot = {
  /**
   * 缓存的四件套（透传 json，形状由各 load* 函数的返回定）。
   */
  v: object

  /**
   * 写入时刻（ms）。
   */
  ts: number
}

/**
 * /api/stats/macro 两份数据缓存的一格(形状同 MarketSlot:v 透传 json)。
 */
export type MacroStatsSlot = {
  /**
   * 缓存的两份(macro_series 行 + pnp_ops_stats 行,原样 json)。
   */
  v: object

  /**
   * 写入时刻(ms)。
   */
  ts: number
}

/**
 * /api/stats/city 五份数据缓存的一格(形状同 MarketSlot:v 透传 json)。
 */
export type CityStatsSlot = {
  /**
   * 缓存的五份(cities / industry / broads / pilots / dli,原样 json)。
   */
  v: object

  /**
   * 写入时刻(ms)。
   */
  ts: number
}

/**
 * 统计域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type StatsCache = {
  /**
   * market 四件套；没拉过/过期由 TTL 判。
   */
  market: MarketSlot | null

  /**
   * macro 两份;没拉过/过期由 TTL 判。
   */
  macroStats: MacroStatsSlot | null

  /**
   * city 五份(城市段);没拉过/过期由 TTL 判。
   */
  cityStats: CityStatsSlot | null
}

/**
 * 空清单（`emptyRows` 兜底的返回；可赋给任意行清单）。
 */
export type EmptyList = []
