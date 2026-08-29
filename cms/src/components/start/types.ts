/**
 * start 域(/start 就业把脉首页)的形状:对外那一张 SSR 契约(HomeStats)、
 * 服务端取数与派生的进出口、各块视图的 props、四张展示行,以及每个函数的入参。
 *
 * 六类形状**不重抄**,各走一行特批 import type(牌形同 companies/types.ts):
 * ① lib/stats 的两张统计行 —— 省 × 大类行与职业行原样透传给 components/stats 的
 *    MarketChart,少声明一格当场 tsc 红;② lib/employers 的担保雇主行 —— 原样透传给
 *    components/employers 的 toSponsorCellRows 与 SponsorCard;③ components/stats 的
 *    四份数据;④ lib/db 的连接面 —— 基础设施叶子(方案 A:取数函数收 db 注入,
 *    门里 getDb 再注进来);⑤⑥ payload 与它生成的 collection 形状 —— 分类维度表
 *    那一条查询由库定死。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- lib/stats 的引擎契约,原样透传给同源 MarketChart;重抄必脱节
import type { OccRow, ProvExtra, StatRow } from '@/lib/stats'
// eslint-disable-next-line local/no-import-in-leaf -- lib/employers 的引擎契约,原样透传给 employers 桶的洗行函数与卡片
import type { SponsorEmployerRow } from '@/lib/employers'
// eslint-disable-next-line local/no-import-in-leaf -- components/stats 取数钩子的返回,原样交给 MarketChart 的四份数据
import type { MarketData } from '@/components/stats'
import type { DbPool } from '@/lib/db'
// eslint-disable-next-line local/no-import-in-leaf -- payload 的 find 由库定死(分类维度表那条查询),自抄一份等于替库维护它的重载表
import type { Payload } from 'payload'
// eslint-disable-next-line local/no-import-in-leaf -- 分类维度表的行形状由 payload 从 collection 生成,不手抄
import type { NocCategory } from '@/payload-types'

/**
 * 界面语言(三字面量各域自抄)。
 */
export type StartLang = 'zh' | 'en' | 'ko'

/**
 * 通道译名小表认得的语言码(与界面语言同值,但它是另一域的入参,单独起名)。
 */
export type DrawLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 形状本域自己声明,
 * 不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 橱窗人群档(三分表按人群拆:没工签 → LMIA / 有工签 → PNP 担保记录 / 去海洋省 → AIP;
 * 与 components/employers 的同名联合逐字同值,结构相同即兼容)。
 */
export type StartSponsorKind = 'lmia' | 'named' | 'aip'

/**
 * 一行职业统计(lib/stats 的引擎契约,本域只透传)。
 */
export type OccRowOne = OccRow

/**
 * 职业统计行的清单。
 */
export type OccRowList = OccRow[]

/**
 * 一行省 × 大类统计。
 */
export type StatRowOne = StatRow

/**
 * 省 × 大类统计行的清单。
 */
export type StatRowList = StatRow[]

/**
 * 一行担保雇主事实。
 */
export type SponsorRowOne = SponsorEmployerRow

/**
 * 担保雇主事实行的清单。
 */
export type SponsorRowList = SponsorEmployerRow[]

/**
 * 省码 → 省卡增补(IRCC 体量 + 难度档)。
 */
export type ProvExtraMap = Record<string, ProvExtra>

/**
 * 省卡 IRCC 体量里能取的那四格。
 */
export type ProvInfoKey = 'study' | 'tfwp' | 'imp' | 'pnpPr'

/**
 * 分类三级里能筛的那三级。
 */
export type NocCatKey = 'broad' | 'mid' | 'fine'

/**
 * 单元格渲染器的形状(一个参数收这一行,哑单元格的签名天然就是它)。
 */
export type CellFn<T> = (r: T) => React.ReactNode

/**
 * 排序取值器的形状(null 恒沉底)。
 */
export type SortFn<T> = (r: T) => string | number | null

/**
 * 一列的声明 —— 本域自声明真正用到的六项(table 域那份还有 thTip / align 等,本域不用;
 * 结构相同即兼容,走样当场 tsc 红)。
 */
export type StartCol<T> = {
  /**
   * 列身份(排序态与列宽都按它记)。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染器。
   */
  render: CellFn<T>

  /**
   * 排序取值器;不给就是不可排序。
   */
  sort?: SortFn<T>

  /**
   * 单元格不换行(数字列全 nowrap,表格才不会横滚)。
   */
  nowrap?: boolean

  /**
   * 显式列宽(百分比);给了就不进自动量宽锁列(抽选表这类固定版式)。
   */
  width?: string
}

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

/**
 * 原生下拉的换值手柄(切省下拉与条数下拉都是这一形)。
 */
export type SelectChangeFn = (e: React.ChangeEvent<HTMLSelectElement>) => void

/**
 * 条数下拉交回新档位的手柄。
 */
export type TopNFn = (n: number) => void

/**
 * 筛选下拉交回新值的手柄。
 */
export type FilterFn = (v: string) => void

/**
 * 翻页手柄。
 */
export type PageFn = (p: number) => void

/**
 * 显示名函数(值 → 人话名)。
 */
export type LabelFn = (v: string) => string

/**
 * 省 chips 逐项的点击手柄工厂。
 */
export type ProvPickFn = (p: string) => ClickFn

/**
 * effect 交回的清理函数(解绑监听、取消动画帧、中止请求)。
 */
export type CleanupFn = () => void


/**
 * 一个 NOC 的分类三级(三分表职业筛联动要用)。
 */
export type NocCat = {
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
}

/**
 * NOC 码 → 分类三级。
 */
export type NocCatMap = Map<string, NocCat>

/**
 * NOC 码 → 可提名省份清单(该职业哪些省的清单命中在架岗)。
 */
export type NocProvsMap = Map<string, string[]>

/**
 * 职业筛 datalist 的一个候选(noc_descriptions,~500 行)。
 */
export type OccOption = {
  /**
   * NOC 2021 五位码。
   */
  noc: string

  /**
   * 官方英文职业名。
   */
  title: string

  /**
   * 中文译名(本站译,非官方)。
   */
  titleZh: string
}

/**
 * 职业筛联动的一行中/小类名(noc_categories,一行 = 一个小类)。
 */
export type CatOption = {
  /**
   * 本站大类。
   */
  broad: string

  /**
   * NOC 中类(中文值,也是行键)。
   */
  mid: string

  /**
   * 中类英文名。
   */
  midEn: string

  /**
   * 中类韩文名。
   */
  midKo: string

  /**
   * NOC 小类(中文值,也是行键)。
   */
  fine: string

  /**
   * 小类英文名。
   */
  fineEn: string

  /**
   * 小类韩文名。
   */
  fineKo: string
}

/**
 * 一批担保雇主(某一张橱窗表)。
 */
export type SponsorGroup = {
  /**
   * SSR 只带前 SE_SSR_ROWS 行,挂载后拉接口换全量。
   */
  top: SponsorRowList

  /**
   * 这张表的总条数(筛选前)。
   */
  total: number
}

/**
 * 橱窗三分表(Frank 2026-08-08:没工签→LMIA / 有工签→PNP 担保记录 / 海洋省→AIP;
 * 货架页已下架,此处即唯一承载)。
 */
