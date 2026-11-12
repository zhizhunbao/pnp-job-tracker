/**
 * points 域的子桶 tables 的形状 —— 官方表取数、单件缓存与行构造(getScoreTables 一族),/api/points/factors 的省过滤小件。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 官方分值表与抽选事实
// =========================================================================

/**
 * 官方分值表一行(`pnp_score_factors` 维度表)。
 *
 * 🔴 **分值一分都不许在代码里编** —— 全部来自这张表。本域只负责「你选的条件对应哪一行」,
 * 分数照抄那一行的 `points`。
 */
export type ScoreFactor = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 分制全名,结尾括号里可能自报通道。
   */
  system: string

  /**
   * 官方表的小节名(work / education / language …)。
   */
  factor: string

  /**
   * 这一行是档位、加分项还是规则。
   */
  kind: string

  /**
   * 组内序号。加分项的勾选键靠它。
   */
  seq: number

  /**
   * 官方原文标签。**UI 必须显出来**,好让用户核对我们匹的是哪一档。
   */
  label: string

  /**
   * 这一档给几分。
   */
  points: number | null

  /**
   * 与上一条是**二选一**(官方原文的「…, or」)。
   */
  xorPrev: boolean

  /**
   * 官方写的附加规则原文。
   */
  rule: string

  /**
   * 该因素封顶多少分。
   */
  factorMax: number | null

  /**
   * 该因素属于哪个官方分组(SK 的 FACTOR I / II)。
   */
  factorGroup: string

  /**
   * 该分组封顶多少分。
   */
  groupMax: number | null

  /**
   * 该分制的及格线。
   */
  passMark: number | null

  /**
   * 该分制满分。
   */
  maxTotal: number | null

  /**
   * 官方指南的生效日。
   */
  guideEffective: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 官方页地址。
   */
  url: string
}

/**
 * 省抽选事实(`pnp_draws` 里用得着的几列)。
 */
export type DrawRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选类别。
   */
  kind: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 分数线;没公布则 null。
   */
  score: number | null

  /**
   * 通道名的中文灰注(ETL 已译)。
   *
   * **只在 zh 界面出** —— en/ko 不读:官方原名是事实,译名是辅助,不能反过来盖掉原名。
   */
  streamZh?: string
}

// =========================================================================
// 2. 决策页官方表包(getScoreTables;2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * 库标量一格(本域窄行取数用;json 列另走各自的 json 形状)。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行(窄查询 + 词汇表收窄)。
 */
export type Row = Record<string, Cell>

/**
 * 可空数值:官方没写保 null,不折 0。
 */
export type MaybeNum = number | null

/**
 * json 里的一格数字原料:ETL 写的是数字,经文本列绕行时可能是字符串。
 */
export type NumCell = number | string | null

/**
 * 字符串清单。
 */
export type StrList = string[]

/**
 * `ScoreFactor` 的复数。
 */
export type ScoreFactors = ScoreFactor[]

/**
 * `DrawRow` 的复数。
 */
export type DrawRows = DrawRow[]

/**
 * 抽选事实一行(pnp_draws 洗净后的本域形态)—— 比 `DrawRow` 多带 invitations。
 *
 * 🔴 invitations 必须带出来:overview 的入选条件就是「有分数线**或**有邀请数」,
 * 只带分数线的话,靠邀请数入选的那几行会显示成一整行「—」——
 * 把它入选的那个事实藏了(2026-08-12 Frank 实拍)。
 */
export type DrawFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选类别。
   */
  kind: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 通道名中文灰注(ETL 已译;没有则空串)。
   */
  streamZh: string

  /**
   * 分数线;没公布保 null。
   */
  score: number | null

  /**
   * 邀请数;没公布保 null。
   */
  invitations: number | null

  /**
   * 人数口径(DIMS_PNP_DRAWS 的 unit:invitation / selection / application;2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」)。
   */
  unit: string
}

/**
 * 抽选事实的复数。
 */
export type DrawFacts = DrawFact[]

/**
 * SSR 事实区一行:每省最近一轮有分数线或邀请数的抽选(红线见 `DrawFact`)。
 */
export type OverviewDraw = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 分数线;没公布保 null。
   */
  score: number | null

  /**
   * 邀请数;没公布保 null。
   */
  invitations: number | null

  /**
   * 人数口径(selection = 从 EOI 池选中的人,计划页写「入选」;2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」)。
   */
  unit: string
}

/**
 * SSR 事实区行的复数。
 */
