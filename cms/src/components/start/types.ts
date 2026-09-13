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
// eslint-disable-next-line local/no-import-in-leaf -- 引擎输出形状特批(先例 icons/types):lib/stats 契约,零处读格、原样透传同源 MarketChart
import type {
  CityIndustryRow, CityRow, DliSchoolRow, OccRow, PilotCommRow, ProvExtra, StatRow,
} from '@/lib/stats'
// eslint-disable-next-line local/no-import-in-leaf -- lib/employers 的引擎契约,原样透传给 employers 桶的洗行函数与卡片
import type { SponsorEmployerRow } from '@/lib/employers'
// eslint-disable-next-line local/no-import-in-leaf -- components/stats 取数钩子的返回,原样交给 MarketChart 的四份数据
import type { MarketData } from '@/components/stats'

/**
 * 界面语言(三字面量各域自抄)。
 */
export type StartLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 形状本域自己声明,
 * 不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

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
 * 担保雇主事实行的清单。
 */
export type SponsorRowList = SponsorEmployerRow[]

/**
 * 省码 → 省卡增补(IRCC 体量 + 难度档)。
 */
export type ProvExtraMap = Record<string, ProvExtra>

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

  /**
   * 列级 class(2026-09-11 城市段批:窄屏藏宽列交给 .cityWide,与 table 域 Col 同名格)。
   */
  className?: string
}

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

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

  /**
   * RCIP / FCIP 那张(社区指定雇主且在该社区有在招岗;2026-09-06)。
   */
  pilot: SponsorGroup
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

  /**
   * RCIP / FCIP 那张。
   */
  pilot: SponsorGroup | null
} | null

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
 * 2026-09-04 重构:抽选 / 政策动态两格撤(段撤成一行链接)、职业筛字典两格撤(筛选下拉撤),
 * 加逐日在招量(趋势段原料)。
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
   * 担保雇主三分表(SSR 只带每表前几十行;雇主段与 LMIA 段按行业重分)。
   */
  sponsor: SponsorBoards

  /**
   * S1 中间两卡的标量。
   */
  pulse: PulseScalars

  /**
   * noc → 分类(只含担保雇主行出现过的 NOC;雇主归行业组靠它)。
   */
  nocCat: Record<string, NocCat>

  /**
   * 担保雇主里在 RCIP 指定名单上的雇主名(小写;只带交集,名单本身两千多家不下发)。
   */
  rcipNames: string[]

  /**
   * 担保雇主里在 FCIP 指定名单上的雇主名(小写;同上)。
   */
  fcipNames: string[]

  /**
   * 担保雇主的公司简介(名小写 → 英文 + 中文;只带有简介的,现在约一成)。
   */
  briefs: Record<string, CompanyBrief>

  /**
   * 抽选表(全量,前端分页;2026-09-04 Frank「这个 table 还是要保留的」,政策动态不回)。
   */
  draws: PulseDraw[]

  /**
   * S4 省卡:IRCC 体量 + 难度档。
   */
  provExtra: ProvExtraMap

  /**
   * 全国职业行(2026-09-05 Frank「为什么会空白很长时间」:职业段两榜与行业表原等挂载后的
   * /api/stats/market(2.8MB)才出,改随 SSR 契约直出;雇主表的职业名与 TEER 也从这取)。
   */
  natOcc: OccRowList

  /**
   * NOC → 紧缺省清单(同上,原从 market 派生)。
   */
  nocProvs: Record<string, string[]>

  /**
   * 政策动态区的最新几条(2026-09-12 Frank「全部动态 的 table 也 加过来 之前给删了」)。
   */
  news: PulseNews[]

  /**
   * 数据抓取时刻。
   */
  checkedAt: string
}

/**
 * 进程内缓存里那份聚合(逐用户的两格不进缓存:预选省与抓取时刻)。
 */
export type HomeStatsCore = Omit<HomeStats, 'checkedAt'>

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
 * 本域可变状态的形状(住 variables.ts 的 CACHE)。2026-09-04:字典两格随筛选下拉撤。
 */