export type SponsorBoards = {
  /**
   * 没工签那张(要雇主办 LMIA)。
   */
  lmia: SponsorGroup

  /**
   * 有工签那张(要打包省提名)。
   */
  named: SponsorGroup

  /**
   * 去海洋省那张(AIP 指定雇主)。
   */
  aip: SponsorGroup
}

/**
 * `/api/employers/sponsors` 回来的那份 json:信任边界外的形状,三张表都可能缺席。
 */
export type SponsorFullProbe = {
  /**
   * 没工签那张。
   */
  lmia: SponsorGroup | null

  /**
   * 有工签那张。
   */
  named: SponsorGroup | null

  /**
   * 去海洋省那张。
   */
  aip: SponsorGroup | null
} | null

/**
 * 一期抽选 + 冷解读三标量(近 12 期同通道的期数/最低/最高,服务端算好)。
 */
export type PulseDraw = {
  /**
   * 抽选日。
   */
  date: string

  /**
   * 两位省码;'FED' = 联邦 EE。
   */
  province: string

  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 通道名的中文批译(ETL 产出;没翻到给空串,回退手工小表)。
   */
  streamZh: string

  /**
   * 联邦 EE 的类别键(省抽选没有,给空串)。
   */
  label: string

  /**
   * 分数线;官方没公布保 null。
   */
  score: number | null

  /**
   * 邀请数;官方没公布保 null。
   */
  invitations: number | null

  /**
   * 回看窗内有分数线的期数;不足门槛给 null(整句解读不出)。
   */
  histN: number | null

  /**
   * 回看窗内的最低分;同上。
   */
  histMin: number | null

  /**
   * 回看窗内的最高分;同上。
   */
  histMax: number | null
}

/**
 * 一条政策动态(列表用的几格)。
 */
export type PulseNews = {
  /**
   * 发布日期。
   */
  date: string

  /**
   * 发布方(federal 或省码);库里没记给空串。
   */
  region: string

  /**
   * 官方原标题。
   */
  title: string

  /**
   * 标题中文译名(E13-06 由 ETL 本地翻译;没译文给空串)。
   */
  titleZh: string

  /**
   * 详情页 slug;没有则空串(整行落到列表页)。
   */
  slug: string
}

/**
 * S1 中间两卡的标量(2026-08-09 下沉 SSR 消刷新闪占位,Frank「中间两个数为什么会闪」)。
 */
export type PulseScalars = {
  /**
   * 近 14 天新发;缺列/缺数给 null(卡整张不出)。
   */
  new14: number | null

  /**
   * 平均在架天数(按在架量加权);缺列/缺数给 null。
   */
  days: number | null
}

/**
 * 把脉首页的 SSR 契约(页面门取好数一次性下发)。
 */
export type HomeStats = {
  /**
   * 全站在架岗总数(S1 命中率证据,与职位板 proof 同源);查不到给 null。
   */
  total: number | null

  /**
   * 命中省具名清单的岗数;查不到给 null。
   */
  named: number | null

  /**
   * 抽选表(前端 Top N 下拉再切)。
   */
  draws: PulseDraw[]

  /**
   * 政策动态(同上)。
   */
  news: PulseNews[]

  /**
   * 橱窗三分表(SSR 只带每表前几十行)。
   */
  sponsor: SponsorBoards

  /**
   * 橱窗职业筛的候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * S1 中间两卡的标量。
   */
  pulse: PulseScalars

  /**
   * 三分表职业筛联动 noc → 分类(只含橱窗行出现过的 NOC;occ 全表仍不进 HTML)。
   */
  nocCat: Record<string, NocCat>

  /**
   * S4 省卡:IRCC 体量 + 难度档。
   */
  provExtra: ProvExtraMap

  /**
   * S4 预选省(档案省;匿名为空 → 默认 ON。禁 IP 定位)。
   */
  provPreset: string

  /**
   * 数据抓取时刻。
   */
  checkedAt: string
}

/**
 * 进程内缓存里那份聚合(逐用户的两格不进缓存:预选省与抓取时刻)。
 */
export type HomeStatsCore = Omit<HomeStats, 'checkedAt' | 'provPreset'>

/**
 * 首页聚合缓存的一格。
 */
export type HomeSlot = {
  /**
   * 缓存的那份聚合。
   */
  v: HomeStatsCore

  /**
   * 写入时刻(ms)。
   */
  ts: number
}

/**
 * 职业筛候选缓存的一格。
 */
export type OccOptionSlot = {
  /**
   * 写入时刻(ms)。
   */
  ts: number

  /**
   * 缓存的候选。
   */
  rows: OccOption[]
}

/**
 * 分类联动缓存的一格。
 */
export type CatOptionSlot = {
  /**
   * 写入时刻(ms)。
   */
  ts: number

  /**
   * 缓存的中/小类名。
   */
  rows: CatOption[]
}

/**
 * 本域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type StartCache = {
  /**
   * 首页聚合;没拉过/过期由 TTL 判。
   */
  home: HomeSlot | null

  /**
   * 职业筛 datalist 候选。
   */
  occOpts: OccOptionSlot | null

  /**
   * 职业筛联动的中/小类名。
   */
  catOpts: CatOptionSlot | null
}

/**
 * `SQL.PNP_DRAWS_RECENT` 回来的那一行。列名即库列名;走 `SELECT *` 的容缺手法
 * (#280:不点名 stream_zh —— DDL 没跑的库上那一列压根不存在,点名会整块炸,
 * 而 catch 吞掉会连累 score/invitations 一起消失;`*` 容缺列,400 行无压力)。
 */
export type DrawDbRow = {
  /**
   * 两位省码;'FED' = 联邦。
   */
  province: string

  /**
   * 抽选日。
   */
  draw_date: string

  /**
   * 官方通道名。
   */
  stream: string | null

  /**
   * 通道名中文批译 —— E13-06 的列,DDL 没跑的库上这一格压根不存在。
   */
  stream_zh?: string | null

  /**
   * 联邦 EE 的类别键。
   */
  label: string | null

  /**
   * 分数线。
   */
  score: number | null

  /**
   * 邀请数。
   */
  invitations: number | null
}

/**
 * `SQL.NOC_ALL_TITLES` 回来的那一行(职业筛 datalist 的候选)。列名即库列名。
 * 2026-08-27 lint 还账批把原来的 `any` 换成本形状,取值表达式一个字没动。
 */
export type NocTitleDbRow = {
  /**
   * NOC 2021 五位码。
   */
  noc: string

  /**
   * 官方英文职业名。
   */
  title: string | null

  /**
   * 中文译名(本站译,非官方)。
   */
  title_zh: string | null
}

/**
 * `SQL.NEWS_RECENT_80` 回来的那一行。同样走 `SELECT *` 的容缺手法:title_zh 列
 * (E13-06)可能还没加,点名会整块炸;`*` 容缺列,80 行无压力。
 */
export type NewsRecentDbRow = {
  /**
   * 发布日期。
   */
  date: string

  /**
   * 发布方(federal 或省码)。
   */
  region: string | null

  /**
   * 官方原标题。
   */
  title: string | null

  /**
   * 标题中文译名 —— E13-06 的列,DDL 没跑的库上这一格压根不存在。
   */
  title_zh?: string | null

  /**
   * 详情页 slug。
   */
  slug: string | null
}

/**
 * 查询挂了的空结果面(每项独立兜空,一张表缺只丢它自己那块)。
 */
export type EmptyQueryResult = {
  /**
   * 零行。
   */
  rows: never[]
}

