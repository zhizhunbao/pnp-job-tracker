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
import type { CityRow, DailyRow, OccRow, ProvExtra, StatRow } from '@/lib/stats'
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
 * 省卡 IRCC 体量里能取的那四格。
 */
export type ProvInfoKey = 'study' | 'tfwp' | 'imp' | 'pnpPr'

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
   * 逐日 × 大类的在招量(趋势段:全国线 + 行业小图)。
   */
  daily: DailyRow[]

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
 * `provPresetOf` 的入参。
 */
export type ProvPresetIn = {
  /**
   * 当前会话用户;null = 匿名。
   */
  user: StartUser | null
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
   * SSR 每表带几行。
   */
  ssrRows: number

  /**
   * 职业统计行(中间两卡与分类映射的原料)。
   */
  occRows: OccRowList

  /**
   * 逐日 × 大类的在招量。
   */
  dailyRows: DailyRow[]

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
 * `provCardClsOf` 的入参。
 */
export type ProvCardClsIn = {
  /**
   * 是不是当前省。
   */
  on: boolean
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
   * 雇主段的行业分表(按当前身份档算好)。
   */
  empSecs: EmpSec[]

  /**
   * 雇主段的三试点指定雇主表。
   */
  pilotSecs: EmpSec[]

  /**
   * 当前身份档。
   */
  empKind: EmpKind

  /**
   * 切身份档的手柄工厂。
   */
  kindPickOf: KindPickFn

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 分省概览的行。
   */
  provRows: StatRowList

  /**
   * 当前省的统计行;null = 还没到或没有。
   */
  provStat: StatRowOne | null

  /**
   * 当前省的职业榜;null = 还没到。
   */
  provOcc: OccRowList | null

  /**
   * 当前省码。
   */
  prov: string

  /**
   * 省下拉的换值手柄。
   */
  onProvSelect: SelectChangeFn

  /**
   * 省卡的点击手柄工厂。
   */
  provPickOf: ProvPickFn

  /**
   * 城市段的行(按在招排);null = 主图数据还没到。
   */
  cityRows: CityRow[] | null

  /**
   * 趋势段:全国线 + 行业小图;null = 逐日数据不够画。
   */
  trend: TrendPanel | null



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
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   * 挂在分区标题行右槽 —— 桌面表与手机卡是同一份数据的两副面孔,整区一枚。
   */
  updatedAt: string

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
 * ProvOccSection(S4b 省内职业榜)的 props。2026-09-04:分布探索图撤出把脉页,market 格随之撤。
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
   * 当前省码。
   */
  prov: string

  /**
   * 省下拉的换值手柄。
   */
  onProvSelect: SelectChangeFn

  /**
   * 省胶囊的点击手柄工厂。
   */
  provPickOf: ProvPickFn

  /**
   * 当前省的统计行;null = 还没到或没有。
   */
  provStat: StatRowOne | null

  /**
   * 当前省的职业榜;null = 还没到。
   */
  provOcc: OccRowList | null

  /**
   * NOC → 可提名省份清单。
   */
  nocProvs: NocProvsMap

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
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
 * 身份档:没工签 / PGWP 或工签(2026-09-05 Frank「雇主需要按身份筛」;学签在读档等兼职与 co-op 数据到位再开)。
 */
export type EmpKind = 'nowp' | 'pgwp'

/**
 * 雇主表的表种:两个身份档的行业表,或三试点指定雇主表(列集各自不同)。
 */
export type EmpTableKind = EmpKind | 'pilot'

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
   * 公司简介(有就显,没有给 DASH_MARK;2026-09-05 Frank「需要一个单独的列来解释公司业务」)。
   */
  brief: string

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
   * 雇主门槛判定文案(达标 / 差 X / 待核 / 公共部门)。
   */
  verdictText: string

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
 * 趋势段的一条线(全国,或一个行业组)。
 */
export type TrendSeries = {
  /**
   * 线的键(BROAD_ALL 或行业组键)。
   */
  key: string

  /**
   * 标题(已取词)。
   */
  title: string

  /**
   * 横轴日期(YYYY-MM-DD,升序)。
   */
  dates: string[]

  /**
   * 逐日在招量,与 dates 等长。
   */
  values: number[]

  /**
   * 最新一日的在招量文案。
   */
  lastText: string
}

/**
 * 趋势段:全国一条线 + 行业小图。
 */
export type TrendPanel = {
  /**
   * 全国线。
   */
  nat: TrendSeries

  /**
   * 行业线(按 IND_KEYS 序;点数不足的组不出)。
   */
  inds: TrendSeries[]
}

/**
 * 日期 → 在招量的累加器。
 */
export type DateSum = Map<string, number>

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
   * 身份档(决定入选口径、把脉规则与排序)。
   */
  kind: EmpKind

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
 * `trendOf` 的入参。
 */
export type TrendOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 逐日 × 大类的在招量。
   */
  daily: DailyRow[]
}

/**
 * `lineOptionOf` 的入参。
 */
export type LineOptionIn = {
  /**
   * 这条线。
   */
  s: TrendSeries

  /**
   * 是不是行业小图(小图不出坐标轴)。
   */
  small: boolean
}

/**
 * `toCityCellRows` 的入参。
 */
export type CityCellRowsIn = {
  /**
   * 城市统计行。
   */
  rows: CityRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(城市译名按语言取)。
   */
  lang: StartLang
}

/**
 * 城市卡的展示行。
 */
export type CityCellRow = {
  /**
   * 行键(城市 + 省)。
   */
  key: string

  /**
   * 城市名(界面语言有译名用译名,否则英文)。
   */
  name: string

  /**
   * 省全名。
   */
  provName: string

  /**
   * 省码(灰字小注)。
   */
  provCode: string

  /**
   * 在招数文案。
   */
  openText: string

  /**
   * 近 7 天新增文案;没有给 DASH_MARK。
   */
  new7Text: string

  /**
   * 中位年薪文案;没有给 DASH_MARK。
   */
  wageText: string

  /**
   * 紧缺清单岗文案;没有给 DASH_MARK。
   */
  namedText: string

  /**
   * 点卡落到职位板按城市筛。
   */
  href: string
}

/**
 * EmpSection(雇主段:行业各一表,子标题下身份胶囊)的 props。
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
   * 行业分表(已按当前身份档算好)。
   */
  secs: EmpSec[]

  /**
   * 三试点指定雇主表(AIP / RCIP / FCIP,在招的;不分档不分行业)。
   */
  pilotSecs: EmpSec[]

  /**
   * 当前身份档。
   */
  kind: EmpKind

  /**
   * 切身份档的手柄工厂。
   */
  kindPickOf: KindPickFn
}