export type StartCache = {
  /**
   * 首页聚合;null = 没拉过。
   */
  home: HomeSlot | null
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
 * 首页聚合缓存的一格。
 */
export type HomeCoreIn = {
  /**
   * 命中率证据;查询挂了给 null。
   */
  proof: ProofFact | null

  /**
   * 省卡增补。
   */
  provExtra: ProvExtraMap

  /**
   * 担保雇主事实行(分类映射只带这些行出现过的 NOC 下去)。
   */
  sponsorRows: SponsorRowList

  /**
   * 已按人群建好的担保雇主三表。
   */
  boards: SponsorBoards

  /**
   * 职业统计行(中间两卡与分类映射的原料)。
   */
  occRows: OccRowList

  /**
   * 社区试点指定雇主原始行(名小写 + source)。
   */
  pilotRows: PilotNameDbRow[]

  /**
   * 公司简介原始行(名小写 + 简介)。
   */
  briefRows: BriefDbRow[]

  /**
   * 抽选原始行。
   */
  drawRows: DrawDbRow[]

  /**
   * 抽选下发条数上限。
   */
  drawsLimit: number

  /**
   * 新闻原始行(SQL.NEWS_RECENT_80;2026-09-12 Frank「全部动态 的 table 也 加过来 之前给删了」,
   * homeCoreOf 按标题去重后只留最新 NEWS_LIMIT 条)。
   */
  newsRows: NewsRecentDbRow[]
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
   * 抓取时刻。
   */
  checkedAt: string
}

/**
 * `sponsorSeedOf` 的入参。
 */
export type SponsorSeedIn = {
  /**
   * 三分表全量。
   */
  boards: SponsorBoards

  /**
   * NOC → 分类(对象形,SSR 契约同款)。
   */
  nocCat: Record<string, NocCat>

  /**
   * 全国职业行(算职业名与 TEER)。
   */
  natOcc: OccRowList

  /**
   * 试点集合与简介(与挂载后同一份)。
   */
  extra: EmpExtra
}

/**
 * `seedGroupOf` 的入参。
 */
export type SeedGroupIn = {
  /**
   * 一张分表全量。
   */
  group: SponsorGroup

  /**
   * 要留的雇主名(原样,= EmpCellRow.key)。
   */
  keep: Set<string>
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
 * `makeStreamLabel` 的入参。
 */
export type StreamLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `provDisplayOf` 的入参(单一省名,按界面语言;2026-09-11「按国际化来」,原 provLocaleOf 译名灰注随双行形退役)。
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

  /**
   * 「看岗位」文案(操作列;2026-09-04 Frank「每个列是不是都应该加一个操作列」)。
   */
  actJobsText: string

  /**
   * 操作钮的类(button 桶 ghost 小号档)。
   */
  actBtnCls: string
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
 * `diffClsOf` / `diffCardClsOf` 的入参。
 */
export type TierClsIn = {
  /**
   * 难度档;空串 = 没算出来。
   */
  tier: string
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
 * `navSubItemsOf` 的入参。
 */
export type NavSubItemsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前所在分区的锚点 id;'' = 还没滚到任何分区。
   */
  navSec: string
}

/**
 * `subIdOf` 的入参。
 */
export type SubIdIn = {
  /**
   * 分区 id(NAV_IDS 之一)。
   */
  band: string

  /**
   * 分表键(行业组键 / 试点键 / 两榜键)。
   */
  key: string
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
 * `provRowsOf` 的入参(分省概览仍吃挂载后的 market;职业/城市段 2026-09-05 改 SSR 直出后它是唯一还等 market 的段)。
 */
export type MarketIn = {
  /**
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null
}

/**
 * `natOccOf` / `provRowsOf` 的入参。
 */
export type NatOccIn = {
  /**
   * 职业统计行(含各省行与全国行);null = 还没到。
   */
  occ: OccRowList | null
}

/**
 * `nocProvsOf` 的入参。
 */
export type NocProvsIn = {
  /**
   * 职业统计行(含各省行与全国行);null = 还没到。
   */
  occ: OccRowList | null
}



/**
 * `bandClsOf` 的入参。
 */
export type BandClsIn = {

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
 * `makeSponsorLoad` 的入参(挂载后拉全量三分表换掉 SSR 那几十行)。
 */
export type SponsorLoadIn = {
  /**
   * 全量到手后的落格。
   */
  setSponsorFull: (v: SponsorBoards) => void
}

/**
 * 挂载后拉回来的宏观两份(已洗成点;2026-09-10 SSR 瘦身自 HomeStats 拆出)。
 */
export type MacroData = {
  /**
   * macro_series 全量点。
   */
  macro: MacroPoint[]

  /**
   * pnp_ops_stats 省级点。
   */
  ops: OpsPoint[]
}

/**
 * `makeMacroLoad` 的入参。
 */
export type MacroLoadIn = {
  /**
   * 两份到手后的落格。
   */
  setMacroData: (v: MacroData) => void
}

/**
 * /api/stats/macro 回包的探针形(服务端恒发两键;防坏包按 null 读,`== null` 双杀缺键)。
 */
export type MacroStatsProbe = {
  /**
   * macro_series 原样行。
   */
  macro: MacroDbRow[] | null

  /**
   * pnp_ops_stats 原样行。
   */
  ops: OpsDbRow[] | null
}

/**
 * `makeNavWatch` 的入参(二级导航的滚动跟随)。
 */
export type NavWatchIn = {
  /**
   * 跟随的锚点 id 清单(2026-09-11 Frank「页面滚动时候 这部分也得亮」:子导航行复用同一台
   * 跟随机,主行传 NAV_IDS、子行传当前段的子锚点)。
   */
  ids: string[]

  /**
   * 当前分区的落格。
   */
  setNavSec: FilterFn
}

/**
 * `useNavSub` 的入参(子导航行的滚动跟随)。
 */
export type NavSubIn = {
  /**
   * 当前段子项的锚点 id 清单(段切换时整份换)。
   */
  ids: string[]
}

/**
 * `navSubOrFirstOf` 的入参。
 */
export type NavSubOrFirstIn = {
  /**
   * 跟随机交回的当前子分区 id;'' = 还没滚过任何子锚点。
   */
  subSec: string

  /**
   * 当前段的子项清单。
   */
  items: NavItem[]
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
   * 只读身份与长度,行的形状不管(职业榜与雇主表共用这台页态)。
   */
  rows: object[]

  /**
   * 每页几行。
   */
  pageSize: number
}

/**
 * 把脉首页整机的面板(视图要的一切)。
 * 2026-09-04 重构:四榜 / 抽选 / 政策三格撤,加职业段、雇主段、LMIA 段的行业分表与城市、趋势两段。
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
   * S1 三脉象卡。
   */
  numCards: NumCardRow[]

  /**
   * 职业段的分表(全职业两榜 + 行业各一表);null = 主图数据还没到。
   */
  occSecs: OccSec[] | null

  /**
   * 雇主段的行业分表(2026-09-12 Frank「有工签 和 没工签 用一张表就行了」:两档并一张,身份档退役)。
   */
  empSecs: EmpSec[]

  /**
   * 雇主段的三试点指定雇主表。
   */
  pilotSecs: EmpSec[]

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 招聘对比横表行(market 到手才有)。
   */
  jobsRows: JobsRow[]



  /**
   * 英文取词函数(抽选主文案取官方英文名,与界面语言无关;整页只造一次)。
   */
  tEn: TFn

  /**
   * 当前所在分区的锚点 id;'' = 还没滚到任何分区。
   */
  navSec: string

  /**
   * 「按指标」视图的指标表(PR 不在其列,单独一段)。
   */
  indGeos: MacroGeo[]

  /**
   * PR 段的每地区小表(2026-09-10 Frank「pr 是不是单独列一个大项」:自省份段拆出)。
   */
  prGeos: MacroGeo[]

  /**
   * 宏观两份还在路上(SSR 瘦身批:省份 / PR 两段渲占位)。
   */
  macroLoading: boolean
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
   * 标题行右侧控件(更新时间 / 外链)。
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
 * BoardsSection(职业段:全职业两榜 + 行业各一表)的 props。
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
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   * 挂在伞标题行右槽 —— 各分表同一份数据,整区一枚,不逐表重复。
   */
  updatedAt: string

  /**
   * 分表清单;null = 主图数据还没到,出占位块。
   */
  secs: OccSec[] | null

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
 * OccBoardSec(一张带子标题与 Top N 下拉的职业分表)的 props。
 */
export type OccBoardSecIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张表的锚点 id(二级导航子项跳到这里)。
   */
  anchor: string

  /**
   * 界面语言。
   */
  lang: string

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 本表全部行(已排好序;分页在表里)。
   */
  rows: OccRowList

  /**
   * 子标题。
   */
  title: string

  /**
   * 与上一表留不留间距(第一表不留)。
   */
  gap: boolean

  /**
   * 数据更新时刻(ISO;'' 不渲)—— 每张表标题行右槽各一枚(2026-09-04 Frank「每个表都应该有更新时间」)。
   */
  updatedAt: string
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
 * CtaBand(S6 职位板入口)的 props。
 */
export type CtaBandIn = {
  /**
   * 取词函数。
   */
  t: TFn
}


/**
 * 职业段的一张分表(全职业两榜之一,或一个行业组)。
 */
export type OccSec = {
  /**
   * 表的键(SEC_TOP_OPEN / SEC_TOP_WAGE / 行业组键)。
   */
  key: string

  /**
   * 子标题(已取词)。
   */
  title: string

  /**
   * 全部行,已按本表口径排好序(视图分页)。
   */
  rows: OccRowList
}

/**
 * 雇主表的表种:行业表或三试点指定雇主表(列集各自不同)。
 * 两个身份档(nowp / pgwp,2026-09-05「雇主需要按身份筛」)2026-09-12 Frank
 * 「有工签 和 没工签 用一张表就行了,只是多加一个 lima 的列,但是这个列带排序的」合并退役:
 * 行业表一张,LMIA 列常驻带排序。
 */
export type EmpTableKind = 'ind' | 'pilot'

/**
 * 雇主表的展示行(值级清洗在 toEmpCellRow 做完)。一格一个事实(2026-09-05 Frank「一个字段怎么包含这么多信息」)。
 */
export type EmpCellRow = {
  /**
   * 行键(雇主名)。
   */
  key: string

  /**
   * 雇主英文名(全大写的转成词首大写显示)。
   */
  name: string

  /**
   * 界面语言的别名(中文 / 韩文机器音译,数据层给的;英文界面与没别名的给 '',名下不出注)。
   * 2026-09-05 Frank「雇主和主营业务下面应该有中文翻译吧」。
   */
  alias: string

  /**
   * 连锁记号文案(试点表里连锁雇主给「连锁」,其余行 '' 不出胶囊;2026-09-06)。
   */
  chainText: string

  /**
   * 连锁胶囊的 tooltip。
   */
  chainTip: string

  /**
   * 「看岗位」:职位板按雇主名筛。
   */
  jobsHref: string

  /**
   * 「看公司」:公司页。
   */
  companyHref: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 在招数文案。
   */
  openText: string

  /**
   * 在招职业胶囊(最多 HIRING_OCC_MAX 个,本行业组的职业排前;主图没到时空清单)。
   */
  hiringOcc: StartPill[]

  /**
   * 「等 N 个」文案;职业数不超过胶囊数时给 ''。
   */
  hiringMoreText: string

  /**
   * 在招岗命中省清单。
   */
  named: boolean

  /**
   * AIP 指定雇主。
   */
  aip: boolean

  /**
   * RCIP 指定雇主(社区试点名单按名匹配)。
   */
  rcip: boolean

  /**
   * FCIP 指定雇主(同上)。
   */
  fcip: boolean

  /**
   * 主营业务主文案(英文原文;没有给 DASH_MARK;2026-09-05 Frank「需要一个单独的列来解释公司业务」)。
   */
  brief: string

  /**
   * 主营业务灰注:中/韩界面挂译文(2026-09-05 Frank「改成中英双语的吗」「先英文再中文」,形照名字格的别名注:
   * 英文主、界面语言注);没译文时 TEXT_NONE 不出行。
   */
  briefNote: string

  /**
   * 勾的胶囊类(与紧缺列的省胶囊同一形)。
   */
  flagCls: string

  /**
   * TEER 0-3 在招职业数(按 NOC 去重;主图没到给 0)。
   */
  teer03: number

  /**
   * 近半年 LMIA 获批数(没工签档显示这一档)。
   */
  lmia2q: number

  /**
   * 近半年文案;0 给 DASH_MARK(近一年批过但近半年没有 = 办过但停了)。
   */
  lmia2qText: string

  /**
   * 近一年 LMIA 获批数(入选口径)。
   */
  lmia4q: number

  /**
   * 近一年 LMIA 获批数文案;0 给 DASH_MARK。
   */
  lmia4qText: string

  /**
   * 雇主门槛判定文案(达标 / 差 X / 待核;公共部门与政府机关给 DASH_MARK —— 门槛对它们不设,类别另有一列说,
   * Frank 2026-09-05「雇主门槛现在还是显示不适用啊」)。
   */
  verdictText: string

  /**
   * 雇主类别文案(私营企业 / 公共部门 / 政府部门;2026-09-05 Frank「雇主门槛和雇主类别应该是两个字段吧」)。
   */
  sectorText: string

  /**
   * PGWP 档把脉结论键(PULSE_OK / CHECK / SHORT / CEC),只用来排序(可走在前),不上表。
   */
  pulse: string

  /**
   * 「看岗位」文案。
   */
  actJobsText: string

  /**
   * 「看公司」文案。
   */
  actCompanyText: string

  /**
   * 操作钮的类(button 桶 ghost 小号档)。
   */
  actBtnCls: string

  /**
   * 点了「看岗位」的回调(埋点;形照 OccCellRow.onView,哑单元格不 import functions,免循环依赖)。
   */
  onView: ClickFn
}

/**
 * `useEmpSecs` 的返回:当前身份档的行业分表 + 三试点表。
 */
export type EmpSecsPanel = {
  /**
   * 行业分表。
   */
  secs: EmpSec[]

  /**
   * 三试点指定雇主表。
   */
  pilotSecs: EmpSec[]
}

/**
 * 雇主段 / LMIA 段的一张行业分表。
 */
export type EmpSec = {
  /**
   * 行业组键。
   */
  key: string

  /**
   * 子标题(已取词)。
   */
  title: string

  /**
   * 展示行,已排好序(视图分页)。
   */
  rows: EmpCellRow[]
}

/**
 * `occSecsOf` 的入参。
 */
export type OccSecsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全国行(province='all')。
   */
  natOcc: OccRowList
}

/**
 * `empSecsOf` 的入参。
 */
export type EmpSecsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 担保雇主三分表(SSR 切片或挂载后拉到的全量)。
   */
  sponsor: SponsorBoards

  /**
   * NOC → 分类(雇主归行业组用)。
   */
  nocCat: NocCatMap

  /**
   * NOC → 职业名与 TEER(主图到了才有;没到给空表)。
   */
  nocInfo: NocInfoMap

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra

  /**
   * 界面语言(别名取哪种)。
   */
  lang: StartLang
}

/**
 * `indOfNocs` 的入参。
 */
export type IndOfIn = {
  /**
   * 该雇主在招岗的 NOC 清单。
   */
  nocs: string[]

  /**
   * NOC → 分类。
   */
  nocCat: NocCatMap
}

/**
 * `toEmpCellRow` 的入参。
 */
export type EmpCellRowIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 按哪个试点的岗取值(PILOT_KEY_AIP / RCIP / FCIP:在招、职业、看岗位只看该试点的岗;PILOT_NONE = 全国)。
   */
  pick: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行归的行业组键(在招职业胶囊里本组职业排前)。
   */
  ind: string

  /**
   * NOC → 职业名与 TEER。
   */
  nocInfo: NocInfoMap

  /**
   * NOC → 分类。
   */
  nocCat: NocCatMap

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra

  /**
   * 界面语言(取哪种别名)。
   */
  lang: StartLang
}

/**
 * 城市段五份数据(2026-09-11 重设计批:/api/stats/city 挂载后到手的整包)。
 */
export type CityData = {
  /**
   * 城市全量榜(按在招降序;表 1 与行业小表的译名灰注都吃它)。
   */
  cities: CityRow[]

  /**
   * 城 × 大类在招(行业对比;大类 → 八行业组的归组在展示行做)。
   */
  industry: CityIndustryRow[]

  /**
   * 试点社区行(表 3)。
   */
  pilots: PilotCommRow[]

  /**
   * DLI 院校行(表 4 留学院校;2026-09-12 一校一行)。
   */
  dli: DliSchoolRow[]
}

/**
 * /api/stats/city 拉回的 json 探针(线格式:缺席 = 不发键)。
 */
export type CityStatsProbe = {
  /**
   * 城市全量榜。
   */
  cities?: CityRow[]

  /**
   * 城 × 大类在招。
   */
  industry?: CityIndustryRow[]

  /**
   * 试点社区行。
   */
  pilots?: PilotCommRow[]

  /**
   * DLI 院校行。
   */
  dli?: DliSchoolRow[]
}

/**
 * `makeCityLoad` 的入参。
 */
export type CityLoadIn = {
  /**
   * 五份到手落进段状态。
   */
  setCityData: (d: CityData) => void
}

/**
 * 城市段各表「城市名」格的公共形(名字链接 + 灰注;四张表的展示行都含这四格,
 * 单元格组件按这个形收窄)。
 */
export type CityLinkRow = {
  /**
   * 主文案(界面语言有译名用译名,否则英文)。
   */
  name: string

  /**
   * 灰注(英文名 + 省码;主文案就是英文时只剩省码)。
   */
  note: string

  /**
   * 落职位板按城市筛(带来源标记)。
   */
  href: string

  /**
   * 点击埋点(city-open,kind 按表)。
   */
  onOpen: ClickFn
}

/**
 * 操作格读的四格 —— 主要城市 / 行业 / 试点三组表同用一枚 CityActCell(照表 1 的形;
 * 2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」)。
 */
export type CityActRow = {
  /**
   * 看岗位钮落职位板的地址(TEXT_NONE 不出钮 —— 对不上城的试点社区没有落板处)。
   */
  jobsHref: string

  /**
   * 点击埋点。
   */
  onOpen: ClickFn

  /**
   * 看岗位钮文案。
   */
  actText: string

  /**
   * 看岗位钮的类。
   */
  actBtnCls: string
}

/**
 * 表 1(主要城市)的展示行。
 */
export type CityMainRow = {
  /**
   * 行键(城市 + 省)。
   */
  key: string

  /**
   * 城市名主文案。
   */
  name: string

  /**
   * 灰注(英文名 + 省码)。
   */
  note: string

  /**
   * 落职位板。
   */
  href: string

  /**
   * 点击埋点。
   */
  onOpen: ClickFn

  /**
   * 在招数(排序键);没算 null。
   */
  open: number | null

  /**
   * 在招数文案;没有给 DASH_MARK。
   */
  openText: string

  /**
   * 近 7 天新增(排序键);没算 null。
   */
  new7: number | null

  /**
   * 近 7 天文案;没有给 DASH_MARK。
   */
  new7Text: string

  /**
   * 中位年薪(排序键);没算 null。
   */
  wage: number | null

  /**
   * 中位年薪文案;没有给 DASH_MARK。
   */
  wageText: string

  /**
   * 人口(排序键;StatCan CSD 年度估计,人工核定城市清单外 null)。
   */
  pop: number | null

  /**
   * 人口文案;没有给 DASH_MARK。
   */
  popText: string

  /**
   * 都会区失业率(排序键;CMA 口径,不在 CMA null)。
   */
  unemp: number | null

  /**
   * 都会区失业率文案;没有给 DASH_MARK。
   */
  unempText: string

  /**
   * 看岗位钮文案(2026-09-12 Frank「省份和城市也需要 这个 看岗位的功能吧」,照雇主板操作列)。
   */
  actText: string

  /**
   * 看岗位钮的类。
   */
  actBtnCls: string

  /**
   * 看岗位钮的地址(职位板按城市筛;名字链接 href 归详情页,照雇主板「名字进详情、操作进板」)。
   */
  jobsHref: string
}

/**
 * `toCityMainRows` 的入参。
 */
export type CityMainRowsIn = {
  /**
   * 城市全量榜。
   */
  rows: CityRow[]

  /**
   * 取词函数(通道文案)。
   */
  t: TFn

  /**
   * 界面语言(译名按语言取)。
   */
  lang: StartLang
}

/**
 * `cityDliColsOf` 的入参。
 */
export type CityDliColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前种类档(DLI_KINDS 之一;学院档不出 QS 列,2026-09-12 Frank「删掉。学院的 qs 删掉」)。
   */
  kind: string
}

/**
 * 城市段各表列构造的入参(只要取词函数)。
 */
export type CityColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 行业对比小表的展示行(2026-09-11 Frank「这个应该每个行业一个表吧」「要和雇主的那个行业
 * 保持一致吧」:城 × 九业横表退役,一行业组一张小表,行 = 城,值 = 组内在招求和)。
 */
export type CityIndRow = {
  /**
   * 行键(城市 + 省)。
   */
  key: string

  /**
   * 城市名主文案。
   */
  name: string

  /**
   * 灰注。
   */
  note: string

  /**
   * 落职位板(2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」:改落城市详情页,落板归 jobsHref)。
   */
  href: string

  /**
   * 看岗位钮落职位板(按城筛;职位板只认单个大类、行业组筛不了,与表 1 同落全城)。
   */
  jobsHref: string

  /**
   * 点击埋点。
   */
  onOpen: ClickFn

  /**
   * 看岗位钮文案。
   */
  actText: string

  /**
   * 看岗位钮的类。
   */
  actBtnCls: string

  /**
   * 该行业组在招数(组内大类求和)。
   */
  n: number

  /**
   * 该城该组最低时薪(ESDC 官方带下端的组内中位;旧快照过渡期是 null 不编;2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」)。
   */
  low: number | null

  /**
   * 最低时薪文案(没有显杠)。
   */
  lowText: string

  /**
   * 该城该组中位年薪(2026-09-11 Frank「带行业的 中位时薪 和 年薪 才有意义是吧」;
   * 快照按组聚合的真中位数,旧快照过渡期与无薪组是 null 不编)。
   */
  wage: number | null

  /**
   * 中位年薪文案(没有显杠)。
   */
  wageText: string

  /**
   * 该城该组中位时薪(同口径,两位小数;旧快照过渡期是 null 不编)。
   */
  hourly: number | null

  /**
   * 中位时薪文案(没有显杠)。
   */
  hourlyText: string
}

/**
 * 行业对比的一张小表(键 = 行业组键,题 = 界面语言组名 —— 与职业/雇主段同词)。
 */
export type CityIndTable = {
  /**
   * 行业组键(IND_KEYS 之一)。
   */
  key: string

  /**
   * 表题(界面语言组名,KEY_IND_HEAD 词条)。
   */
  label: string

  /**
   * 行(该组有在招的城,按在招降序)。
   */
  rows: CityIndRow[]
}

/**
 * `cityPageHrefOf` 的入参。
 */
export type CityPageHrefIn = {
  /**
   * 城英文名。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string
}

/**
 * `cityIndTablesOf` 组内聚合的中间格(一城一组)。
 */
export type IndCityCell = {
  /**
   * 在招岗数。
   */
  n: number

  /**
   * 中位年薪;旧形快照过渡兜底不可拼 = null。
   */
  wage: number | null

  /**
   * 中位时薪;旧形快照过渡兜底不可拼 = null。
   */
  hourly: number | null

  /**
   * 最低时薪;旧形快照过渡兜底不可拼 = null。
   */
  low: number | null
}

/**
 * `cityIndTablesOf` 的入参。
 */
export type CityIndTablesIn = {
  /**
   * 城 × 大类计数行。
   */
  rows: CityIndustryRow[]

  /**
   * 城市全量榜(译名与灰注借它)。
   */
  cities: CityRow[]

  /**
   * 取词函数(行业组表题,KEY_IND_HEAD + 组键)。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * `cityIndColsOf` 的入参。
 */
export type CityIndColsIn = {
  /**
   * 取词函数(城市 / 在招两列头)。
   */
  t: TFn
}

/**
 * 表 3(试点社区)的展示行。
 */
export type CityPilotRow = {
  /**
   * 行键(社区名 + 类型)。
   */
  key: string

  /**
   * 社区名主文案(一律英文短名,2026-09-11 Frank「都用英文名吧」—— 试点多在译名表外,不混排)。
   */
  name: string

  /**
   * 灰注(省码)。
   */
  note: string

  /**
   * 落职位板(按社区主城筛;2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」:改落城市详情页,落板归 jobsHref)。
   */
  href: string

  /**
   * 看岗位钮落职位板(城 + 该制筛;对不上城 TEXT_NONE 不出钮)。
   */
  jobsHref: string

  /**
   * 点击埋点。
   */
  onOpen: ClickFn

  /**
   * 看岗位钮文案。
   */
  actText: string

  /**
   * 看岗位钮的类。
   */
  actBtnCls: string

  /**
   * 在招数(排序键;0 是事实)。
   */
  open: number

  /**
   * 在招数文案。
   */
  openText: string

  /**
   * 最低时薪(该制岗的 ESDC 官方带下端中位;快照没算是 null 不编;2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」)。
   */
  low: number | null

  /**
   * 最低时薪文案(没有显杠)。
   */
  lowText: string

  /**
   * 中位时薪(同口径)。
   */
  hourly: number | null

  /**
   * 中位时薪文案(没有显杠)。
   */
  hourlyText: string
}

/**
 * 试点社区的一张小表(2026-09-11 Frank「这个拆成两个表 RCIP FCIP」:一制一张,
 * 表题 = 制度名三语同形,照雇主段三试点表)。
 */
export type CityPilotTable = {
  /**
   * 制度名(RCIP / FCIP;即表题与分表锚键)。
   */
  key: string

  /**
   * 行(该制的社区,双制社区两表各出)。
   */
  rows: CityPilotRow[]
}

/**
 * CityPilotBlock(城市段一张试点/AIP 表块;2026-09-12 AIP 挂分页后自 CitySection 提出)的 props。
 */
export type CityPilotBlockIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张表。
   */
  tb: CityPilotTable

  /**
   * 试点社区表的列集。
   */
  pilotCols: StartCol<CityPilotRow>[]

  /**
   * AIP 城市表的列集。
   */
  aipCols: StartCol<CityPilotRow>[]

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
}

/**
 * `cityPilotTablesOf` 的入参。
 */
export type CityPilotRowsIn = {
  /**
   * 取词函数(看岗位钮文案;2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」)。
   */
  t: TFn

  /**
   * 试点社区行。
   */
  pilots: PilotCommRow[]

  /**
   * 城市全量榜(落板链接借它对名)。
   */
  cities: CityRow[]
}

/**
 * `cityAipTableOf` 的入参。
 */
export type CityAipTableIn = {
  /**
   * 取词函数(看岗位钮文案;2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」)。
   */
  t: TFn

  /**
   * 城市全量榜(aipJobs 快照格与双行名都从这来)。
   */
  cities: CityRow[]

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * 表 4(留学院校)的展示行(2026-09-12 Frank「要不每个学校单独一行怎么样 再加上 qs 排名」:
 * 一校一行,当天早间的城市聚合 + 点开胶囊形同日退役 —— 折叠/胶囊/落板链整链撤)。
 */
export type CityDliRow = {
  /**
   * 行键(DLI 校名)。
   */
  key: string

  /**
   * 院校名主文案(中文界面有译名用译名,否则官方英文)。
   */
  name: string

  /**
   * 灰注(主文案是译名时给官方英文名,否则空串不出行 —— 照城市名双行约定)。
   */
  note: string

  /**
   * 省列文案(两位省码;紧凑格约定用码)。
   */
  provText: string

  /**
   * 校区城列文案(英文名,多个顿号相接 —— 枚举用顿号站规)。
   */
  citiesText: string

  /**
   * 类型文案(公立 / 私立)。
   */
  typeText: string

  /**
   * QS 排名文案(展示名次如 "=45";榜外杠)。
   */
  qsText: string

  /**
   * QS 排名排序键(纯数;榜外 null 沉底)。
   */
  qsSort: number | null
}

/**
 * `toCityDliRows` 的入参。
 */
export type CityDliRowsIn = {
  /**
   * 种类筛选档(DLI_KINDS 之一;全部档不筛;2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」)。
   */
  kind: string

  /**
   * DLI 院校行(一校一行)。
   */
  rows: DliSchoolRow[]

  /**
   * 取词函数(公立 / 私立词条)。
   */
  t: TFn

  /**
   * 界面语言(译名取舍)。
   */
  lang: StartLang
}

/**
 * `useCityPanel` 的入参。
 */
export type CityPanelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * 留学院校表种类筛选的一枚胶囊(2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」)。
 */
export type DliChip = {
  /**
   * 档键(DLI_KINDS 之一)。
   */
  key: string

  /**
   * 胶囊文案(界面语言)。
   */
  label: string

  /**
   * 是不是当前档。
   */
  active: boolean

  /**
   * 点它切到这一档。
   */
  onClick: ClickFn
}

/**
 * `dliKindChipsOf` 的入参。
 */
export type DliChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前档。
   */
  kind: string

  /**
   * 切档(hook 的 setState)。
   */
  set: FilterFn
}

/**
 * `makeDliKindPick` 的入参。
 */
export type DliKindPickIn = {
  /**
   * 切档。
   */
  set: FilterFn

  /**
   * 这枚胶囊的档。
   */
  kind: string
}

/**
 * `useCityPanel` 交回的面板(五份数据 + 各表展示行;行业对比一大类一张表)。
 */
export type CityPanel = {
  /**
   * 五份数据;null = 还在路上(渲占位)。
   */
  data: CityData | null

  /**
   * 表 1 展示行。
   */
  mainRows: CityMainRow[]

  /**
   * 行业对比的表清单(2026-09-11 一大类一张表)。
   */
  indTables: CityIndTable[]

  /**
   * 试点社区的表清单(2026-09-11 一制一张:RCIP / FCIP)。
   */
  pilotTables: CityPilotTable[]

  /**
   * 表 4 展示行。
   */
  dliRows: CityDliRow[]

  /**
   * 表 4 当前种类档(列构造要看它:学院档不出 QS 列;2026-09-12 Frank「删掉。学院的 qs 删掉」)。
   */
  dliKind: string

  /**
   * 留学院校表种类筛选胶囊(全部 / 大学 / 学院;2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」)。
   */
  dliChips: DliChip[]
}

/**
 * EmpSection(雇主段:行业各一表;身份胶囊 2026-09-12 随两档合并退役)的 props。
 */
export type EmpSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string

  /**
   * 行业分表(两档并一张)。
   */
  secs: EmpSec[]

  /**
   * 三试点指定雇主表(AIP / RCIP / FCIP,在招的;不分档不分行业)。
   */
  pilotSecs: EmpSec[]
}

/**
 * EmpBoardSec(一张雇主分表:子标题 + 表;身份胶囊行 2026-09-12 随两档合并退役)的 props。
 */
export type EmpBoardSecIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张表的锚点 id(二级导航子项跳到这里)。
   */
  anchor: string

  /**
   * 这张表。
   */
  sec: EmpSec

  /**
   * 表种(决定列集)。
   */
  tableKind: EmpTableKind

  /**
   * 与上一表留不留间距。
   */
  gap: boolean

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
}