/**
 * 分类维度表查询挂了的空结果面。
 */
export type EmptyDocs = {
  /**
   * 零行。
   */
  docs: never[]
}

/**
 * 命中率证据的两格(与职位板 proof 同源);查不到整份给 null。
 */
export type ProofFact = {
  /**
   * 全站在架岗总数。
   */
  total: number

  /**
   * 命中省具名清单的岗数。
   */
  named: number
}

/**
 * 会话用户档案 json 的一格(本域只读 profile 一格,原样透传给 jobs 的 normalizeProfile)。
 */
export type StartProfileCell = string | number | boolean | null | StartProfileObj | StartProfileCell[]

/**
 * 会话用户档案 json 对象格。
 */
export type StartProfileObj = { [k: string]: StartProfileCell }

/**
 * 会话用户身上本域读的那一格(结构相同即兼容 quota 域的 SessionUser)。
 */
export type StartUser = {
  /**
   * 档案 jsonb;没建档给 null。
   */
  profile: StartProfileObj | null
}

/**
 * `provPresetOf` 的入参。
 */
export type ProvPresetIn = {
  /**
   * 当前会话用户;null = 匿名。
   */
  user: StartUser | null
}

/**
 * `loadOccOptions` 的入参(方案 A:连接池由页面门注进来)。
 */
export type OccOptionsIn = {
  /**
   * 数据库连接。
   */
  db: DbPool
}

/**
 * `loadCatOptions` 的入参。
 */
export type CatOptionsIn = {
  /**
   * payload 实例。
   */
  payload: Payload
}

/**
 * 分类维度行上的一格(payload 从 collection 生成的形状:这些列都是「可以不填」的,
 * 所以那份类型里天然带着「键可能不在」;取值处一律 `== null` 一网收)。
 */
export type CatCell = NocCategory['broad']

/**
 * `toCatOptions` 的入参。
 */
export type CatOptionsRowsIn = {
  /**
   * 分类维度行。
   */
  docs: NocCategory[]
}

/**
 * `toOccOptions` 的入参。
 */
export type OccOptionsRowsIn = {
  /**
   * 职业名维度行。
   */
  rows: NocTitleDbRow[]
}

/**
 * `homeCoreOf` 的入参:各条查询的结果与两处条数上限。
 */
export type HomeCoreIn = {
  /**
   * 命中率证据;查询挂了给 null。
   */
  proof: ProofFact | null

  /**
   * 抽选原始行。
   */
  drawRows: DrawDbRow[]

  /**
   * 抽选下发条数上限。
   */
  drawsLimit: number

  /**
   * 政策动态原始行。
   */
  newsRows: NewsRecentDbRow[]

  /**
   * 政策动态下发条数上限。
   */
  newsLimit: number

  /**
   * 省卡增补。
   */
  provExtra: ProvExtraMap

  /**
   * 橱窗事实行(职业筛联动只带这些行出现过的 NOC 下去)。
   */
  sponsorRows: SponsorRowList

  /**
   * 已按人群建好的橱窗三表。
   */
  boards: SponsorBoards

  /**
   * SSR 每表带几行。
   */
  ssrRows: number

  /**
   * 职业筛候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * 职业统计行(中间两卡与分类映射的原料)。
   */
  occRows: OccRowList
}

/**
 * `homeStatsOf` 的入参。
 */
export type HomeStatsOfIn = {
  /**
   * 那份聚合。
   */
  core: HomeStatsCore

  /**
   * 预选省。
   */
  provPreset: string

  /**
   * 抓取时刻。
   */
  checkedAt: string
}

/**
 * `sponsorSliceOf` 的入参。
 */
export type SponsorSliceIn = {
  /**
   * 这张表的全量行与总数。
   */
  group: SponsorGroup

  /**
   * SSR 只带前几行。
   */
  rows: number
}

/**
 * `pulseScalarsOf` 的入参。
 */
export type PulseScalarsIn = {
  /**
   * 职业统计行(全量;体内只取全国行)。
   */
  occ: OccRowList
}

/**
 * `nocCatOf` 的入参。
 */
export type NocCatOfIn = {
  /**
   * 职业统计行(分类三级的来源)。
   */
  occ: OccRowList

  /**
   * 橱窗三表的事实行。
   */
  sponsorRows: SponsorRowList
}

/**
 * 一期抽选的回看三标量。
 */
export type DrawHist = {
  /**
   * 回看窗内有分数线的期数。
   */
  n: number

  /**
   * 回看窗内的最低分。
   */
  min: number

  /**
   * 回看窗内的最高分。
   */
  max: number
}

/**
 * `drawHistOf` 的入参。
 */
export type DrawHistIn = {
  /**
   * 同省同通道的那一组(已按日期降序)。
   */
  group: DrawDbRow[]

  /**
   * 本期在组内的位置。
   */
  i: number
}

/**
 * `toPulseDraw` 的入参。
 */
export type PulseDrawIn = {
  /**
   * 这一期原始行。
   */
  r: DrawDbRow

  /**
   * 它的回看三标量;样本不足则 null。
   */
  hist: DrawHist | null
}

/**
 * `toDrawsWithHistory` 的入参。
 */
export type DrawsIn = {
  /**
   * 抽选原始行(已按日期降序,组内自然也降序)。
   */
  rows: DrawDbRow[]

  /**
   * 下发条数上限。
   */
  limit: number
}

/**
 * `toNewsRows` 的入参。
 */
export type NewsRowsIn = {
  /**
   * 政策动态原始行(多取了几条,去重后再切片)。
   */
  rows: NewsRecentDbRow[]

  /**
   * 下发条数上限。
   */
  limit: number
}


/**
 * `occMainOf` / `occNoteOf` 的入参。
 */
export type OccNameIn = {
  /**
   * 这一行职业统计行。
   */
  o: OccRowOne

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * `provLabelOf` 的入参。
 */
export type ProvLabelOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * 只要一个取词函数的显示名工厂入参(`makeProvLabel` / `makeBroadLabel`)。
 */
export type LabelFactoryIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `makeStreamLabel` 的入参。
 */
export type StreamLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `provLocaleOf` / `provChipTextOf` 的入参。
 */
export type ProvLocaleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 两位省码。
   */
  code: string
}

/**
 * 一粒胶囊的展示形态(文字 + 已算好的配色类)。
 */
export type StartPill = {
  /**
   * 胶囊身份(渲染时的 key)。
   */
  key: string

  /**
   * 胶囊文字。
   */
  text: string

  /**
   * 已拼好的类名(形状类 + 配色档)。
   */
  cls: string
}

/**
 * 职业榜一行的展示行(取值与文案都在洗行时做完,单元格只管渲)。
 */