export type OverviewDraws = OverviewDraw[]

/**
 * 某省某年的临时居民存量拆分(学签 / 工签;访客旅游签从不计入)。
 */
export type ProvStockYear = {
  /**
   * 学签存量;官方缺位保 null。
   */
  study: number | null

  /**
   * 工签存量(TFWP+IMP);官方缺位保 null。
   */
  work: number | null

  /**
   * 该年存量快照月(StatCan 季度参考日;年末=Y-12,进行年=最新季度月,方案C 2026-08-15);
   * 没有则空串。
   */
  asOf: string
}

/**
 * 某省某年的新发学签流量。
 */
export type ProvFlowYear = {
  /**
   * 当年新发数。
   */
  n: number

  /**
   * 口径期:整年是 'YYYY',进行年带「至几月」为 'YYYY-MM'。
   */
  period: string
}

/**
 * 省提名名额三年序列(2024–2026;缺位一律 null,前端显「—」)。
 */
export type ProvQuotaYears = {
  /**
   * 2024 名额。
   */
  y2024: number | null

  /**
   * 2025 名额。
   */
  y2025: number | null

  /**
   * 2026 名额。
   */
  y2026: number | null
}

/**
 * 年份筛选序列(2026-08-14):存量近 3 年(官方停在 2024,之后年份缺位)、
 * 流量近 5 年、名额 2024–2026。
 */
export type ProvCompSeries = {
  /**
   * 年 → 存量拆分。
   */
  stocks: Record<string, ProvStockYear>

  /**
   * 年 → 流量。
   */
  flow: Record<string, ProvFlowYear>

  /**
   * 名额三年。
   */
  quota: ProvQuotaYears
}

/**
 * 新发学签**流量**(IRCC 月度表,provinces.info.studyFlow)。
 *
 * 🔴 与名额竞争比**口径不同不可混用**:比值的分母是「在库存量」(2024-12 快照,官方最新
 * 只到这儿),这一格是「当期新增」——2026 年只到 5 月,拿它当分子会把比值凭空砍一半。
 * 摆它是因为存量停在 2024,而这是唯一能反映**当下还在涌进多少人**的官方数字。
 */
export type ProvFlow = {
  /**
   * 口径期('YYYY' 或 'YYYY-MM')。
   */
  period: string

  /**
   * 当期新发数。
   */
  n: number

  /**
   * 上一年同口径;官方缺位保 null。
   */
  prevYear: number | null
}

/**
 * 各省名额竞争一行(E12-07 `stats.difficulty`,来源 IRCC 开放数据):
 * ratio = 该省临时居民存量 ÷ 该省当年省提名名额。9 省**同一个源同一套口径**,可以横向比 ——
 * 与各省自己公布的 EOI 池(AB 实时 / MB 年报 / SK·ON 不发)不是一回事,后者才是不可比的那类。
 */
export type ProvCompetition = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 临时居民存量 ÷ 省提名名额。
   */
  ratio: number

  /**
   * 难度档(ETL 算好的 tier)。
   */
  tier: string

  /**
   * 临时居民存量合计(分子)。
   */
  pool: number

  /**
   * 当年省提名名额(分母)。
   */
  quota: number

  /**
   * 存量拆分:学签。旧库行没有拆分 → null,前端回退合计列。
   */
  poolStudy: number | null

  /**
   * 存量拆分:工签(TFWP+IMP)。旧库行没有拆分 → null,前端回退合计列。
   */
  poolWork: number | null

  /**
   * 分子的统计年(asOf)。🔴 两个数不是同一年的:分子是临时居民存量的统计年,
   * 分母是名额的年份(quotaYear)—— 各行还不一样(ON/BC/AB/SK 拿到 2026 名额,
   * MB/NS/NB/NL/PE 还是 2025)。**必须逐行摆出来**,否则读者会默认它们同年。
   */
  poolYear: string

  /**
   * 分母的名额年份(红线见 poolYear)。
   */
  quotaYear: number

  /**
   * 本站算出这一行的日期(difficulty.generated;缺则落 stats.fetched)。
   */
  generated: string

  /**
   * 年份筛选序列;没有则 null。
   */
  series: ProvCompSeries | null

  /**
   * 数据源说明(difficulty json 里的 source)。
   */
  source: string

  /**
   * 新发学签流量;没有则 null(口径红线见 `ProvFlow`)。
   */
  flow: ProvFlow | null
}

/**
 * 名额竞争行的复数。
 */
export type ProvCompetitions = ProvCompetition[]