/**
 * EmpBoard(雇主表:桌面表格 + 手机卡片)的 props。
 */
export type EmpBoardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行(已切到 Top N)。
   */
  rows: EmpCellRow[]

  /**
   * 表种。
   */
  kind: EmpTableKind

}

/**
 * EmpCard(雇主手机卡)的 props。
 */
export type EmpCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行。
   */
  row: EmpCellRow

  /**
   * 表种。
   */
  kind: EmpTableKind
}

/**
 * CitySection(城市段)的 props(2026-09-11 重设计:数据不再从 props 进 —— 段内自拉
 * /api/stats/city,SSR 契约与 400 张卡一并退役)。
 */
export type CitySectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
}

/**
 * DrawsLink(抽选与政策动态那一行链接)的 props。
 */
export type DrawsLinkIn = {
  /**
   * 取词函数。
   */
  t: TFn
}


/**
 * `cityNameOf` 的入参。
 */
export type CityNameIn = {
  /**
   * 城市统计行。
   */
  r: CityRow

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * `indRowsOf` 的入参。
 */
export type IndRowsIn = {
  /**
   * 全国行。
   */
  natOcc: OccRowList

  /**
   * 行业组键。
   */
  key: string
}

/**
 * `isValuableEmp` 的入参。
 */
export type ValuableIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra

  /**
   * NOC → 职业名与 TEER。
   */
  nocInfo: NocInfoMap
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
 * `toPulseDraws` 的入参。
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
 * `toPulseDraw` 的入参。
 */
export type PulseDrawIn = {
  /**
   * 这一期原始行。
   */
  r: DrawDbRow
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
 * `drawColsOf` 的入参。
 */
export type DrawColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
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
 * 通道译名小表认得的语言码(与界面语言同值,但它是另一域的入参,单独起名)。
 */
export type DrawLang = 'zh' | 'en' | 'ko'

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
 * NewsSection(政策动态区,2026-09-12 Frank「全部动态 的 table 也 加过来 之前给删了」)的 props。
 */
export type NewsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(中文才出中文标题灰注)。
   */
  lang: StartLang

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string

  /**
   * 最新几条(已去重截断)。
   */
  news: PulseNews[]
}

/**
 * 新闻表的一行原始格(SQL.NEWS_RECENT_80 的 SELECT *;跨边界形状,只声明真读的格)。
 */
export type NewsRecentDbRow = {
  /**
   * 发布日期(YYYY-MM-DD)。
   */
  date: string

  /**
   * 地区码(省码或 federal;库里可空)。
   */
  region: string | null

  /**
   * 官方原标题(库里可空)。
   */
  title: string | null

  /**
   * 中文标题(数据层翻译;旧行没有此列)。
   */
  title_zh?: string | null

  /**
   * 详情页 slug(库里可空)。
   */
  slug: string | null
}

/**
 * 政策动态区的一条(to* 洗净;2026-09-12 Frank「政策动态改成之前的 table 不需要图片」:09-04 前的表形复位,不带图)。
 */
export type PulseNews = {
  /**
   * 发布日期。
   */
  date: string

  /**
   * 地区码(省码或 federal)。
   */
  region: string

  /**
   * 官方原标题。
   */
  title: string

  /**
   * 中文标题;没有是空串。
   */
  titleZh: string

  /**
   * 详情页 slug。
   */
  slug: string
}

/**
 * `toNewsRows` 的入参。
 */
export type NewsRowsIn = {
  /**
   * 新闻原始行(按日期降序)。
   */
  rows: NewsRecentDbRow[]

  /**
   * 下发条数上限。
   */
  limit: number
}

/**
 * 政策动态表的展示行(日期 / 地区标签 / 标题双行链接)。
 */
export type NewsCellRow = {
  /**
   * 行键(slug)。
   */
  key: string

  /**
   * 日期文案。
   */
  date: string

  /**
   * 地区标签(省码;联邦是 TAG_IRCC)。
   */
  tag: string

  /**
   * 标题主文案(官方原题)。
   */
  name: string

  /**
   * 灰注(中文标题;英文界面或没有时空串)。
   */
  note: string

  /**
   * 详情页地址。
   */
  href: string
}

/**
 * `toNewsCellRows` 的入参。
 */
export type NewsCellRowsIn = {
  /**
   * 洗净的新闻条。
   */
  rows: PulseNews[]

  /**
   * 界面语言(中文才出中文标题灰注)。
   */
  lang: StartLang
}

/**
 * `newsColsOf` 的入参。
 */
export type NewsColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * DrawsSection(近期抽选表)的 props。
 */
export type DrawsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 英文取词函数(通道官方英文名)。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string

  /**
   * 抽选行(服务端已算好冷解读三标量)。
   */
  draws: PulseDraw[]


}