export type OccCellRow = {
  /**
   * 行键(NOC 码)。
   */
  key: string

  /**
   * 职业名点开的去处(按该 NOC 筛过的职位板)。
   */
  href: string

  /**
   * 主文案(#309 主次对调:人话名主文案 + 官方名灰注)。
   */
  main: string

  /**
   * 官方英文名灰注;空串 = 不出(英文界面,或与主文案同文)。
   */
  note: string

  /**
   * 在招岗数;没算给横杠。
   */
  openText: string

  /**
   * 在招岗数排序键。
   */
  openSort: number | null

  /**
   * 手机卡上「在招 N」那一格;空串 = 整格不出。
   */
  openLabel: string

  /**
   * 14 天新发环比(百分数);空串 = 这一行没算出来(单元格显横杠)。
   */
  momText: string

  /**
   * 环比的配色类(涨绿/跌红/持平灰;雷区榜关掉红绿走近黑)。
   */
  momCls: string

  /**
   * 环比排序键。
   */
  momSort: number | null

  /**
   * ESDC 官方薪资区间年化;没算给横杠。
   */
  salText: string

  /**
   * 薪资区间排序键(按高位)。
   */
  salSort: number | null

  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 手机卡上的 NOC 代码胶囊文字。
   */
  nocChip: string

  /**
   * TEER 单元格(带前缀);没分类给横杠。
   */
  teerText: string

  /**
   * 手机卡上的 TEER 胶囊文字;空串 = 没分类,胶囊不出。
   */
  teerChip: string

  /**
   * TEER 排序键。
   */
  teerSort: number | null

  /**
   * 完全无路可走的省(自带「无通道」后缀);空串 = 这一行没有死路省。
   */
  deadText: string

  /**
   * 死路省数排序键。
   */
  deadSort: number

  /**
   * 职业名点开时的埋点手柄。
   */
  onView: ClickFn

  /**
   * 紧缺胶囊排(省紧缺绿 + 联邦紧缺青);空排 = 显示「无」。
   */
  hotPills: StartPill[]

  /**
   * 一粒紧缺胶囊都没有时那句「无」。
   */
  hotNoneText: string

  /**
   * 紧缺省数排序键。
   */
  hotSort: number

  /**
   * 可提名省份主行(「N 省可走」);空串 = 直可与有条件都没有,单元格显横杠。
   */
  pnpText: string

  /**
   * 可提名省份里走不了的那几省(自带「无通道」后缀);空串 = 一个不缺。
   */
  pnpMissing: string

  /**
   * 可提名省份排序键(直可省数主键,有条件省数副键)。
   */
  pnpSort: number

  /**
   * 担保率;没落库给横杠。
   */
  rateText: string

  /**
   * 手机卡上的担保率胶囊文字(带列名前缀);空串 = 没落库,胶囊不出。
   */
  rateChip: string

  /**
   * 担保率排序键。
   */
  rateSort: number | null
}

/**
 * `toOccCellRows` 的入参。
 */
export type OccCellRowsIn = {
  /**
   * 本榜的职业统计行。
   */
  rows: OccRowList

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 环比列不上红绿(2026-08-09 Frank:雷区榜上绿色语义是反的)。
   */
  flatDelta: boolean
}

/**
 * `toOccCellRow` 的入参(逐行,其余同 `toOccCellRows`)。
 */
export type OccCellRowIn = {
  /**
   * 这一行职业统计行。
   */
  o: OccRowOne

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 环比列不上红绿。
   */
  flatDelta: boolean
}

/**
 * `provsOfOcc` 的入参。
 */
export type ProvsOfOccIn = {
  /**
   * 这一行职业统计行。
   */
  o: OccRowOne

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap
}

/**
 * `hotPillsOf` 的入参。
 */
export type HotPillsIn = {
  /**
   * 这一行职业统计行(联邦那一粒看它的通道档)。
   */
  o: OccRowOne

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该职业命中的省码。
   */
  provs: string[]
}

/**
 * `occColsOf` 的入参:三个容缺开关与两个列形开关。
 */
export type OccColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整榜有没有一行算出了环比(全 null = 环比列整列不渲,绝不拿 0 顶包)。
   */
  hasMom: boolean

  /**
   * 整榜有没有一行落了可提名省份列。
   */
  hasPnpProvs: boolean

  /**
   * 整榜有没有一行落了担保率列。
   */
  hasSponsorRate: boolean

  /**
   * 出「紧缺」列(省紧缺胶囊 + 联邦紧缺胶囊)。
   */
  showProvs: boolean

  /**
   * 出「完全无路可走的省」列(与紧缺列互斥)。
   */
  deadCol: boolean
}

/**
 * 分省概览一行的展示行。
 */
export type ProvCellRow = {
  /**
   * 行键(两位省码)。
   */
  key: string

  /**
   * 省名(卡上用通行短名)。
   */
  name: string

  /**
   * 省名排序键(省全名)。
   */
  nameSort: string

  /**
   * 两位省码(灰注)。
   */
  code: string

  /**
   * 省份译名灰注;空串 = 英文界面不出。
   */
  localeName: string

  /**
   * 难度档;空串 = 没算出来(单元格显横杠)。
   */
  tier: string

  /**
   * 难度档的显示名。
   */
  tierText: string

  /**
   * 难度档胶囊在表格里的类名;空串 = 不渲胶囊。
   */
  tierCls: string

  /**
   * 难度档胶囊在省卡上的类名(多一格推到最右)。
   */
  tierCardCls: string

  /**
   * 难度档排序键;表外的档给 null 沉底。
   */
  tierSort: number | null

  /**
   * 在招岗数;没算给横杠。
   */
  openText: string

  /**
   * 在招岗数排序键。
   */
  openSort: number | null

  /**
   * 具名通道岗数;空串 = 没清单(单元格改显「无清单」)。
   */
  namedText: string

  /**
   * 「无清单」那句词。
   */
  noListText: string

  /**
   * 具名通道岗数排序键。
   */
  namedSort: number

  /**
   * 工签体量(TFWP + IMP);没算给横杠。
   */
  workText: string

  /**
   * 工签体量排序键;没算给 null 沉底。
   */
  workSort: number | null

  /**
   * 学签体量;没算给横杠。
   */
  studyText: string

  /**
   * 学签体量排序键。
   */
  studySort: number | null

  /**
   * 省提名拿到 PR;没算给横杠。
   */
  prText: string

  /**
   * QC 那一句「不适用」(它走自己的体系,不属 PNP —— 与「本站没有」意思相反)。
   */
  prNaText: string

  /**
   * 省提名那一格出不出「不适用」。
   */
  prNotApplicable: boolean

  /**
   * 省提名拿到 PR 排序键。
   */
  prSort: number | null
}

/**
 * `toProvCellRows` 的入参。
 */
export type ProvCellRowsIn = {
  /**
   * 省 × 大类汇总行。
   */
  rows: StatRowList

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 省卡增补(IRCC 体量 + 难度档)。
   */
  provExtra: ProvExtraMap
}

/**
 * `toProvCellRow` 的入参(逐行,其余同 `toProvCellRows`)。
 */
export type ProvCellRowIn = {
  /**
   * 这一行省 × 大类汇总行。
   */
  r: StatRowOne

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 省卡增补。
   */
  provExtra: ProvExtraMap
}

/**
 * `provTierTextOf` 的入参。
 */
export type TierTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 难度档;空串 = 没算出来。
   */
  tier: string
}

/**
 * `diffClsOf` / `diffCardClsOf` 的入参。
 */
export type TierClsIn = {
  /**
   * 难度档;空串 = 没算出来。
   */
  tier: string
}

/**
 * `provColsOf` 的入参。
 */
export type ProvColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 抽选表一行的展示行。
 */