/**
 * `ProvCompetition` 或没有。
 */
export type MaybeCompetition = ProvCompetition | null

/**
 * difficulty json 里的一个因子(只声明本域真正读的那几格)。
 */
export type DifficultyFactorJson = {
  /**
   * 因子键(名额竞争是 'comp')。
   */
  key: string | null

  /**
   * 因子值(comp 的是比值)。
   */
  value: NumCell

  /**
   * 临时居民存量合计。
   */
  pool: NumCell

  /**
   * 存量拆分:学签。
   */
  poolStudy: NumCell

  /**
   * 存量拆分:工签。
   */
  poolWork: NumCell

  /**
   * 当年省提名名额。
   */
  quota: NumCell

  /**
   * 名额年份。
   */
  quotaYear: NumCell

  /**
   * 分子的统计年。
   */
  asOf: string | null

  /**
   * 数据源说明。
   */
  source: string | null
}

/**
 * difficulty json(stats.difficulty,ETL E12-07 产)里本域读的那几格。
 */
export type DifficultyJson = {
  /**
   * 难度档。
   */
  tier: string | null

  /**
   * 本站算出的日期。
   */
  generated: string | null

  /**
   * 因子清单。
   */
  factors: DifficultyFactorJson[] | null
}

/**
 * difficulty 一格的原料:json 列驱动可能已解析成对象,经文本列绕行时是字符串。
 */
export type DifficultyRaw = DifficultyJson | string | null

/**
 * `DifficultyJson` 或没有。
 */
export type MaybeDifficulty = DifficultyJson | null

/**
 * `DifficultyFactorJson` 或没有。
 */
export type MaybeCompFactor = DifficultyFactorJson | null

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY_FETCHED)。
 */
export type DifficultyDbRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 难度 json 原料。
   */
  difficulty: DifficultyRaw

  /**
   * 抓取日(generated 缺位时的兜底)。
   */
  fetched: string | null
}

/**
 * info json 里的新发学签流量格(IRCC 月度表,scrape_ircc_stats 产)。
 */
export type StudyFlowJson = {
  /**
   * 口径年。
   */
  year: string | number | null

  /**
   * 当期新发数。
   */
  n: NumCell

  /**
   * 进行年「至几月」的英文月份缩写。
   */
  throughMonth: string | null

  /**
   * 上一年同口径。
   */
  prev: NumCell
}

/**
 * info json 里某年的存量拆分格。
 */
export type TrSeriesEntryJson = {
  /**
   * 学签存量。
   */
  study: NumCell

  /**
   * 工签存量。
   */
  work: NumCell

  /**
   * 该年存量快照月。
   */
  asOf: string | null
}

/**
 * info json 里某年的流量格。
 */
export type FlowSeriesEntryJson = {
  /**
   * 当年新发数。
   */
  n: NumCell

  /**
   * 是否整年:false = 进行年,period 要带「至几月」。
   */
  complete: boolean | null

  /**
   * 进行年「至几月」的英文月份缩写。
   */
  throughMonth: string | null
}

/**
 * info json 里的名额三年格。
 */
export type AllocJson = {
  /**
   * 2024 名额。
   */
  y2024: NumCell

  /**
   * 2025 名额。
   */
  y2025: NumCell

  /**
   * 2026 名额。
   */
  y2026: NumCell
}

/**
 * provinces.info json 里本域读的那几格。
 */
export type ProvInfoJson = {
  /**
   * 新发学签流量。
   */
  studyFlow: StudyFlowJson | null

  /**
   * 年 → 存量拆分。
   */
  trSeries: Record<string, TrSeriesEntryJson> | null

  /**
   * 年 → 流量。
   */
  flowSeries: Record<string, FlowSeriesEntryJson> | null

  /**
   * 名额三年。
   */
  alloc: AllocJson | null
}

/**
 * info 一格的原料(同 `DifficultyRaw` 的两条路)。
 */
export type ProvInfoRaw = ProvInfoJson | string | null

/**
 * `ProvInfoJson` 或没有。
 */
export type MaybeProvInfo = ProvInfoJson | null

/**
 * 一行省份维度(SQL.PROVINCES_INFO)。
 */
export type ProvInfoDbRow = {
  /**
   * 两位省码。
   */
  code: string | null

  /**
   * info json 原料。
   */
  info: ProvInfoRaw
}

/**
 * 一行各省难度洗净后的事实 —— json 解析与拆格都在 rows 做完,functions 拿到即有效
 * (2026-08-22 Frank:值级清洗不进 functions)。
 */