/**
 * `useEmpSecs` 的入参。
 */
export type EmpSecsHookIn = {
  /**
   * 页面门取好的那份 SSR 数据。
   */
  stats: HomeStats

  /**
   * 界面语言。
   */
  lang: StartLang
}
/**
 * `empColsOf` 的入参。
 */
export type EmpColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 表种(决定列集)。
   */
  kind: EmpTableKind
}

/**
 * 一个 NOC 的职业名与 TEER(从主图全国行取,随语言重建)。
 */
export type NocInfo = {
  /**
   * 界面语言的职业名。
   */
  name: string

  /**
   * TEER;官方没标给 null。
   */
  teer: number | null
}

/**
 * NOC 码 → 职业名与 TEER。
 */
export type NocInfoMap = Map<string, NocInfo>

/**
 * `nocInfoOf` 的入参。
 */
export type NocInfoIn = {
  /**
   * 全国职业行(SSR 契约带的那份)。
   */
  natOcc: OccRowList

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * `hiringOccOf` 的入参。
 */
export type HiringOccIn = {
  /**
   * 该雇主在招岗的 NOC 清单。
   */
  nocs: string[]

  /**
   * 这一行归的行业组键。
   */
  ind: string

  /**
   * NOC → 职业名与 TEER。
   */
  nocInfo: NocInfoMap

  /**
   * NOC → 分类。
   */
  nocCat: NocCatMap

  /**
   * 胶囊类。
   */
  cls: string
}

/**
 * `teer03Of` 的入参。
 */
export type Teer03In = {
  /**
   * 该雇主在招岗的 NOC 清单。
   */
  nocs: string[]

  /**
   * NOC → 职业名与 TEER。
   */
  nocInfo: NocInfoMap
}

/**
 * `verdictTextOf` 的入参。
 */
export type VerdictTextIn = {
  /**
   * 雇主门槛判定(lib/employers 的引擎契约,按索引取形,不另抄)。
   */
  v: SponsorEmployerRow['verdict']

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `pulseOf` 的入参(PGWP 档把脉规则要看的三格事实)。
 */
export type PulseIn2 = {
  /**
   * TEER 0-3 在招职业数。
   */
  teer03: number

  /**
   * 在招岗命中省清单。
   */
  named: boolean

  /**
   * 雇主门槛判定态。
   */
  state: string

  /**
   * 是不是 AIP / RCIP / FCIP 指定雇主(指定 = 直通 PR 的雇主类通道,不看省清单与门槛)。
   */
  designated: boolean
}

/**
 * `hiringMoreOf` 的入参。
 */
export type HiringMoreIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 在招职业总数。
   */
  n: number
}

/**
 * 社区试点指定雇主一行(SQL.DESIGNATED_PILOT_NAMES)。
 */
export type PilotNameDbRow = {
  /**
   * 雇主名(小写)。
   */
  name: string

  /**
   * 来源记号('RCIP' / 'FCIP' / 'RCIP+FCIP')。
   */
  source: string
}

/**
 * 公司简介一行(SQL.COMPANY_BRIEFS)。
 */
export type BriefDbRow = {
  /**
   * 公司名(小写)。
   */
  name: string

  /**
   * 英文简介全文。
   */
  brief: string

  /**
   * 中文译文;没翻过 null(2026-09-05 ai_brief_zh 落库)。
   */
  brief_zh: string | null

  /**
   * 韩文译文;没翻过 null(2026-09-05 ai_brief_ko 落库)。
   */
  brief_ko: string | null
}

/**
 * 一家公司的简介两语(英文全文 + 中文译文;没译文给 '')。
 */
export type CompanyBrief = {
  /**
   * 英文。
   */
  en: string

  /**
   * 中文;没翻过 ''。
   */
  zh: string

  /**
   * 韩文五节;没翻过 ''(2026-09-05 加)。
   */
  ko: string
}

/**
 * `pilotNamesOf` 的入参。
 */
export type PilotNamesIn = {
  /**
   * 试点名单原始行。
   */
  rows: PilotNameDbRow[]

  /**
   * 担保雇主事实行(只留交集)。
   */
  sponsorRows: SponsorRowList

  /**
   * 认哪个试点(PILOT_RCIP / PILOT_FCIP)。
   */
  pilot: string
}

/**
 * `briefsOf` 的入参。
 */
export type BriefsIn = {
  /**
   * 简介原始行。
   */
  rows: BriefDbRow[]

  /**
   * 担保雇主事实行(只留交集)。
   */
  sponsorRows: SponsorRowList
}

/**
 * 雇主段的三份补充事实(试点名单两集合 + 简介表),随身份档一起喂给 empSecsOf。
 */
export type EmpExtra = {
  /**
   * RCIP 指定雇主名(小写)集合。
   */
  rcip: Set<string>

  /**
   * FCIP 指定雇主名(小写)集合。
   */
  fcip: Set<string>

  /**
   * 名(小写)→ 简介两语。
   */
  briefs: Map<string, CompanyBrief>
}

/**
 * `briefOf` 的出参:主文案 + 灰注。
 */
export type BriefTextOut = {
  /**
   * 主文案(界面语言优先)。
   */
  main: string

  /**
   * 灰注(另一语的原文;没有 TEXT_NONE)。
   */
  note: string
}

/**
 * `briefOf` 的入参。
 */
export type BriefOfIn = {
  /**
   * 名(小写)→ 简介两语。
   */
  briefs: Map<string, CompanyBrief>

  /**
   * 雇主名(小写)。
   */
  key: string

  /**
   * 界面语言(中文界面有译文用译文,否则英文)。
   */
  lang: StartLang
}

/**
 * `isDesignated` 的入参。
 */
export type DesignatedIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra
}