export type DrawCellRow = {
  /**
   * 行键(行序 —— 同省同通道同日可能有多期,只有位置能当身份)。
   */
  key: string

  /**
   * 抽选日(已裁到年月日)。
   */
  date: string

  /**
   * 省码或 EE 标签。
   */
  prog: string

  /**
   * 通道名主文案(官方英文名)。
   */
  main: string

  /**
   * 通道名灰注(界面语言译名);空串 = 不出。
   */
  note: string

  /**
   * 分数线;官方没公布给横杠。
   */
  score: string

  /**
   * 邀请数;官方没公布给横杠。
   */
  invitations: string

  /**
   * 冷解读(当期分数线 vs 近 12 期同通道区间);空串 = 样本不足,整格留空不编话。
   */
  read: string
}

/**
 * `toDrawCellRows` 的入参。
 */
export type DrawCellRowsIn = {
  /**
   * 抽选行。
   */
  rows: PulseDraw[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 英文取词函数(官方英文名主文案由它取)。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * `toDrawCellRow` 的入参(逐行,其余同 `toDrawCellRows`)。
 */
export type DrawCellRowIn = {
  /**
   * 这一期抽选。
   */
  r: PulseDraw

  /**
   * 行序(当行键)。
   */
  i: number

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 英文取词函数。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * `drawColsOf` 的入参。
 */
export type DrawColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 政策动态一条的展示行。
 */
export type NewsCellRow = {
  /**
   * 行键。
   */
  key: string

  /**
   * 整行的去处(没 slug 落到列表页)。
   */
  href: string

  /**
   * 发布日期(已裁到年月日)。
   */
  date: string

  /**
   * 发布方标签(联邦显 IRCC,省显省码大写)。
   */
  tag: string

  /**
   * 官方原标题。
   */
  title: string

  /**
   * 中文界面下的标题译名灰注;空串 = 不出。
   */
  titleZh: string
}

/**
 * `toNewsCellRows` 的入参。
 */
export type NewsCellRowsIn = {
  /**
   * 政策动态行。
   */
  rows: PulseNews[]

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * `toNewsCellRow` 的入参(逐条,其余同 `toNewsCellRows`)。
 */
export type NewsCellRowIn = {
  /**
   * 这一条政策动态。
   */
  r: PulseNews

  /**
   * 行序(没 slug 时当行键)。
   */
  i: number

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * S1 一张脉象卡的展示行。
 */
export type NumCardRow = {
  /**
   * 卡标签(也是卡的身份)。
   */
  label: string

  /**
   * 主数字(已按地区格式化好)。
   */
  value: string

  /**
   * 悬停口径(标签虚线的那句)。
   */
  tip: string

  /**
   * 整卡的去处。
   */
  href: string
}

/**
 * `numCardsOf` 的入参。
 */
export type NumCardsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全站在架岗总数;null = 这张卡不出。
   */
  total: number | null

  /**
   * 命中省具名清单的岗数;null = 命中率卡不出。
   */
  named: number | null

  /**
   * 中间两卡的标量。
   */
  pulse: PulseScalars
}


/**
 * 三榜分层的结果(判据 = **省具名紧缺清单命中**(namedJobs),≠「有无 PNP 通道」)。
 */
export type OccBoards = {
  /**
   * 雷区榜:不在任何省紧缺清单,且存在完全无路可走的省。
   */
  mine: OccRowList

  /**
   * 有兜底榜:不在任何省紧缺清单,但处处有路。
   */
  backup: OccRowList

  /**
   * 降温榜:清单在列且 14 天新发环比跌破门槛。
   */
  cooling: OccRowList

  /**
   * 升温榜:清单在列且 14 天新发环比涨过门槛。
   */
  heating: OccRowList
}

/**
 * `occBoardsOf` 的入参。
 */
export type OccBoardsIn = {
  /**
   * 全国行(province='all')。
   */
  natOcc: OccRowList

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap
}

/**
 * 二级导航条上的一项。
 */
export type NavItem = {
  /**
   * 分区锚点 id。
   */
  id: string

  /**
   * 导航短词(#312:与分区 h2 措辞差异化,不逐字同文)。
   */
  label: string
}

/**
 * `navItemsOf` 的入参。
 */
export type NavItemsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 橱窗三分表按人群拆开后的一项(人群档 + 那张表)。
 */
export type SponsorGroupEntry = {
  /**
   * 人群档。
   */
  kind: StartSponsorKind

  /**
   * 那张表。
   */
  group: SponsorGroup
}

/**
 * `sponsorGroupsOf` 的入参。
 */
export type SponsorGroupsIn = {
  /**
   * 橱窗三分表。
   */
  sponsor: SponsorBoards
}

/**
 * `sponsorGapClsOf` / `boardGapClsOf` 的入参。
 */
export type GapClsIn = {
  /**
   * 与上一块留不留间距(第一块不留)。
   */
  gap: boolean
}

/**
 * `natOccOf` / `provRowsOf` 的入参。
 */
export type NatOccIn = {
  /**
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null
}

/**
 * `nocProvsOf` 的入参。
 */
export type NocProvsIn = {
  /**
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null
}

/**
 * `provStatOf` 的入参。
 */
export type ProvStatIn = {
  /**
   * 分省概览的行。
   */
  rows: StatRowList

  /**
   * 当前省。
   */
  prov: string
}

/**
 * `provOccOf` 的入参。
 */
export type ProvOccIn = {
  /**
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null

  /**
   * 当前省。
   */
  prov: string
}

/**
 * `provOccHitOf` 的入参。
 */
export type ProvOccHitIn = {
  /**
   * 这一行职业统计行。
   */
  o: OccRowOne

  /**
   * 当前省。
   */
  prov: string
}


/**
 * 橱窗表六格筛选的现值与落格。
 */
export type SponsorFilterState = {
  /**
   * 省筛现值;'' = 全部。
   */
  fProv: string

  /**
   * 通道筛现值(named 表专属);'' = 全部。
   */
  fStream: string

  /**
   * 大类筛现值;'' = 全部。
   */
  fBroad: string

  /**
   * 中类筛现值;'' = 全部。
   */
  fMid: string

  /**
   * 小类筛现值;'' = 全部。
   */
  fFine: string

  /**
   * 职业筛现值;'' = 全部。
   */
  fNoc: string

  /**
   * 换省。
   */
  onProv: FilterFn

  /**
   * 换通道。
   */
  onStream: FilterFn

  /**
   * 换大类(下三级一并清空)。
   */
  onBroad: FilterFn

  /**
   * 换中类(下两级一并清空)。
   */
  onMid: FilterFn

  /**
   * 换小类(职业一并清空)。
   */
  onFine: FilterFn

  /**
   * 换职业。
   */
  onNoc: FilterFn
}

/**
 * `provOptsOf` 的入参。
 */
export type ProvOptsIn = {
  /**
   * 本表的全量事实行(省选项只列本表真实存在的省)。
   */
  rows: SponsorRowList
}

/**
 * `streamOptsOf` 的入参。
 */
export type StreamOptsIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 人群档(只有具名省清单表出通道筛)。
   */
  kind: StartSponsorKind
}

/**
 * `broadOptsOf` 的入参。
 */
export type BroadOptsIn = {
  /**
   * 本表的全量事实行(选项只列本表真实存在的分类)。
   */
  rows: SponsorRowList

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * `midOptsOf` 的入参。
 */
export type MidOptsIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 上一级大类筛现值;'' = 不收窄。
   */
  fBroad: string
}

/**
 * `fineOptsOf` 的入参。
 */
export type FineOptsIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 上一级大类筛现值。
   */
  fBroad: string

  /**
   * 上一级中类筛现值。
   */
  fMid: string
}

/**
 * 职业筛的一个选项(值 + 显示名 + 雇主数)。
 */
export type OccSelOption = {
  /**
   * NOC 码。
   */
  noc: string

  /**
   * 显示名(字典缺题名的码原样兜底,不因缺翻译丢筛选项)。
   */
  label: string

  /**
   * 本表里有几家雇主招这个职业(排序键:常用职业置顶)。
   */
  count: number
}

/**
 * `occSelOptsOf` 的入参。
 */
export type OccSelOptsIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 职业筛候选(取显示名)。
   */
  occOpts: OccOption[]

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 上一级大类筛现值。
   */
  fBroad: string

  /**
   * 中类筛现值。
   */
  fMid: string

  /**
   * 小类筛现值。
   */
  fFine: string
}

/**
 * `occSelHitOf` 的入参。
 */
export type OccSelHitIn = {
  /**
   * NOC 码。
   */
  n: string

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 大类筛现值。
   */
  fBroad: string

  /**
   * 中类筛现值。
   */
  fMid: string

  /**
   * 小类筛现值。
   */
  fFine: string
}

/**
 * `occTitleOf` 的入参。
 */
export type OccTitleIn = {
  /**
   * 这一条职业筛候选。
   */
  o: OccOption

  /**
   * 界面语言。
   */
  lang: string
}

/**
 * `shownSponsorsOf` 的入参。
 */
export type ShownSponsorsIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 六格筛选现值。
   */
  f: SponsorFilterState

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * `sponsorHitOf` 的入参。
 */
export type SponsorHitIn = {
  /**
   * 这一行事实。
   */
  r: SponsorRowOne

  /**
   * 六格筛选现值。
   */
  f: SponsorFilterState

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * `someCatOf` 的入参。
 */
export type SomeCatIn = {
  /**
   * 这一行事实。
   */
  r: SponsorRowOne

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 取哪一级。
   */
  key: NocCatKey

  /**
   * 要等于什么。
   */
  v: string
}

/**
 * `sponsorNoteOf` 的入参。
 */
export type SponsorNoteIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中几家。
   */
  shown: number

  /**
   * 一共几家(筛选前)。
   */
  total: number
}

/**
 * `makeCatLabel` 的入参(中类与小类共用一个工厂,差别只在取哪三列)。
 */
export type CatLabelIn = {
  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 行键取哪一列。
   */
  keyCol: 'mid' | 'fine'

  /**
   * 英文名取哪一列。
   */
  enCol: 'midEn' | 'fineEn'

  /**
   * 韩文名取哪一列。
   */
  koCol: 'midKo' | 'fineKo'
}

/**
 * `makeOccLabel` 的入参。
 */
export type OccLabelIn = {
  /**
   * 职业筛的选项(显示名从这儿查)。
   */
  opts: OccSelOption[]
}


/**
 * `bandClsOf` 的入参。
 */
export type BandClsIn = {
  /**
   * 白底档。
   */
  white: boolean

  /**
   * hero 档。
   */
  hero: boolean

  /**
   * CTA 渐变档(全站唯一用渐变的色带,标记「这里是出口」)。
   */
  cta: boolean
}

/**
 * `secHeadClsOf` 的入参。
 */
export type SecHeadClsIn = {
  /**
   * 子标题档。
   */
  sub: boolean
}

/**
 * 加载占位块的高度档(px;四处各对着自己那块内容到齐后的高度)。
 */
export type PlaceholderSize = 320 | 380 | 420 | 480

/**
 * `placeholderClsOf` 的入参。
 */
export type PlaceholderClsIn = {
  /**
   * 高度档。
   */
  size: PlaceholderSize
}

/**
 * `momClsOf` 的入参。
 */
export type MomClsIn = {
  /**
   * 14 天新发环比;null = 这一行没算出来。
   */
  mom: number | null

  /**
   * 环比列不上红绿。
   */
  flatDelta: boolean
}

/**
 * `navLinkClsOf` 的入参。
 */
export type NavLinkClsIn = {
  /**
   * 是不是当前分区。
   */
  on: boolean
}

/**
 * `provCardClsOf` 的入参。
 */
export type ProvCardClsIn = {
  /**
   * 是不是当前省。
   */
  on: boolean
}

/**
 * `drawRowClsOf` 的入参。
 */
export type DrawRowClsIn = {
  /**
   * 是不是最后一条。
   */
  last: boolean
}

/**
 * `newsRowClsOf` 的入参。
 */
export type NewsRowClsIn = {
  /**
   * 是不是第一条。
   */
  first: boolean
}

/**
 * `makeFilterPick` 的入参(换一级筛选时把下面几级一并清空)。
 */
export type FilterPickIn = {
  /**
   * 本级的落格。
   */
  set: FilterFn

  /**
   * 下面几级的落格(按顺序全清成空串)。
   */
  resets: FilterFn[]
}

/**
 * `makeProvPick` 的入参。
 */
export type ProvPickIn = {
  /**
   * 换省的落格。
   */
  setProv: FilterFn
}

/**
 * `makeSelectChange` 的入参(原生下拉的事件拆包)。
 */
export type SelectChangeIn = {
  /**
   * 换值的落格。
   */
  set: FilterFn
}

/**
 * `makeTopNChange` 的入参(条数下拉的事件拆包 —— 值是数字)。
 */
export type TopNChangeIn = {
  /**
   * 换档的落格。
   */
  set: TopNFn
}

/**
 * `makeAskChat` 的入参。
 */
export type AskChatIn = {
  /**
   * 人群档(预填问句按它取词)。
   */
  kind: StartSponsorKind

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `makeSponsorLoad` 的入参(挂载后拉全量三分表换掉 SSR 那几十行)。
 */
export type SponsorLoadIn = {
  /**
   * 全量到手后的落格。
   */
  setSponsorFull: (v: SponsorBoards) => void
}

/**
 * `makeNavWatch` 的入参(二级导航的滚动跟随)。
 */
export type NavWatchIn = {
  /**
   * 当前分区的落格。
   */
  setNavSec: FilterFn
}


/**
 * 橱窗一张表的整机面板。
 */
export type SponsorBoardPanel = {
  /**
   * 六格筛选的现值与落格。
   */
  f: SponsorFilterState

  /**
   * 五只下拉的选项。
   */
  opts: SponsorOpts

  /**
   * 五只下拉的显示名函数。
   */
  labels: SponsorLabels

  /**
   * 通过全部筛选的行。
   */
  shown: SponsorRowList

  /**
   * 手机卡片当前页(已收在合法区间内)。
   */
  page: number

  /**
   * 手机卡片总页数。
   */
  maxPage: number

  /**
   * 页脚说明(命中数 / 总数)。
   */
  note: string

  /**
   * 本榜整批有没有判得出雇主门槛(整批全 unknown 则门槛列压根不进列组)。
   */
  showVerdict: boolean

  /**
   * 翻页手柄。
   */
  onPage: PageFn
}

/**
 * 橱窗表五只下拉的选项。
 */
export type SponsorOpts = {
  /**
   * 省。
   */
  prov: string[]

  /**
   * 通道(只有具名省清单表有)。
   */
  stream: string[]

  /**
   * 大类。
   */
  broad: string[]

  /**
   * 中类。
   */
  mid: string[]

  /**
   * 小类。
   */
  fine: string[]

  /**
   * 职业(码清单;显示名走 labels.occ)。
   */
  occ: string[]
}

/**
 * 橱窗表五只下拉的显示名函数。
 */
export type SponsorLabels = {
  /**
   * 省。
   */
  prov: LabelFn

  /**
   * 通道。
   */
  stream: LabelFn

  /**
   * 大类。
   */
  broad: LabelFn

  /**
   * 中类。
   */
  mid: LabelFn

  /**
   * 小类。
   */
  fine: LabelFn

  /**
   * 职业。
   */
  occ: LabelFn
}

/**
 * `useSponsorOpts` 的入参。
 */
export type SponsorOptsHookIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 人群档(只有具名省清单表出通道筛)。
   */
  kind: StartSponsorKind

  /**
   * 职业筛候选(取显示名)。
   */
  occOpts: OccOption[]

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 六格筛选现值(逐级收窄看它)。
   */
  f: SponsorFilterState
}

/**
 * `useSponsorOpts` 交回的面板。
 */
export type SponsorOptsPanel = {
  /**
   * 五只下拉的选项。
   */
  opts: SponsorOpts

  /**
   * 职业筛那份带显示名与雇主数的选项(显示名函数也要它)。
   */
  occSel: OccSelOption[]
}

/**
 * `sponsorLabelsOf` 的入参。
 */
export type SponsorLabelsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 职业筛的选项。
   */
  occSel: OccSelOption[]
}

/**
 * `useSponsorBoard` 的入参。
 */
export type SponsorBoardHookIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 人群档。
   */
  kind: StartSponsorKind

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 本表总条数(筛选前)。
   */
  total: number

  /**
   * 职业筛候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * 职业榜的手机卡片页态(桌面表格的页态在 Table 里,俩视图同刻只显示一个,各翻各的)。
 */
export type OccBoardPanel = {
  /**
   * 当前页(已收在合法区间内)。
   */
  page: number

  /**
   * 总页数。
   */
  maxPage: number

  /**
   * 翻页手柄。
   */
  onPage: PageFn
}

/**
 * `useCardPage` 的入参。
 */
export type CardPageIn = {
  /**
   * 本榜的原始行(比对它的**身份**来判「换了一榜」—— 洗过的展示行每次渲染都是新数组)。
   */
  rows: OccRowList

  /**
   * 每页几行。
   */
  pageSize: number
}

/**
 * 把脉首页整机的面板(视图要的一切)。
 */
export type PulsePanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 主图四份数据;null = 加载中(依赖它的区渲占位高度,不出空壳)。
   */
  market: MarketData | null

  /**
   * 橱窗三分表(拉到全量就用全量,拉挂/拉到空表继续用 SSR 那几十行,不闪不塌)。
   */
  sponsor: SponsorBoards

  /**
   * S1 四张脉象卡。
   */
  numCards: NumCardRow[]

  /**
   * 三榜分层;null = 主图数据还没到。
   */
  boards: OccBoards | null

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap

  /**
   * 分省概览的行(省 × 大类汇总行)。
   */
  provRows: StatRowList

  /**
   * 当前省的统计行;没有则 null。
   */
  provStat: StatRowOne | null

  /**
   * 省内职业榜的行;null = 主图数据还没到。
   */
  provOcc: OccRowList | null

  /**
   * 当前省(全国档是 'ALL')。
   */
  prov: string

  /**
   * 切省下拉的换值手柄。
   */
  onProvSelect: SelectChangeFn

  /**
   * 省 chips 逐项的点击手柄工厂。
   */
  provPickOf: ProvPickFn

  /**
   * 抽选表当前条数档。
   */
  drawsN: number

  /**
   * 抽选表条数下拉的手柄。
   */
  onDrawsN: TopNFn

  /**
   * 政策动态当前条数档。
   */
  newsN: number

  /**
   * 政策动态条数下拉的手柄。
   */
  onNewsN: TopNFn

  /**
   * 英文取词函数(抽选主文案取官方英文名,与界面语言无关;整页只造一次)。
   */
  tEn: TFn

  /**
   * 当前所在分区的锚点 id;'' = 还没滚到任何分区。
   */
  navSec: string
}


/**
 * Pulse(把脉首页整块视图)的 props。
 */
export type PulseIn = {
  /**
   * 页面门取好的那份 SSR 数据。
   */
  stats: HomeStats
}

/**
 * Band(全宽色带 + Shell 内轨)的 props。
 */
export type BandIn = {
  /**
   * 锚点 id;不给 = 这条色带不是导航目标。
   */
  id?: string

  /**
   * 白底档(与灰底色带交替)。
   */
  white?: boolean

  /**
   * hero 档(banner 那一段自己管上下距)。
   */
  hero?: boolean

  /**
   * CTA 渐变档。
   */
  cta?: boolean

  /**
   * 色带内容。
   */
  children: React.ReactNode
}

/**
 * Sec(分区标题 + 内容)的 props。
 * 2026-08-10 Frank「所有的展开和关闭按钮都删了」:折叠开关连同 localStorage 记忆
 * 一并撤,分区恒展开。
 * ⚠️ 旧版这里还挂着一个 `id` prop 说「二级导航靠它锚点跳转」,但组件体从来没把它渲出去
 * (锚点实际全在 Band 的那一层 div 上,五个 pl-* id 也确实只在 Band 上);
 * 2026-08-28 换装批据实撤掉这一格,锚点仍归 Band,行为一字未变。
 */
export type SecIn = {
  /**
   * 标题文案。
   */
  title: React.ReactNode

  /**
   * 标题行右侧控件(TopN / 外链 / 对话导流钮)。
   */
  right?: React.ReactNode

  /**
   * 子标题档(伞标题下的那一层,字号降一档)。
   */
  sub?: boolean

  /**
   * 分区内容。
   */
  children: React.ReactNode
}

/**
 * Placeholder(加载占位块)的 props。
 */
export type PlaceholderIn = {
  /**
   * 高度档。
   */
  size: PlaceholderSize
}

/**
 * PulseNav(二级导航条)的 props。
 */
export type PulseNavIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前所在分区的锚点 id。
   */
  navSec: string
}