/**
 * EmpBoardSec(一张雇主分表:子标题 + 身份胶囊行 + 表)的 props。
 */
export type EmpBoardSecIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张表。
   */
  sec: EmpSec

  /**
   * 当前身份档。
   */
  kind: EmpKind

  /**
   * 切身份档的手柄工厂。
   */
  kindPickOf: KindPickFn

  /**
   * 出不出身份胶囊(行业表出,试点表不出)。
   */
  chips: boolean

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
 * CitySection(城市段)的 props。
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

  /**
   * 城市统计行(按在招排);null = 主图数据还没到。
   */
  rows: CityRow[] | null
}

/**
 * CityCard(城市卡)的 props。
 */
export type CityCardIn = {
  /**
   * 取词函数(卡内四行键值的键)。
   */
  t: TFn

  /**
   * 这一行。
   */
  row: CityCellRow
}

/**
 * TrendSection(趋势段)的 props。
 */
export type TrendSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string

  /**
   * 全国线 + 行业小图;null = 数据不够画,段整块不出。
   */
  trend: TrendPanel | null
}

/**
 * TrendCard(一条趋势线的卡:标题 + 最新值 + 图)的 props。
 */
export type TrendCardIn = {
  /**
   * 这条线。
   */
  s: TrendSeries

  /**
   * 是不是行业小图。
   */
  small: boolean
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
 * `trendCardClsOf` / `trendHeightOf` 的入参。
 */
export type TrendSmallIn = {
  /**
   * 是不是行业小图。
   */
  small: boolean
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
 * `seriesOf` 的入参。
 */
export type SeriesIn = {
  /**
   * 逐日 × 大类的在招量。
   */
  daily: DailyRow[]

  /**
   * 要加总的大类清单(全国线给 [BROAD_ALL])。
   */
  broads: string[]

  /**
   * 线的键。
   */
  key: string

  /**
   * 标题(已取词)。
   */
  title: string
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
   * 身份档。
   */
  kind: EmpKind

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
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null

  /**
   * 界面语言。
   */
  lang: StartLang

  /**
   * 当前身份档。
   */
  kind: EmpKind
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
   * 主图四份数据;null = 还没到。
   */
  market: MarketData | null

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
 * 切身份档的手柄工厂(每个胶囊一只)。
 */
export type KindPickFn = (k: EmpKind) => ClickFn

/**
 * `makeKindPick` 的入参。
 */
export type KindPickIn = {
  /**
   * 落身份档。
   */
  setKind: (k: EmpKind) => void
}

/**
 * IdChips(身份胶囊行)的 props。
 */
export type IdChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前身份档。
   */
  kind: EmpKind

  /**
   * 切身份档的手柄工厂。
   */
  kindPickOf: KindPickFn
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
 * 身份胶囊一枚(键是两档字面量之一,切档工厂直接吃)。
 */
export type KindChip = {
  /**
   * 身份档键。
   */
  key: EmpKind

  /**
   * 胶囊文案。
   */
  text: string
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