/**
 * `empNocsOf` / `empOpenCountOf` / `empJobsHrefOf` 的入参:事实行 + 按哪个试点取。
 */
export type PilotPickIn = {
  /**
   * 事实行。
   */
  r: SponsorEmployerRow

  /**
   * 试点键;PILOT_NONE = 全国。
   */
  pick: string
}

/**
 * `pilotCellsOf` 的入参。
 */
export type PilotCellsIn = {
  /**
   * 试点表入参(取词、分类、职业表、集合、语言)。
   */
  x: PilotSecsIn

  /**
   * 去重后的事实行。
   */
  rows: SponsorRowList

  /**
   * 试点键(inPilotOf 按它判进表,取值只看该试点的岗)。
   */
  pilot: string
}

/**
 * `chainTextOf` 的入参。
 */
export type ChainTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这家是不是连锁。
   */
  chain: boolean

  /**
   * 试点键;PILOT_NONE(行业表)不出记号。
   */
  pick: string
}

/**
 * `pilotSecsOf` 的入参。
 */
export type PilotSecsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 担保雇主三分表。
   */
  sponsor: SponsorBoards

  /**
   * NOC → 分类。
   */
  nocCat: NocCatMap

  /**
   * NOC → 职业名与 TEER。
   */
  nocInfo: NocInfoMap

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra

  /**
   * 界面语言(别名取哪种)。
   */
  lang: StartLang
}