export type DifficultyFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 名额竞争比(comp 因子的值);官方缺位保 null —— 据此不出竞争行(判断在 functions)。
   */
  ratio: MaybeNum

  /**
   * 难度档;没有是空串。
   */
  tier: string

  /**
   * 临时居民存量合计;缺位折 0(ratio 为 null 的行不会上屏)。
   */
  pool: number

  /**
   * 当年省提名名额;缺位折 0(同上)。
   */
  quota: number

  /**
   * 存量拆分:学签;官方缺位保 null。
   */
  poolStudy: MaybeNum

  /**
   * 存量拆分:工签;官方缺位保 null。
   */
  poolWork: MaybeNum

  /**
   * 分子的统计年;没有是空串。
   */
  poolYear: string

  /**
   * 分母的名额年份;缺位折 0。
   */
  quotaYear: number

  /**
   * 本站算出这一行的日期(generated 缺位落 stats.fetched)。
   */
  generated: string

  /**
   * 数据源说明;没有是空串。
   */
  source: string
}

/**
 * 一行省份维度洗净后的事实 —— json 解析与 flow/series 拼装都在 rows 做完。
 */
export type ProvInfoFact = {
  /**
   * 两位省码。
   */
  code: string

  /**
   * flow/series 两格增补(没有的格是 null)。
   */
  extra: ProvInfoExtra
}

/**
 * 省份维度事实的复数。
 */
export type ProvInfoFacts = ProvInfoFact[]

/**
 * 单省的 flow/series 两格增补(info json 里读出来挂给竞争行)。
 */
export type ProvInfoExtra = {
  /**
   * 新发学签流量;没有则 null。
   */
  flow: ProvFlow | null

  /**
   * 年份筛选序列;没有则 null。
   */
  series: ProvCompSeries | null
}

/**
 * `ProvFlow` 或没有。
 */
export type MaybeFlow = ProvFlow | null

/**
 * `ProvCompSeries` 或没有。
 */
export type MaybeSeries = ProvCompSeries | null

/**
 * 省码 → flow/series 增补。
 */
export type ExtrasMap = Record<string, ProvInfoExtra>

/**
 * `attachExtras` 的入参。
 */
export type CompetitionExtrasIn = {
  /**
   * 竞争行(就地挂增补)。
   */
  rows: ProvCompetitions

  /**
   * 省码 → 增补。
   */
  extras: ExtrasMap
}

/**
 * 决策页首屏的官方表包。
 */
export type ScoreTables = {
  /**
   * SSR 事实区:每省最近一轮有分数线或邀请数的抽选。
   */
  overview: OverviewDraws

  /**
   * 每省近 6 轮**有分数**的抽选(2026-08-16):估分卡的空态诱饵。
   * 必须随 SSR 下发 —— 先前它取自 `/api/points/factors`,而那个请求只在**答满全卷**后才发,
   * 于是「选了省却看不到线」,连「先选目标省份」都还在提示(实撞)。
   * 线是免费硬事实,不该收在答题之后。
   */
  drawsRecent: DrawRows

  /**
   * 各省名额竞争(松→紧);这一页的第二条免费硬事实,要被爬到。
   */
  competition: ProvCompetitions

  /**
   * 抽选全表(近 200 轮)。
   */
  draws: DrawRows

  /**
   * 官方分值表全表。
   */
  factors: ScoreFactors

  /**
   * 本站已收录官方分值表的省 —— 决策页据此把「本站没有表」的省单列出来。
   */
  factorProvinces: StrList
}

/**
 * `getScoreTables` 的返回。
 */
export type ScoreTablesOut = Promise<ScoreTables>

/**
 * 分值域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type PointsCache = {
  /**
   * 官方表包那一份;null = 冷。
   */
  scoreTables: {
    /**
     * 灌入时刻。
     */
    at: number

    /**
     * 表包。
     */
    data: ScoreTables
  } | null
}

/**
 * 带省码格的行（`makeProvHit` 的过滤器只读这一格）。
 */
export type ProvKeyed = {
  /**
   * 省码。
   */
  province: string
}

/**
 * 「行的省在想要的集合里吗」判定函数（`Array.prototype.filter` 的谓词位）。
 */
export type ProvHitFn = (row: ProvKeyed) => boolean

/**
 * 想要的省码集（`makeProvHit` 的入参；库的 `Set` 在本域的名字）。
 */
export type ProvSet = Set<string>