/**
 * Hero(S1 判决区:banner + 四脉象卡)的 props。
 */
export type HeroIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 四张脉象卡(缺数的卡在洗行时就没进来)。
   */
  cards: NumCardRow[]
}

/**
 * NumCard(一张脉象卡)的 props。
 */
export type NumCardIn = {
  /**
   * 这张卡的展示行。
   */
  card: NumCardRow
}

/**
 * SponsorSection(在招担保雇主橱窗三分表)的 props。
 */
export type SponsorSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 三分表。
   */
  sponsor: SponsorBoards

  /**
   * 职业筛候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * SponsorTable(橱窗里的一张表:子标题 + 对话导流钮 + 表身)的 props。
 */
export type SponsorTableIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 人群档。
   */
  kind: StartSponsorKind

  /**
   * 这张表的行与总数。
   */
  group: SponsorGroup

  /**
   * 与上一张表留不留间距(第一张不留)。
   */
  gap: boolean

  /**
   * 职业筛候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * SponsorBoard(橱窗单表的筛选 + 表格 + 卡片)的 props。
 */
export type SponsorBoardIn = {
  /**
   * 本表的全量事实行。
   */
  rows: SponsorRowList

  /**
   * 人群档。
   */
  kind: StartSponsorKind

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 本表总条数(筛选前)。
   */
  total: number

  /**
   * 职业筛候选。
   */
  occOpts: OccOption[]

  /**
   * 职业筛联动的中/小类名。
   */
  catMids: CatOption[]

  /**
   * NOC → 分类三级。
   */
  nocCat: NocCatMap
}