/**
 * `inPilotOf` 的入参。
 */
export type InPilotIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 试点键(aip / rcip / fcip)。
   */
  pilot: string

  /**
   * 试点名单两集合与简介表。
   */
  extra: EmpExtra
}

/**
 * `aliasOf` 的入参。
 */
export type AliasIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 界面语言。
   */
  lang: StartLang
}

/**
 * macro_series 表的一行(pg 原始;省份段宏观按年表的数据源,2026-09-06)。
 */
export type MacroDbRow = {
  /**
   * 地区码(CA / 十省两位码)。
   */
  geo: string

  /**
   * 数据键(pop / npr / workOnly …,见 constants 的 MK_*)。
   */
  key: string

  /**
   * 期键:季度 / 月度 = YYYY-MM-DD,年度 = YYYY。
   */
  period: string

  /**
   * 频率码 Q / M / A。
   */
  freq: string

  /**
   * 值(numeric 列 pg 给字串)。
   */
  value: number | string | null

  /**
   * 数据截至(年度 YTD 为 YYYY-MM,其余同 period)。
   */
  as_of: string | null
}

/**
 * macro_series 洗净的一点。
 */
export type MacroPoint = {
  /**
   * 地区码。
   */
  geo: string

  /**
   * 数据键。
   */
  key: string

  /**
   * 期键。
   */
  period: string

  /**
   * 频率码。
   */
  freq: string

  /**
   * 值。
   */
  value: number

  /**
   * 数据截至。
   */
  asOf: string
}

/**
 * pnp_ops_stats 省级指标的一行(pg 原始;宏观表「已发提名 / 剩余名额」两行的数据源)。
 */
export type OpsDbRow = {
  /**
   * 省码。
   */
  province: string

  /**
   * 指标名(allocation / issued / nominations_ytd / remaining …)。
   */
  metric: string

  /**
   * 值。
   */
  value: number | string | null

  /**
   * 官方标注的截至日。
   */
  as_of: string | null

  /**
   * 官方标注的期间(2026 Jan-Jun / 2026Q2 / 2025)。
   */
  period: string | null
}

/**
 * pnp_ops_stats 洗净的一点。
 */
export type OpsPoint = {
  /**
   * 省码。
   */
  province: string

  /**
   * 指标名。
   */
  metric: string

  /**
   * 值。
   */
  value: number

  /**
   * 截至日(空串 = 官方没标)。
   */
  asOf: string

  /**
   * 期间原文(空串 = 官方没标)。
   */
  period: string
}

/**
 * 宏观表的一格:某行某年的值与显示。
 */
export type MacroCell = {
  /**
   * 原值(趋势图用)。
   */
  value: number

  /**
   * 显示文案(千分位 / 百分数)。
   */
  text: string

  /**
   * 灰注(进行年的「04 月」「至 6 月」;完整年空串)。
   */
  note: string
}

/**
 * 宏观表的一行(一个指标 × 各年)。
 */
export type MacroRow = {
  /**
   * 行键(MACRO_ROW_ORDER 里的一个)。
   */
  key: string

  /**
   * 行名(i18n)。
   */
  label: string

  /**
   * 译名行(中韩界面的省译名;英文界面与非省行空串。2026-09-10「这种是不是应该统一一下」
   * 指标表地区行改招聘对比同形,同日「可以改成去掉缩写」省码灰注撤,行名两格 = 通行短名 + 译名)。
   */
  localeName: string

  /**
   * 折叠树里的父行键(PR 通道细行才有;空串 = 顶级行,恒显)。子行只在父行展开时上表,
   * 手机卡与趋势图照旧走 nonSubRowsOf 不收细行。
   */
  parent: string

  /**
   * 是不是「其中」缩进行。
   */
  sub: boolean

  /**
   * 「指标」单元格的容器类(缩进行带缩进类;单元格件不回头 import functions,免循环依赖)。
   */
  keyCls: string

  /**
   * 父行的折叠 / 展开手柄(只有临时居民那行有;其余 null)。
   */
  toggle: ClickFn | null

  /**
   * 父行当前是否展开。
   */
  expanded: boolean

  /**
   * 年 → 格。
   */
  cells: Record<string, MacroCell>

  /**
   * 最新一格(手机卡显示;一格都没有则 null)。
   */
  latest: MacroCell | null

  /**
   * 最新一格的年份(手机卡每格带年,Frank 2026-09-08:配额 2026 / 已发 2025 并排无年份读成「已发完」);没格空串。
   */
  latestYear: string

  /**
   * 一格都没有时显示的词(「未公布」/「本站未收录」);有格空串。
   */
  missing: string

  /**
   * 同比格(指标表:块的最新完整年对上一年的相对变化,百分数);省块与没配对年份的行 null。
   */
  yoy: MacroCell | null

  /**
   * 同比格的色类(持平素色、涨绿跌红);没同比格空串。
   */
  yoyCls: string

  /**
   * 推荐列文案(竞争表:推荐 / 可选 / 拥挤);别的表与没数的行空串。
   */
  rec: string

  /**
   * 推荐列胶囊类(借竞争度三色);空串 = 不显。
   */
  recCls: string
}

/**
 * 省份段的一个地区块(全国或一省):标题三格 + 竞争度 + 年份列 + 行。
 */
export type MacroGeo = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 锚点 id(pl-prov-<码小写>)。
   */
  anchor: string

  /**
   * 显示名(全国取词;省用通行短名)。
   */
  name: string

  /**
   * 年份列(升序,含进行年)。
   */
  years: string[]

  /**
   * 行(有格的才在)。
   */
  rows: MacroRow[]

  /**
   * 同比列名(「同比 25/24」);空串 = 不出这列。
   */
  yoyLabel: string

  /**
   * 首列列名:指标表的行是地区(「地区」),PR 每省小表的行是指标(「指标」)——
   * 2026-09-10 PR 表拆每省一表后由建表方定,不再按有没有同比列猜。
   */
  keyLabel: string

  /**
   * 年 → 全列共用的灰注(整列有数的格都是同一个「至 X 月」时提到列头一次,格里不再重复;
   * 各省截止不一致的列给空串,灰注留在格里。Frank 2026-09-09「至 4 月这种放到标题上如何」)。
   */
  yearNotes: Record<string, string>

  /**
   * 推荐列名;空串 = 不出这列。
   */
  recLabel: string

  /**
   * 标题下的公式行(只有竞争表);空串不显。
   */
  formula: string

  /**
   * 趋势图画指数还是原值:把脉页全部画原值柱(Frank 2026-09-10「这个 y 轴也不对啊」→ 比值表先改,
   * 「其他的表也这个样」→ 计数表也改;指数折线只留在通用件里)。
   */
  indexed: boolean
}

/**
 * `macroGeosOf` 的入参。
 */
export type MacroGeosIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: string

  /**
   * macro_series 全量点(SSR 瘦身批起由挂载后拉取注入)。
   */
  macro: MacroPoint[]

  /**
   * pnp_ops_stats 省级点(同上)。
   */
  ops: OpsPoint[]

  /**
   * 省卡增补(竞争度档在这里)。
   */
  provExtra: ProvExtraMap
}

/**
 * `macroRowOf` 的入参。
 */
export type MacroRowIn = {
  /**
   * 行键。
   */
  key: string

  /**
   * 地区码(判这行对该地区适不适用、缺格该显哪个词)。
   */
  code: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该地区的点。
   */
  points: MacroPoint[]

  /**
   * 该地区的运营点。
   */
  ops: OpsPoint[]
}

/**
 * `cellsOfKey` 的入参:某数据键的点 → 年 → 格。
 */
export type CellsOfKeyIn = {
  /**
   * 数据键。
   */
  key: string

  /**
   * 该地区的点。
   */
  points: MacroPoint[]

  /**
   * 取词函数(进行年灰注)。
   */
  t: TFn
}

/**
 * `macroCellOf` 的入参:一点 → 一格。
 */
export type MacroCellIn = {
  /**
   * 数据键(决定显示格式:失业率百分数,其余千分位)。
   */
  key: string

  /**
   * 值。
   */
  value: number

  /**
   * 灰注。
   */
  note: string
}

/**
 * `yearOfPoint` 的出参:一点落在哪一年、是不是完整年。
 */
export type PointYear = {
  /**
   * 年份(YYYY)。
   */
  year: string

  /**
   * 是不是完整年(年末 / 完整年度)。
   */
  full: boolean

  /**
   * 进行年灰注(完整年空串)。
   */
  note: string
}

/**
 * `yearOfPoint` 的入参。
 */
export type YearOfPointIn = {
  /**
   * 一点。
   */
  p: MacroPoint

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `opsCellOf` 的入参:pnp_ops_stats 一点 → 一格(年从 period / as_of 里取)。
 */
export type OpsCellIn = {
  /**
   * 运营点。
   */
  p: OpsPoint

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `opsCellOf` 的出参;年取不出来给 null。
 */
export type MaybeOpsCell = {
  /**
   * 年份。
   */
  year: string

  /**
   * 格。
   */
  cell: MacroCell
} | null

/**
 * `remainingCellsOf` 的入参:剩余名额 = 官方直给,缺则 配额 − 已发。
 */
export type RemainingIn = {
  /**
   * 官方直给的剩余(年 → 格)。
   */
  direct: Record<string, MacroCell>

  /**
   * 配额(年 → 格)。
   */
  alloc: Record<string, MacroCell>

  /**
   * 已发(年 → 格)。
   */
  issued: Record<string, MacroCell>
}

/**
 * `macroRowAppliesTo` 的入参。
 */
export type MacroRowApplyIn = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 行键。
   */
  key: string
}

/**
 * `macroMissingTextOf` 的入参。
 */
export type MacroMissingIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 地区码。
   */
  code: string

  /**
   * 行键。
   */
  key: string

  /**
   * 这行有没有格。
   */
  has: boolean

  /**
   * 这行对该地区适不适用(不适用 = 显「不适用」,如魁省的省提名行、全国的省级行)。
   */
  applies: boolean
}

/**
 * `makeMacroYearCell` 的入参。
 */
export type MacroYearCellIn = {
  /**
   * 年份列键。
   */
  year: string

  /**
   * 是不是最后一列(整行没格时,缺数据的词只在这一列显一次)。
   */
  last: boolean

  /**
   * 当前年(四位串):列年在它之后是未来,空格照旧横杠。
   */
  now: string

  /**
   * 「未发布」的词:行里最后一个有数年之后、当前年之前(含)的空格 = 官方还没发(Frank 2026-09-09「没发布应该写 未发布」)。
   */
  unreleased: string

  /**
   * 这一列已提到列头的灰注;格里的灰注与它相同就不再显示;空串 = 列头没有。
   * (原「本站未收录」词格 2026-09-10 撤:没抓到的空档一律留白,「未发布」必须举证。)
   */
  note: string
}

/**
 * `geoPointsOf` 的入参。
 */
export type GeoPointsIn = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 全部宏观点。
   */
  macro: MacroPoint[]

  /**
   * 全部运营点。
   */
  ops: OpsPoint[]
}

/**
 * `geoPointsOf` 的出参:一个地区的两份点。
 */
export type GeoPoints = {
  /**
   * 该地区的宏观点。
   */
  points: MacroPoint[]

  /**
   * 该地区的运营点。
   */
  ops: OpsPoint[]
}

/**
 * `indGeoOf` 的入参:一张指标表。
 */
export type IndGeoIn = {
  /**
   * 指标键。
   */
  key: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(省译名行要判英文界面不出)。
   */
  lang: string

  /**
   * 全部宏观点。
   */
  macro: MacroPoint[]

  /**
   * 全部运营点。
   */
  ops: OpsPoint[]
}

/**
 * 指标表构造中途的一对:地区码 + 按省块算法出的底行。
 */
export type IndBase = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 底行(键 / 名还是指标的)。
   */
  row: MacroRow
}

/**
 * `indRowOf` 的入参:省块形的一行改成地区行。
 */
export type IndRowIn = {
  /**
   * 指标键下按该地区算出的行(键 / 名还是指标的)。
   */
  base: MacroRow

  /**
   * 地区码(成为行键)。
   */
  code: string

  /**
   * 地区名(成为行名;2026-09-10 起 = 通行短名,与招聘对比同形)。
   */
  name: string

  /**
   * 译名行(中韩界面;英文界面空串)。
   */
  localeName: string

  /**
   * 块的同比年;空串 = 没同比。
   */
  year: string

  /**
   * 指标键(同比颜色要知道涨了是好是坏)。
   */
  key: string

  /**
   * 取词函数(同比「持平」一词)。
   */
  t: TFn
}

/**
 * `prGeosOf` 的入参。
 */
export type PrGeosIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(段首配额 / EE 两张指标表的省译名行要判英文界面不出)。
   */
  lang: string

  /**
   * 全部宏观点。
   */
  macro: MacroPoint[]

  /**
   * 全部运营点。
   */
  ops: OpsPoint[]
}

/**
 * `prRegionGeoOf` 的入参(一个地区的 PR 小表)。
 */
export type PrRegionGeoIn = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全部宏观点。
   */
  macro: MacroPoint[]

  /**
   * 全部运营点。
   */
  ops: OpsPoint[]
}

/**
 * `withFoldParent` 的入参。
 */
export type WithFoldParentIn = {
  /**
   * 通道细行。
   */
  row: MacroRow

  /**
   * 折叠树父键。
   */
  parent: string
}

/**
 * `foldRowsOf` 的入参。
 */
export type FoldRowsIn = {
  /**
   * 全部行(含收着的细行)。
   */
  rows: MacroRow[]

  /**
   * 开合表(键 = 大类行键;不在表里 = 收着)。
   */
  open: Record<string, boolean>

  /**
   * 翻转一个键的回调(useFold 给)。
   */
  flip: FoldFlipFn
}

/**
 * 折叠翻转回调(收一个大类行键)。
 */
export type FoldFlipFn = (key: string) => void

/**
 * `hasFoldChildRow` 的入参。
 */
export type HasFoldChildIn = {
  /**
   * 全部行。
   */
  rows: MacroRow[]

  /**
   * 父键。
   */
  key: string
}

/**
 * `makeFoldFlip` 的入参。
 */
export type MakeFoldFlipIn = {
  /**
   * 行键。
   */
  key: string

  /**
   * 翻转回调。
   */
  flip: FoldFlipFn
}

/**
 * `withFoldToggle` 的入参。
 */
export type WithFoldToggleIn = {
  /**
   * 大类行。
   */
  row: MacroRow

  /**
   * 折叠钮回调。
   */
  toggle: ClickFn

  /**
   * 当前开合态。
   */
  expanded: boolean
}

/**
 * `foldFlippedOf` 的入参。
 */
export type FoldFlippedIn = {
  /**
   * 现开合表。
   */
  prev: Record<string, boolean>

  /**
   * 要翻的键。
   */
  key: string
}

/**
 * `useFold` 的出参:一张表的折叠状态机。
 */
export type FoldOut = {
  /**
   * 开合表。
   */
  open: Record<string, boolean>

  /**
   * 翻转一个键。
   */
  flip: FoldFlipFn
}

/**
 * `prGeoNameOf` 的入参(PR 小表标题;导航子项处没有 lang,标题词全由 t 决定)。
 */
export type PrGeoNameIn = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `prRowOf` 的入参。
 */
export type PrRowIn = {
  /**
   * 省块形底行(行名 = 指标名)。
   */
  base: MacroRow

  /**
   * 表的同比年;空串 = 没同比。
   */
  year: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `allocTargetRowOf` 的入参。
 */
export type AllocTargetRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全部宏观点。
   */
  macro: MacroPoint[]

  /**
   * 全部运营点。
   */
  ops: OpsPoint[]
}

/**
 * 手机省卡迷你格的一格(`cardPairsOf` 的出参项)。
 */
export type CardPair = {
  /**
   * 年份(格键)。
   */
  year: string

  /**
   * 该年的值文案(已带单位格式)。
   */
  text: string
}

/**
 * `yoyYearOf` 的入参。
 */
export type YoyYearIn = {
  /**
   * 行(流量 / 存量之分 2026-09-10 撤:一律最新年比去年)。
   */
  rows: MacroRow[]
}

/**
 * `recRowsOf` 的入参。
 */
export type RecRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 地区行(已带最新格)。
   */
  rows: MacroRow[]

  /**
   * 指标键(只有竞争表出推荐)。
   */
  key: string
}

/**
 * `recLabelOf` 的入参。
 */
export type RecLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 指标键。
   */
  key: string
}

/**
 * `withRec` 的入参。
 */
export type WithRecIn = {
  /**
   * 原行。
   */
  row: MacroRow

  /**
   * 推荐格。
   */
  rec: RecOut
}

/**
 * `recRankOf` 的入参。
 */
export type RecRankOfIn = {
  /**
   * 这一行。
   */
  row: MacroRow

  /**
   * 参评的省行(都有最新值)。
   */
  rows: MacroRow[]

  /**
   * 越低越好。
   */
  lower: boolean
}

/**
 * `recOfRank` 的入参。
 */
export type RecRankIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该行在有数行里按最新值升序的名次(0 起)。
   */
  rank: number

  /**
   * 有数的行数。
   */
  n: number
}

/**
 * `recOfRank` 的出参。
 */
export type RecOut = {
  /**
   * 文案。
   */
  text: string

  /**
   * 胶囊类。
   */
  cls: string
}

/**
 * `yoyCellOf` 的入参。
 */
export type YoyCellIn = {
  /**
   * 年 → 格。
   */
  cells: Record<string, MacroCell>

  /**
   * 同比年(与它前一个完整年配对;可为进行年 —— 2026-09-10「最新的比去年的」,流量档撤)。
   */
  year: string

  /**
   * 取词函数(同比「持平」一词)。
   */
  t: TFn
}

/**
 * `yoyTextOf` 的入参。
 */