/**
 * SponsorFilters(橱窗单表的筛选行)的 props。
 */
export type SponsorFiltersIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人群档(决定控件顺序与出不出通道筛)。
   */
  kind: StartSponsorKind

  /**
   * 六格筛选的现值与落格。
   */
  f: SponsorFilterState

  /**
   * 五只下拉的选项。
   */
  opts: SponsorOpts

  /**
   * 五只下拉的显示名函数。
   */
  labels: SponsorLabels
}

/**
 * AskChatBtn(表题旁的对话导流钮)的 props。
 */
export type AskChatBtnIn = {
  /**
   * 人群档。
   */
  kind: StartSponsorKind

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * TopN(条数下拉)的 props。
 */
export type TopNIn = {
  /**
   * 当前档位。
   */
  v: number

  /**
   * 换档手柄。
   */
  on: TopNFn

  /**
   * 数据一共有多少条(不足的档不出)。
   */
  max: number
}

/**
 * BoardsSection(S2 三榜分层)的 props。
 */
export type BoardsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 三榜分层;null = 主图数据还没到,出占位块。
   */
  boards: OccBoards | null

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap
}

/**
 * OccBoard(职业榜:桌面表格 + 手机卡片)的 props。
 */
export type OccBoardIn = {
  /**
   * 本榜的职业统计行。
   */
  rows: OccRowList

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 出「紧缺」列;可省 = 出。
   */
  showProvs?: boolean

  /**
   * 出「完全无路可走的省」列;可省 = 不出。
   */
  deadCol?: boolean

  /**
   * 环比列不上红绿;可省 = 上。
   */
  flatDelta?: boolean

  /**
   * 每页行数;可省 = 10。
   */
  pageSize?: number
}