export type YoyTextIn = {
  /**
   * 同比百分数。
   */
  pct: number

  /**
   * 取词函数(一位小数四舍五入到 0 时不出「+0.0%」,出「持平」;Frank 2026-09-10「这个显示有什么意义」)。
   */
  t: TFn
}

/**
 * `yoyClsOf` 的入参。
 */
export type YoyClsIn = {
  /**
   * 同比格;null 给空串。
   */
  cell: MacroCell | null

  /**
   * 指标键(在 MACRO_BAD_UP_KEYS 里的反色)。
   */
  key: string
}

/**
 * `yearNotesOf` 的入参。
 */
export type YearNotesIn = {
  /**
   * 行。
   */
  rows: MacroRow[]

  /**
   * 年份列。
   */
  years: string[]
}

/**
 * `yearNoteOf` 的入参。
 */
export type YearNoteIn = {
  /**
   * 年 → 列头灰注。
   */
  yearNotes: Record<string, string>

  /**
   * 年。
   */
  year: string
}

/**
 * `yearColLabelOf` 的入参。
 */
export type YearColLabelIn = {
  /**
   * 年。
   */
  year: string

  /**
   * 列头灰注;空串就只写年。
   */
  note: string
}

/**
 * `yoyLabelOf` 的入参。
 */
export type YoyLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 同比年;空串给空串。
   */
  year: string

}

/**
 * `allocCellsOf` 的入参。
 */
export type AllocCellsIn = {
  /**
   * 单列配额格(年 → 格)。
   */
  single: Record<string, MacroCell>

  /**
   * 合并配额格(年 → 格;官方不拆的年份)。
   */
  incl: Record<string, MacroCell>

  /**
   * 「含 AIP」灰注文案。
   */
  note: string
}

/**
 * `quotaUsedCellsOf` 的入参。
 */
export type UseRateIn = {
  /**
   * 配额格(年 → 格)。
   */
  alloc: Record<string, MacroCell>

  /**
   * 已发格(年 → 格)。
   */
  issued: Record<string, MacroCell>
}

/**
 * `IndCards` 的入参。
 */
export type IndCardsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 指标表。
   */
  geo: MacroGeo

  /**
   * 要显示的行。
   */
  rows: MacroRow[]
}

/**
 * `macroColsOf` 的入参。
 */
export type MacroColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 年份列。
   */
  years: string[]

  /**
   * 同比列名;空串不出这列。
   */
  yoyLabel: string

  /**
   * 首列列名(「地区」或「指标」,由建表方定)。
   */
  keyLabel: string

  /**
   * 年 → 列头共用灰注(空串 = 灰注留在格里)。
   */
  yearNotes: Record<string, string>

  /**
   * 推荐列名;空串不出这列。
   */
  recLabel: string
}

/**
 * 通用表格序列能力要的文案(桶不携词,由本域取词后传入)。
 */
export type SeriesWords = {
  /**
   * 「表」。
   */
  table: string

  /**
   * 「趋势」。
   */
  chart: string

  /**
   * 「近 5 年」。
   */
  recent: string

  /**
   * 「近 10 年」。
   */
  more: string

  /**
   * 「全部」。
   */
  all: string

  /**
   * 指数说明。
   */
  indexNote: string
}

/**
 * `MacroSection` 的入参。
 */
export type MacroSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * ETL 心跳。
   */
  updatedAt: string

  /**
   * 招聘对比:数据还没到。
   */
  jobsLoading: boolean

  /**
   * 招聘对比行。
   */
  jobsRows: JobsRow[]

  /**
   * 「按指标」视图的指标表(PR 不在其列,单独一段)。
   */
  indGeos: MacroGeo[]

  /**
   * 宏观两份还在路上(SSR 瘦身批:指标表区渲占位)。
   */
  indLoading: boolean
}

/**
 * `PrSection` 的入参(2026-09-10 PR 自省份段拆出成段)。
 */
export type PrSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * ETL 心跳。
   */
  updatedAt: string

  /**
   * 每地区一张小表(全国 + 九省)。
   */
  prGeos: MacroGeo[]

  /**
   * 宏观两份还在路上(渲占位)。
   */
  loading: boolean
}

/**
 * `MacroBlock` 的入参。
 */
export type MacroBlockIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 地区块。
   */
  geo: MacroGeo

  /**
   * 数据更新时刻(ISO;2026-09-11 Frank「这个更新时间要紧贴在表格上面,说了多少遍」:
   * 09-10 评估批收回段首一枚是违规,退回 09-03 铁律「表右上角 Updated」—— 每表标题行右侧一枚)。
   */
  updatedAt: string

  /**
   * 不是段内第一块时加块间距(照职业段行业表的 boardGap)。
   */
  gap: boolean
}

/**
 * 地区名单元格读的三格(招聘对比的省份列;`ProvNameCell`)。
 */
export type GeoNameRow = {
  /**
   * 通行短名。
   */
  name: string

  /**
   * 地区码。
   */
  code: string

  /**
   * 译名(英文界面空串)。
   */
  localeName: string
}

/**
 * 招聘对比横表的一行(一省)。
 */
export type JobsRow = {
  /**
   * 行身份 = 省码。
   */
  key: string

  /**
   * 通行短名。
   */
  name: string

  /**
   * 省码。
   */
  code: string

  /**
   * 译名。
   */
  localeName: string

  /**
   * 全名(排序键)。
   */
  nameSort: string

  /**
   * 在招职位文案(看岗位三格 2026-09-12 Frank「这两列 删了」再撤最高时薪与看岗位:省级最高=典型岗官方带上端的中位,读成极值误导;近 30 天只按省查岗位仅占 5%)。
   */
  openText: string

  /**
   * 在招职位排序键。
   */
  openSort: number | null

  /**
   * 近 7 天发布文案。
   */
  new7Text: string

  /**
   * 近 7 天发布排序键。
   */
  new7Sort: number | null

  /**
   * 最低时薪文案(ESDC 官方工资带下端;2026-09-11 Frank「中位时薪,最低时薪 最高时薪」——
   * 原中位年薪一列换时薪三列;AIP 岗与操作两列 2026-09-10「这两列 删掉」撤)。
   */
  wageLowText: string

  /**
   * 最低时薪排序键。
   */
  wageLowSort: number | null

  /**
   * 中位时薪文案。
   */
  wageMedText: string

  /**
   * 中位时薪排序键。
   */
  wageMedSort: number | null

  /**
   * 中位年薪文案(ESDC;2026-09-12 Frank「加一个中位年薪」)。
   */
  wageYrText: string

  /**
   * 中位年薪排序键。
   */
  wageYrSort: number | null
}

/**
 * `toJobsRows` 的入参。
 */
export type JobsRowsIn = {
  /**
   * 省 × 大类汇总行(broad=all)。
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
}

/**
 * `toJobsRow` 的入参。
 */
export type JobsRowIn = {
  /**
   * 这一行。
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
}

/**
 * `jobsColsOf` 的入参。
 */
export type JobsColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `JobsSection` 的入参。
 */
export type JobsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 数据还没到。
   */
  loading: boolean

  /**
   * 行。
   */
  rows: JobsRow[]

  /**
   * 上面有地区块时加块间距。
   */
  gap: boolean
}

/**
 * `JobsCard` 的入参。
 */
export type JobsCardIn = {
  /**
   * 这一行。
   */
  row: JobsRow

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `geoNameOf` 的入参。
 */
export type GeoNameIn = {
  /**
   * 地区码。
   */
  code: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(省名单一显示名按它挑词)。
   */
  lang: string
}

/**
 * `opsCellsOf` 的入参。
 */
export type OpsCellsIn = {
  /**
   * 指标名清单(各省叫法不同)。
   */
  metrics: string[]

  /**
   * 该省的运营点。
   */
  ops: OpsPoint[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `macroKeyClsOf` 的入参。
 */
export type MacroKeyClsIn = {
  /**
   * 是不是「其中」缩进行。
   */
  sub: boolean
}

/**
 * `macroSeriesOf` 的入参。
 */
export type MacroSeriesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 地区块。
   */
  geo: MacroGeo
}

/**
 * 喂通用表格序列能力的声明(全格照抄 components/table 的 TableSeriesIn<MacroRow>;跨域形状本域自声明)。
 */
export type MacroSeriesSpec = {
  /**
   * 时间点列的 key(年份,升序)。
   */
  pointKeys: string[]

  /**
   * 取一行某年原值(通用表格契约两参)。
   */
  valueOf: (r: MacroRow, key: string) => number | null

  /**
   * 图例名。
   */
  labelOf: (r: MacroRow) => string

  /**
   * 趋势态画的行(滤掉「其中」缩进行;照通用表格契约)。
   */
  chartRows: MacroRow[]

  /**
   * 视图 / 年窗切换的通知回调(埋点 pulse-series;照通用表格契约)。
   */
  onSwitch: (kind: string) => void

  /**
   * 「近 N 期」默认显示几列。
   */
  recent: number

  /**
   * 「近 M 期」显示几列。
   */
  more: number

  /**
   * 趋势图画指数还是原值(照 geo.indexed)。
   */
  indexed: boolean

  /**
   * 工具条与图的文案。
   */
  words: SeriesWords
}

/**
 * `monTextOf` 的入参。
 */
export type MonTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 期键(YYYY-MM 或 YYYY-MM-DD)。
   */
  period: string
}