/**
 * OccBoardSec(职业榜的一张分榜:子标题 + 榜身)的 props。
 */
export type OccBoardSecIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 本榜的职业统计行。
   */
  rows: OccRowList

  /**
   * 榜题(降温 / 升温两榜的题带涨跌箭头,所以是 ReactNode 不是 string)。
   */
  title: React.ReactNode

  /**
   * 与上一张分榜留不留间距(第一张不留)。
   */
  gap: boolean

  /**
   * 出「紧缺」列。
   */
  showProvs: boolean

  /**
   * 出「完全无路可走的省」列。
   */
  deadCol: boolean

  /**
   * 环比列不上红绿。
   */
  flatDelta: boolean
}

/**
 * OccCard(职业榜的手机卡)的 props。
 */
export type OccCardIn = {
  /**
   * 这一行的展示行。
   */
  row: OccCellRow

  /**
   * 出「紧缺」胶囊。
   */
  showProvs: boolean

  /**
   * 出死路胶囊(与紧缺胶囊互斥)。
   */
  deadCol: boolean
}

/**
 * ProvSection(S4a 分省概览:桌面表格 + 手机省卡)的 props。
 */
export type ProvSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 主图数据到了没(没到出占位块)。
   */
  loading: boolean

  /**
   * 省 × 大类汇总行。
   */
  rows: StatRowList

  /**
   * 省卡增补。
   */
  provExtra: ProvExtraMap

  /**
   * 当前省(卡片高亮用)。
   */
  prov: string

  /**
   * 省卡逐张的点击手柄工厂。
   */
  provPickOf: ProvPickFn
}

/**
 * ProvCard(一张省卡)的 props。
 */
export type ProvCardIn = {
  /**
   * 这一行的展示行。
   */
  row: ProvCellRow

  /**
   * 是不是当前省。
   */
  on: boolean

  /**
   * 点击手柄(切省)。
   */
  onPick: ClickFn

  /**
   * 取词函数(卡内五行键值的键)。
   */
  t: TFn
}

/**
 * KvRow(省卡里的一行键值)的 props。
 */
export type KvRowIn = {
  /**
   * 键(左)。
   */
  k: React.ReactNode

  /**
   * 值(右)。
   */
  v: React.ReactNode
}

/**
 * ProvOccSection(S4b 省内职业榜)的 props。
 */
export type ProvOccSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 当前省。
   */
  prov: string

  /**
   * 切省下拉的换值手柄。
   */
  onProvSelect: SelectChangeFn

  /**
   * 省 chips 逐项的点击手柄工厂。
   */
  provPickOf: ProvPickFn

  /**
   * 当前省的统计行;null = 没有(该省提名通道那一行整行不出)。
   */
  provStat: StatRowOne | null

  /**
   * 省内职业榜的行;null = 主图数据还没到。
   */
  provOcc: OccRowList | null

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 主图四份数据;null = 加载中。
   */
  market: MarketData | null
}

/**
 * ProvChips(切省下拉 + 十省 chips)的 props。
 */
export type ProvChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 当前省。
   */
  prov: string

  /**
   * 切省下拉的换值手柄。
   */
  onProvSelect: SelectChangeFn

  /**
   * 省 chips 逐项的点击手柄工厂。
   */
  provPickOf: ProvPickFn
}

/**
 * ProvStreams(该省提名通道那一行)的 props。
 */
export type ProvStreamsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 通道名清单串(与 /stats 省页同源 stream_labels)。
   */
  labels: string
}

/**
 * DrawsSection(S5 抽选尺子 + 政策动态)的 props。
 */
export type DrawsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 英文取词函数(抽选主文案取官方英文名)。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 抽选行(全量;体内按条数档切片)。
   */
  draws: PulseDraw[]

  /**
   * 政策动态行(同上)。
   */
  news: PulseNews[]

  /**
   * 抽选表当前条数档。
   */
  drawsN: number

  /**
   * 抽选表条数下拉的手柄。
   */
  onDrawsN: TopNFn

  /**
   * 政策动态当前条数档。
   */
  newsN: number

  /**
   * 政策动态条数下拉的手柄。
   */
  onNewsN: TopNFn
}

/**
 * DrawBoard(抽选表:桌面表格 + 手机卡)的 props。
 */
export type DrawBoardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行(已切到条数档)。
   */
  rows: DrawCellRow[]
}

/**
 * DrawCard(抽选表手机形态的一条)的 props。
 */
export type DrawCardIn = {
  /**
   * 这一期的展示行。
   */
  row: DrawCellRow

  /**
   * 是不是最后一条(末条不出分隔线)。
   */
  last: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * NewsSection(政策动态)的 props。
 */
export type NewsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行(已切到条数档)。
   */
  rows: NewsCellRow[]

  /**
   * 当前条数档。
   */
  newsN: number

  /**
   * 条数下拉的手柄。
   */
  onNewsN: TopNFn

  /**
   * 数据一共有多少条。
   */
  total: number
}

/**
 * NewsRow(政策动态的一条)的 props。
 */
export type NewsRowIn = {
  /**
   * 这一条的展示行。
   */
  row: NewsCellRow

  /**
   * 是不是第一条(第一条不出上分隔线 —— 白卡自己有描边)。
   */
  first: boolean
}

/**
 * CtaBand(S6 职位板入口)的 props。
 */
export type CtaBandIn = {
  /**
   * 取词函数。
   */
  t: TFn
}
