/**
 * stats 域(就业把脉统计主图)的形状:对外的两件契约(取数钩子的返回、主图 props)、
 * 域内四件视图的 props、echarts 接缝的三种回调形状,以及 functions 里每个函数的入参。
 * 三张库行(职业行 / 城市行 / 统计行)与 echarts 实例**不重抄** —— 前者是 lib/stats
 * 的引擎契约且**对外 API 不许变**(/start 的 Pulse 把 rows 直接赋给 lib 的 StatRow,
 * 少声明一格当场 tsc 红),后者的方法表归 echarts 维护;两条各走一行特批 import type,
 * 特批牌形态同 companies/types.ts。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
// eslint-disable-next-line local/no-import-in-leaf -- lib/stats 的引擎契约,对外 API 不许变;重抄必脱节,牌形同 companies/types.ts
import type { CityRow, OccRow, StatRow } from '@/lib/stats'
// eslint-disable-next-line local/no-import-in-leaf -- echarts 实例的形状由库定死(init 的返回值),自抄一份等于替库维护它的方法表
import type { EChartsCoreOption, EChartsType } from 'echarts'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * echarts 实例(本域只用到 setOption / resize / clear / dispose / on 五个方法)。
 */
export type ChartInst = EChartsType

/**
 * 交给 echarts 的 option(它自己的顶层形状:具名几格 + 一条什么都收的索引签名;
 * 各段由本域的 xxxOf 拼出来,不替库抄一份完整形状)。
 */
export type ChartOption = EChartsCoreOption

/**
 * 屏幕朝向的锁定接口。TS 的 lib.dom 只声明了 unlock,没有 lock(它还没进标准)——
 * 这一格本域自己声明:Android Chrome 有它、iOS Safari 没有,所以是可选的。
 */
export type OrientLock = {
  /**
   * 锁定屏幕朝向;缺席 = 这个浏览器没有这个能力。
   */
  lock?: (orientation: string) => Promise<void>
}

/**
 * 通道清单(职业粒度判得了的两条:省提名具名清单与联邦 EE 类别)。
 */
export type ChannelNocs = {
  /**
   * 省提名具名清单里的 NOC 码。
   */
  pnp: string[]

  /**
   * 联邦 EE 类别里的 NOC 码。
   */
  ee: string[]
}

/**
 * 主图要的四份数据(一次接口拉回)。null=加载中(调用侧渲占位高度防 CLS);
 * 失败/缺表回空数组 → 调用侧整节不渲(红线:查不到不出空壳)。
 */
export type MarketData = {
  /**
   * 按职业的统计行(含各省行与全国行)。
   */
  occ: OccRow[]

  /**
   * 按城市的统计行。
   */
  city: CityRow[]

  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 两条通道的职业清单。
   */
  channels: ChannelNocs
}

/**
 * 横轴档:按职业 / 按省份 / 按城市。
 */
export type XKey = 'occ' | 'prov' | 'city'

/**
 * 簇内分组档:不分 / 按省 / 按大类 / 按 TEER。
 */
export type GroupKey = 'none' | 'prov' | 'broad' | 'teer'

/**
 * 右轴档:官方中位年薪 / 帖面中位 / 不显示。
 */
export type Y2Key = 'wage' | 'posted' | 'off'

/**
 * 排序主键:岗位数 / 中位年薪。
 */
export type SortBy = 'jobs' | 'med'

/**
 * 排序方向。
 */
export type SortDir = 'desc' | 'asc'

/**
 * 通道筛选档。
 */
export type ChanKey = 'all' | 'pnp' | 'ee'

/**
 * 一列中位年薪(每个类目一格;null = 这一格没有可信的中位数)。
 */
export type MedList = (number | null)[]

/**
 * 一列文本(null = 这一格不该出 tooltip,如簇之间那格空位)。
 */
export type MaybeTexts = (string | null)[]

/**
 * 一个下拉选项。
 */
export type SelectOpt = {
  /**
   * 选项的值(提交给 onChange 的那一个)。
   */
  value: string

  /**
   * 选项的显示名。
   */
  label: string

  /**
   * 置灰(退化组合仍然列出来但点不动 —— 让人看得见有这一档,只是此刻不成立)。
   */
  disabled?: boolean
}

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

/**
 * 下拉换值的手柄(签名由 React 的合成事件定死)。
 */
export type SelectChangeFn = (e: React.ChangeEvent<HTMLSelectElement>) => void

/**
 * 搜索框换值的手柄(search 域交回的是词本身,不是事件)。
 */
export type TextChangeFn = (v: string) => void

/**
 * 副作用的清理函数(effect 返回的那一只)。
 */
export type CleanupFn = () => void

/**
 * 无清理的副作用体。
 */
export type EffectFn = () => void

/**
 * 带清理的副作用体。
 */
export type CleanupEffectFn = () => CleanupFn

/**
 * 柱子被点时交回第几个类目(下钻用;主图目前不挂,留着是 EChart 壳的通用契约)。
 */
export type ChartClickFn = (dataIndex: number) => void

/**
 * echarts 点击事件里本壳唯一要读的那一格(形状由 echarts 定死)。
 */
export type ChartClickEvent = {
  /**
   * 被点的是第几个类目。
   */
  dataIndex: number
}

/**
 * tooltip formatter 收到的一项 —— 形状由 echarts 定死,只声明合成那一行时真读的三格。
 */
export type TipItem = {
  /**
   * 这一项来自哪种系列(柱还是线)。
   */
  seriesType: string

  /**
   * 这一项的值;空格(簇间距、没数的省)是 null。
   */
  value: number | null

  /**
   * 这一项落在第几个类目。
   */
  dataIndex: number
}

/**
 * tooltip 的合成函数(签名由 echarts 定死:收整条类目的各项,回一段 HTML)。
 */
export type TipFormatterFn = (items: TipItem[]) => string

/**
 * 横轴标签的出没判定(签名由 echarts 的 axisLabel.interval 定死:第几格 → 出不出)。
 */
export type LabelIntervalFn = (index: number) => boolean

/**
 * 右轴刻度的格式化(签名由 echarts 的 axisLabel.formatter 定死)。
 */
export type MoneyAxisLabelFn = (v: number) => string

/**
 * 图容器的 ref(全屏时要拿它去要全屏,画图时要拿它当画布)。
 */
export type BoxRef = React.RefObject<HTMLDivElement | null>

/**
 * echarts 实例的 ref(一个壳只 init 一次,后续只换 option)。
 */
export type InstRef = React.RefObject<ChartInst | null>

/**
 * 点击回调的 ref(init 只绑一次,回调随渲染更新 —— 转发靠它)。
 */
export type ClickRef = React.RefObject<ChartClickFn | null>

/**
 * 取消令牌:异步拉起 echarts 的过程里组件可能已经卸载,拿它当「还活着吗」的一格。
 */
export type AliveToken = {
  /**
   * 还活着吗(清理函数把它写 false)。
   */
  alive: boolean
}

/**
 * 一个职业在一个省的两个数。
 */
export type ProvCell = {
  /**
   * 在招岗位数。
   */
  jobs: number

  /**
   * 中位年薪(取哪一档随右轴档走);null = 这一格没有可信的中位数。
   */
  med: number | null
}

/**
 * 职业 → 省 → 两个数(分省形态查表用)。
 */
export type ProvCellMap = Map<string, Map<string, ProvCell>>

/**
 * 分省形态下按格摊平的四列(一个类目 = 一根柱,每组末尾插一格簇间距)。
 */
export type ProvCells = {
  /**
   * 横轴每一格的标签(职业名只标在本组中间那格,其余是空串)。
   */
  axis: string[]

  /**
   * 横轴每一格的中位年薪。
   */
  med: MedList

  /**
   * 横轴每一格的 tooltip 抬头(「职业　省」);null = 簇间距那格。
   */
  cellTitles: MaybeTexts

  /**
   * 每个省一列柱高(本省那一格有数,其余格是 null 让位)。
   */
  data: MedList[]
}

/**
 * 一张图画什么:轴、系列、中位线与首屏窗。四种横轴形态各产一份。
 */
export type MarketBody = {
  /**
   * 横轴各格的标签。
   */
  axis: string[]

  /**
   * 柱系列(不分组时一条,分组时一组一条)。
   */
  series: object[]

  /**
   * 中位年薪那一列数。
   */
  med: MedList

  /**
   * 分省形态特有的中位线系列;空数组 = 不是分省形态。
   */
  provMed: object[]

  /**
   * 分省形态下每格的 tooltip 抬头;空数组 = 不是分省形态。
   */
  cellTitles: MaybeTexts

  /**
   * dataZoom 初窗的右端(百分比)。
   */
  end: number
}

/**
 * 只收一份职业行清单的入参(全国行筛选、大类选项都用它)。
 */
export type OccListIn = {
  /**
   * 按职业的统计行(含各省行与全国行)。
   */
  occ: OccRow[]
}

/**
 * uniqOf 的入参。
 */
export type TextListIn = {
  /**
   * 待去重排序的文本清单(空串会被剔掉)。
   */
  list: string[]
}

/**
 * midOptsOf 的入参。
 */
export type MidOptsIn = {
  /**
   * 全国职业行。
   */
  natl: OccRow[]

  /**
   * 已选的大类;'' = 未选(中类列全部)。
   */
  broad: string
}

/**
 * fineOptsOf 的入参。
 */
export type FineOptsIn = {
  /**
   * 全国职业行。
   */
  natl: OccRow[]

  /**
   * 已选的大类;'' = 未选。
   */
  broad: string

  /**
   * 已选的中类;'' = 未选。
   */
  mid: string
}

/**
 * occNameOf 的入参。
 */
export type OccNameIn = {
  /**
   * 一行职业统计。
   */
  occ: OccRow

  /**
   * 当前界面语言。
   */
  lang: string
}

/**
 * cityNameOf 的入参。
 */
export type CityNameIn = {
  /**
   * 一行城市统计。
   */
  city: CityRow

  /**
   * 当前界面语言。
   */
  lang: string
}

/**
 * provLabelOf 的入参。
 */
export type ProvLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  prov: string
}

/**
 * provAtOf 的入参。
 */
export type ProvAtIn = {
  /**
   * 第几个省(按 PROVS 的展示序)。
   */
  index: number
}

/**
 * medPickOf 的入参。
 */
export type MedPickIn = {
  /**
   * 当前右轴档。
   */
  y2: Y2Key

  /**
   * 官方中位年薪;null = 官方这一格没有数。
   */
  medWage: number | null

  /**
   * 帖面中位年薪;null = 本站这一格没有数。
   */
  medPost: number | null

  /**
   * 帖面样本量;null = 没统计到。
   */
  sampleN: number | null
}

/**
 * 接口回的原始形状(线格式:每一格都可能缺席;整份也可能是 null)。
 */
export type MarketJson = {
  /**
   * 按职业的统计行;缺席 = 这次没回这一份。
   */
  occ?: OccRow[]

  /**
   * 按城市的统计行;缺席 = 这次没回这一份。
   */
  city?: CityRow[]

  /**
   * 按省 × 大类的统计行;缺席 = 这次没回这一份。
   */
  rows?: StatRow[]

  /**
   * 两条通道的职业清单;缺席 = 这次没回这一份。
   */
  channels?: ChannelNocs
} | null

/**
 * toMarketData 的入参。
 */
export type ToMarketDataIn = {
  /**
   * 接口回的 json。
   */
  json: MarketJson
}

/**
 * fetchMarket 的入参。
 */
export type FetchMarketIn = {
  /**
   * 四份数据的落格。
   */
  setData: (v: MarketData) => void

  /**
   * 取消器(组件卸载时中断这次请求)。
   */
  ctrl: AbortController
}

/**
 * tipFormatterOf / intervalOf 这类「按形态决定要不要造回调」的入参。
 */
export type BodySpanIn = {
  /**
   * 一张图画什么。
   */
  body: MarketBody

  /**
   * 一个组占几格。
   */
  span: number
}

/**
 * firstBarOf / firstLineOf 的入参。
 */
export type TipItemsIn = {
  /**
   * tooltip 收到的整条类目各项。
   */
  items: TipItem[]
}

/**
 * tipHeadOf 的入参。
 */
export type TipHeadIn = {
  /**
   * 每格的 tooltip 抬头。
   */
  cellTitles: MaybeTexts

  /**
   * 这一格的柱;null = 这一格没有柱。
   */
  bar: TipItem | null

  /**
   * 这一格的线;null = 这一格没有线。
   */
  line: TipItem | null
}

/**
 * tipJobsOf 的入参。
 */
export type TipJobsIn = {
  /**
   * 这一格的柱;null = 这一格没有柱。
   */
  bar: TipItem | null

  /**
   * 岗位数那一段的词。
   */
  label: string
}

/**
 * tipMedOf 的入参。
 */
export type TipMedIn = {
  /**
   * 这一格的线;null = 这一格没有线。
   */
  line: TipItem | null

  /**
   * 中位年薪那一段的词。
   */
  medName: string
}

/**
 * provSeriesOf 的入参。
 */
export type ProvSeriesIn = {
  /**
   * 四种形态共用的那份入参。
   */
  body: BodyIn

  /**
   * 已排好的省序。
   */
  ps: string[]
}

/**
 * statJobsOf / provMedOf 这类「先查行再读格」的入参。
 */
export type StatRowIn = {
  /**
   * 一行统计;null = 没这个组合。
   */
  cell: StatRow | null

  /**
   * 当前右轴档(只有取中位数那一支要它)。
   */
  y2: Y2Key
}

/**
 * statJobsOf 的入参。
 */
export type StatJobsIn = {
  /**
   * 一行统计;null = 没这个组合。
   */
  cell: StatRow | null
}

/**
 * provCellAtOf 的入参。
 */
export type ProvCellAtIn = {
  /**
   * 职业 → 省 → 两个数。
   */
  cells: ProvCellMap

  /**
   * NOC 码。
   */
  noc: string

  /**
   * 两位省码。
   */
  prov: string
}

/**
 * cellJobsOf / cellMedOf 的入参。
 */
export type ProvCellIn = {
  /**
   * 一格「某职业某省」的两个数;null = 这个组合没有数据。
   */
  cell: ProvCell | null
}

/**
 * pushRowOf 的入参。
 */
export type PushRowIn = {
  /**
   * 每个省一列柱高。
   */
  data: MedList[]

  /**
   * 这一格属于第几个省;-1 = 簇间距那一格(每列都推 null)。
   */
  at: number

  /**
   * 这一格的柱高。
   */
  value: number
}

/**
 * cellLabelOf 的入参。
 */
export type CellLabelIn = {
  /**
   * 职业名。
   */
  name: string

  /**
   * 这一格属于第几个省。
   */
  at: number

  /**
   * 本组中间是第几个。
   */
  mid: number
}

/**
 * wordHitOf 的入参。
 */
export type WordHitIn = {
  /**
   * 一行职业统计。
   */
  occ: OccRow

  /**
   * 当前界面语言。
   */
  lang: string

  /**
   * 搜索词(已转小写);'' = 不筛。
   */
  keyword: string
}

/**
 * chanHitOf 的入参。
 */
export type ChanHitIn = {
  /**
   * 一行职业统计。
   */
  occ: OccRow

  /**
   * 通道筛选档。
   */
  chan: ChanKey

  /**
   * 省提名具名清单的 NOC 集。
   */
  pnpSet: Set<string>

  /**
   * 联邦 EE 类别的 NOC 集。
   */
  eeSet: Set<string>
}

/**
 * broadOptsOf 的入参。
 */
export type NatlOccIn = {
  /**
   * 全国职业行。
   */
  natl: OccRow[]
}

/**
 * broadSelectOptsOf 的入参。
 */
export type BroadSelectOptsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 大类名清单。
   */
  list: string[]
}

/**
 * numOptsOf 的入参。
 */
export type NumListIn = {
  /**
   * 数字清单。
   */
  list: number[]
}

/**
 * numOrZeroOf 的入参:库里可空的计数,读的时候要一个数。
 */
export type NumOrZeroIn = {
  /**
   * 计数;null = 库里这一格没有数。
   */
  value: number | null
}

/**
 * palAtOf 的入参。
 */
export type PalAtIn = {
  /**
   * 第几条系列(超过轮盘长度就取模绕回)。
   */
  index: number
}

/**
 * windowEndOf 的入参:首屏要露几格 ÷ 一共几格 = dataZoom 初窗的右端。
 */
export type WindowEndIn = {
  /**
   * 首屏要露几格。
   */
  visible: number

  /**
   * 横轴一共几格。
   */
  total: number
}

/**
 * moneyTextOf 的入参。
 */
export type MoneyIn = {
  /**
   * 年薪(加元)。
   */
  value: number
}

/**
 * medNameOf 的入参。
 */
export type MedNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前右轴档。
   */
  y2: Y2Key
}

/**
 * nullLastOf 的入参。
 */
export type NullLastIn = {
  /**
   * 左边那个排序键;null = 这一行没有可比的数。
   */
  left: number | null

  /**
   * 右边那个排序键;null = 这一行没有可比的数。
   */
  right: number | null

  /**
   * 排序方向。
   */
  dir: SortDir
}

/**
 * occSortKeyOf 的入参。
 */
export type OccSortKeyIn = {
  /**
   * 一行职业统计。
   */
  occ: OccRow

  /**
   * 排序主键。
   */
  sortBy: SortBy

  /**
   * 当前右轴档(按中位排序时取哪一档随它走)。
   */
  y2: Y2Key
}

/**
 * citySortKeyOf 的入参。
 */
export type CitySortKeyIn = {
  /**
   * 一行城市统计。
   */
  city: CityRow

  /**
   * 排序主键。
   */
  sortBy: SortBy

  /**
   * 当前右轴档。
   */
  y2: Y2Key
}

/**
 * statCellOf 的入参。
 */
export type StatCellIn = {
  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * 大类名;'all' = 该省全大类那一行。
   */
  broad: string
}

/**
 * provSortKeyOf 的入参。
 */
export type ProvSortKeyIn = {
  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * 排序主键。
   */
  sortBy: SortBy

  /**
   * 当前右轴档(按中位排序时取哪一档随它走 —— 2026-08-28 修 bug 后三条轴同一语义)。
   */
  y2: Y2Key
}

/**
 * occHitOf 的入参:一行职业过不过当前那套筛选。
 */
export type OccHitIn = {
  /**
   * 一行职业统计。
   */
  occ: OccRow

  /**
   * 当前界面语言(搜索要拿显示名比)。
   */
  lang: string

  /**
   * 搜索词(已 trim 并转小写);'' = 不筛。
   */
  keyword: string

  /**
   * 最低在招岗数。
   */
  minJobs: number

  /**
   * 已选大类;'' = 不筛。
   */
  broad: string

  /**
   * 已选中类;'' = 不筛。
   */
  mid: string

  /**
   * 已选小类;'' = 不筛。
   */
  fine: string

  /**
   * 通道筛选档。
   */
  chan: ChanKey

  /**
   * 省提名具名清单的 NOC 集。
   */
  pnpSet: Set<string>

  /**
   * 联邦 EE 类别的 NOC 集。
   */
  eeSet: Set<string>
}

/**
 * cityHitOf 的入参。
 */
export type CityHitIn = {
  /**
   * 一行城市统计。
   */
  city: CityRow

  /**
   * 搜索词(原样,未转小写 —— 中韩文名按原样含判)。
   */
  raw: string

  /**
   * 搜索词(已转小写 —— 英文名按小写含判);'' = 不筛。
   */
  keyword: string

  /**
   * 最低在招岗数。
   */
  minJobs: number
}

/**
 * legalGroupOf / groupOf 的入参。
 */
export type GroupOfIn = {
  /**
   * 当前横轴档。
   */
  xKey: XKey

  /**
   * 待判定的分组档。
   */
  group: GroupKey
}

/**
 * barOf / provBarOf 的入参。
 */
export type BarIn = {
  /**
   * 系列名(图例上那个词)。
   */
  name: string

  /**
   * 这条系列每个类目的柱高。
   */
  data: MedList

  /**
   * 第几条系列(配色按它取模轮盘)。
   */
  index: number
}

/**
 * medLineOf / provMedLineOf 的入参。
 */
export type MedLineIn = {
  /**
   * 线的名字(随右轴档走)。
   */
  name: string

  /**
   * 每个类目的中位年薪。
   */
  data: MedList
}

/**
 * 四种横轴形态共用的取数入参(哪一种由 marketBodyOf 按横轴档分派)。
 */
export type BodyIn = {
  /**
   * 按职业的统计行。
   */
  occ: OccRow[]

  /**
   * 按城市的统计行。
   */
  city: CityRow[]

  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: string

  /**
   * 当前横轴档。
   */
  xKey: XKey

  /**
   * 生效的分组档(退化组合已经被 groupOf 收成 none)。
   */
  group: GroupKey

  /**
   * 当前右轴档。
   */
  y2: Y2Key

  /**
   * 中位线的名字。
   */
  medName: string

  /**
   * 排序主键。
   */
  sortBy: SortBy

  /**
   * 排序方向。
   */
  sortDir: SortDir

  /**
   * 搜索词(原样,未 trim)。
   */
  query: string

  /**
   * 通道筛选档。
   */
  chan: ChanKey

  /**
   * 最低在招岗数。
   */
  minJobs: number

  /**
   * 已选大类。
   */
  fBroad: string

  /**
   * 已选中类。
   */
  fMid: string

  /**
   * 已选小类。
   */
  fFine: string

  /**
   * 省提名具名清单的 NOC 集。
   */
  pnpSet: Set<string>

  /**
   * 联邦 EE 类别的 NOC 集。
   */
  eeSet: Set<string>

  /**
   * 横轴=职业时首屏露几个职业。
   */
  firstScreen: number
}

/**
 * occSortedOf 的入参。
 */
export type OccSortedIn = {
  /**
   * 全国职业行。
   */
  natl: OccRow[]

  /**
   * 四种形态共用的那份入参(筛选与排序的每一格都在里面)。
   */
  body: BodyIn
}

/**
 * provCellMapOf 的入参。
 */
export type ProvCellMapIn = {
  /**
   * 按职业的统计行(要各省行,所以不能只拿全国行)。
   */
  occ: OccRow[]

  /**
   * 当前右轴档。
   */
  y2: Y2Key
}

/**
 * provCellsOf 的入参。
 */
export type ProvCellsIn = {
  /**
   * 已筛好排好的职业行。
   */
  ks: OccRow[]

  /**
   * 职业 → 省 → 两个数。
   */
  cells: ProvCellMap

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: string
}

/**
 * labelWidthOf 的入参。
 */
export type LabelWidthIn = {
  /**
   * 横轴一共几格。
   */
  axisLen: number

  /**
   * 一个组占几格(分省时 = 省数 + 1 的簇间距;其余形态是 1)。
   */
  span: number

  /**
   * dataZoom 初窗的右端(百分比)。
   */
  end: number
}

/**
 * makeTipFormatter 的入参。
 */
export type TipFormatterIn = {
  /**
   * 每格的 tooltip 抬头。
   */
  cellTitles: MaybeTexts

  /**
   * 岗位数那一段的词。
   */
  jobsLabel: string

  /**
   * 中位年薪那一段的词。
   */
  medName: string
}

/**
 * makeLabelInterval 的入参。
 */
export type LabelIntervalIn = {
  /**
   * 一个组占几格。
   */
  span: number

  /**
   * 组内第几格出标签(取组的中间那格)。
   */
  at: number
}

/**
 * tooltipOf 的入参。
 */
export type TooltipOfIn = {
  /**
   * 分省形态才有的合成函数;null = 用 echarts 默认的逐行铺法。
   */
  formatter: TipFormatterFn | null
}

/**
 * legendOf 的入参。
 */
export type LegendOfIn = {
  /**
   * 是不是多系列(单系列不出图例 —— 一条线的图例是废话)。
   */
  multi: boolean
}

/**
 * gridOf 的入参。
 */
export type GridOfIn = {
  /**
   * 是不是多系列(要给图例留高度)。
   */
  multi: boolean

  /**
   * 出不出右轴(要给薪资刻度留宽度)。
   */
  showMed: boolean
}

/**
 * xAxisOf 的入参。
 */
export type XAxisOfIn = {
  /**
   * 横轴各格的标签。
   */
  axis: string[]

  /**
   * 标签盒宽(px)。
   */
  labelW: number

  /**
   * 标签的出没判定;null = 每格都出(echarts 的 interval:0)。
   */
  interval: LabelIntervalFn | null
}

/**
 * yAxisOf 的入参。
 */
export type YAxisOfIn = {
  /**
   * 出不出右轴。
   */
  showMed: boolean
}

/**
 * dataZoomOf 的入参。
 */
export type DataZoomOfIn = {
  /**
   * 初窗的右端(百分比)。
   */
  end: number
}

/**
 * seriesOf 的入参。
 */
export type SeriesOfIn = {
  /**
   * 一张图画什么。
   */
  body: MarketBody

  /**
   * 出不出中位线。
   */
  showMed: boolean

  /**
   * 中位线的名字。
   */
  medName: string
}

/**
 * marketOptionOf 的入参。
 */
export type MarketOptionIn = {
  /**
   * 一张图画什么。
   */
  body: MarketBody

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 出不出中位线。
   */
  showMed: boolean

  /**
   * 中位线的名字。
   */
  medName: string
}

/**
 * pnpSetOf / eeSetOf 的入参。
 */
export type ChannelsIn = {
  /**
   * 两条通道的职业清单;缺席 = 调用方没给(两条都当空清单)。
   */
  channels?: ChannelNocs
}

/**
 * filterCountOf 的入参:「更多筛选」里改过几格(徽标上那个数)。
 */
export type FilterCountIn = {
  /**
   * 通道筛选档。
   */
  chan: ChanKey

  /**
   * 右轴档。
   */
  y2: Y2Key

  /**
   * 最低在招岗数。
   */
  minJobs: number

  /**
   * 已选大类。
   */
  fBroad: string

  /**
   * 已选中类。
   */
  fMid: string

  /**
   * 已选小类。
   */
  fFine: string
}

/**
 * makeXKeyChange 的入参。
 */
export type XKeySetIn = {
  /**
   * 横轴档的落格。
   */
  setXKey: (v: XKey) => void
}

/**
 * makeGroupChange 的入参。
 */
export type GroupSetIn = {
  /**
   * 分组档的落格。
   */
  setGroup: (v: GroupKey) => void
}

/**
 * makeY2Change 的入参。
 */
export type Y2SetIn = {
  /**
   * 右轴档的落格。
   */
  setY2: (v: Y2Key) => void
}

/**
 * makeSortByChange 的入参。
 */
export type SortBySetIn = {
  /**
   * 排序主键的落格。
   */
  setSortBy: (v: SortBy) => void
}

/**
 * makeSortDirPick 的入参。
 */
export type SortDirSetIn = {
  /**
   * 排序方向的落格。
   */
  setSortDir: (v: SortDir) => void
}

/**
 * makeChanChange 的入参。
 */
export type ChanSetIn = {
  /**
   * 通道筛选档的落格。
   */
  setChan: (v: ChanKey) => void
}

/**
 * makeBroadChange 的入参:选了大类,中小类一起清空(逐级收窄)。
 */
export type BroadSetIn = {
  /**
   * 大类的落格。
   */
  setFBroad: (v: string) => void

  /**
   * 中类的落格。
   */
  setFMid: (v: string) => void

  /**
   * 小类的落格。
   */
  setFFine: (v: string) => void
}

/**
 * makeMidChange 的入参:选了中类,小类清空。
 */
export type MidSetIn = {
  /**
   * 中类的落格。
   */
  setFMid: (v: string) => void

  /**
   * 小类的落格。
   */
  setFFine: (v: string) => void
}

/**
 * makeFineChange 的入参。
 */
export type FineSetIn = {
  /**
   * 小类的落格。
   */
  setFFine: (v: string) => void
}

/**
 * makeMinJobsChange 的入参。
 */
export type MinJobsSetIn = {
  /**
   * 最低在招岗数的落格。
   */
  setMinJobs: (v: number) => void
}

/**
 * makeMoreToggle 的入参。
 */
export type MoreToggleIn = {
  /**
   * 「更多筛选」现在开着没有。
   */
  more: boolean

  /**
   * 折叠态的落格。
   */
  setMore: (v: boolean) => void
}

/**
 * fsSupportedOf / enterFs 的入参:要全屏的那个元素。
 */
export type FsElIn = {
  /**
   * 要全屏的那个容器。
   */
  el: HTMLDivElement
}

/**
 * enterFs 的入参:元素 + 走不通时的兜底。
 */
export type EnterFsIn = {
  /**
   * 要全屏的那个容器。
   */
  el: HTMLDivElement

  /**
   * 原生全屏被浏览器拒了(Promise reject)时改走的伪全屏。
   */
  onFallback: ClickFn
}

/**
 * toggleFsAt 的入参。收的是**元素**不是 ref:渲染期把 ref 交给普通函数会被
 * react-hooks/refs 判成「渲染期读 ref」,所以读 ref 那一步留在 hooks 的事件手柄里
 * (手法同 tabs 的 useTabKeys.focusOf)。
 */
export type FsToggleAtIn = {
  /**
   * 要全屏的那个容器;null = 还没挂上(点了不做事)。
   */
  el: HTMLDivElement | null

  /**
   * 现在是不是**伪全屏**态(原生全屏那一路由 document.fullscreenElement 自己判)。
   */
  pseudo: boolean

  /**
   * 进伪全屏。
   */
  enterPseudo: ClickFn

  /**
   * 退伪全屏。
   */
  exitPseudo: ClickFn
}

/**
 * makeFsEnterPseudo / makeFsExitPseudo 的入参。
 */
export type PseudoSetIn = {
  /**
   * 伪全屏态的落格。
   */
  setPseudo: (v: boolean) => void

  /**
   * 全屏态的落格(两条路共用这一格,视图不必知道走的哪条)。
   */
  setFs: (v: boolean) => void

  /**
   * 视口高度的落格。
   */
  setVh: (v: number) => void
}

/**
 * fsBoxClsOf 的入参。
 */
export type PseudoIn = {
  /**
   * 现在是不是伪全屏态(是就给容器挂那层铺满视口的类)。
   */
  pseudo: boolean
}

/**
 * makeFsWatch 的入参。
 */
export type FsWatchIn = {
  /**
   * 要全屏的那个容器(判定「现在全屏的是不是我」)。
   */
  boxRef: BoxRef

  /**
   * 全屏态的落格。
   */
  setFs: (v: boolean) => void

  /**
   * 视口高度的落格(全屏时图撑满视口高)。
   */
  setVh: (v: number) => void
}

/**
 * makeMarketLoad 的入参。
 */
export type MarketLoadIn = {
  /**
   * 四份数据的落格。
   */
  setData: (v: MarketData) => void
}

/**
 * makeClickSync 的入参。
 */
export type ClickSyncIn = {
  /**
   * 点击回调的 ref。
   */
  clickRef: ClickRef

  /**
   * 这一渲染的点击回调;缺席 = 这张图不可点。
   */
  onBarClick?: ChartClickFn
}

/**
 * makeChartDraw 的入参。
 */
export type ChartDrawIn = {
  /**
   * 图容器的 ref。
   */
  boxRef: BoxRef

  /**
   * echarts 实例的 ref。
   */
  instRef: InstRef

  /**
   * 点击回调的 ref。
   */
  clickRef: ClickRef

  /**
   * 这一次要画的 option。
   */
  option: ChartOption
}

/**
 * drawInto 的入参(makeChartDraw 的异步真身)。
 */
export type DrawIntoIn = {
  /**
   * 图容器的 ref。
   */
  boxRef: BoxRef

  /**
   * echarts 实例的 ref。
   */
  instRef: InstRef

  /**
   * 点击回调的 ref。
   */
  clickRef: ClickRef

  /**
   * 这一次要画的 option。
   */
  option: ChartOption

  /**
   * 取消令牌(拉起 echarts 的这段时间里组件可能已经卸载)。
   */
  token: AliveToken
}

/**
 * makeChartDispose 的入参。
 */
export type ChartDisposeIn = {
  /**
   * echarts 实例的 ref。
   */
  instRef: InstRef
}

/**
 * useEChart 的入参。
 */
export type UseEChartIn = {
  /**
   * 这一次要画的 option。
   */
  option: ChartOption

  /**
   * 图的高度(px;它一变就要 resize 对齐新高度)。
   */
  height: number

  /**
   * 柱子被点时的回调;缺席 = 这张图不可点。
   */
  onBarClick?: ChartClickFn
}

/**
 * useFullscreen 交回的第二格:全屏态、随它变的图高与开合手柄
 * (第一格是要全屏的那个容器的 ref,单独交出来 —— ref 不进对象,
 * 免得读它的兄弟属性被 react-hooks/refs 判成「渲染期读 ref」)。
 */
export type FsView = {
  /**
   * 现在是不是全屏态。
   */
  fs: boolean

  /**
   * 图的高度(px;全屏时撑满视口)。
   */
  chartH: number

  /**
   * 全屏容器的类(伪全屏时多一层铺满视口的加倍类)。
   */
  boxCls: string

  /**
   * 全屏开合手柄。
   */
  onFs: ClickFn
}

/**
 * MarketCanvas(图与全屏钮)的 props。
 */
export type MarketCanvasIn = {
  /**
   * 算好的 echarts option。
   */
  option: ChartOption

  /**
   * 取词函数(全屏钮那一个词)。
   */
  t: TFn
}

/**
 * useMarketChart 的入参(与 MarketChart 的 props 同集,默认值已由调用方补齐)。
 */
export type UseMarketChartIn = {
  /**
   * 按职业的统计行。
   */
  occ: OccRow[]

  /**
   * 按城市的统计行。
   */
  city: CityRow[]

  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: string

  /**
   * 两条通道的职业清单;缺席 = 不筛通道。
   */
  channels?: ChannelNocs

  /**
   * 横轴=职业时首屏露几个职业。
   */
  firstScreen: number
}

/**
 * 统计主图的整机:三块视图共读的现值、下拉的选项表与全部手柄。
 */
export type MarketPanel = {
  /**
   * 取词函数(视图里的每个词都从它取)。
   */
  t: TFn

  /**
   * 数据层没落地 → 整块不渲(红线:查不到不出空壳)。
   */
  empty: boolean

  /**
   * 搜索词现值。
   */
  query: string

  /**
   * 横轴档现值。
   */
  xKey: XKey

  /**
   * 生效的分组档(退化组合已收成不分组)。
   */
  group: GroupKey

  /**
   * 排序主键现值。
   */
  sortBy: SortBy

  /**
   * 排序方向现值。
   */
  sortDir: SortDir

  /**
   * 右轴档现值。
   */
  y2: Y2Key

  /**
   * 通道筛选现值。
   */
  chan: ChanKey

  /**
   * 最低在招岗数现值(下拉的值是串)。
   */
  minJobs: string

  /**
   * 已选大类现值。
   */
  fBroad: string

  /**
   * 已选中类现值。
   */
  fMid: string

  /**
   * 已选小类现值。
   */
  fFine: string

  /**
   * 「更多筛选」开着没有。
   */
  more: boolean

  /**
   * 徽标上那个数(改过几格筛选);0 = 一格没改,不出徽标。
   */
  filterCount: number

  /**
   * 通道与三级分类的下拉此刻置不置灰(只有横轴=职业时它们才成立)。
   */
  catDisabled: boolean

  /**
   * 中位线的名字(随右轴档走)。
   */
  medName: string

  /**
   * 横轴档的选项。
   */
  xOpts: SelectOpt[]

  /**
   * 分组档的选项(退化组合置灰)。
   */
  groupOpts: SelectOpt[]

  /**
   * 排序主键的选项。
   */
  sortOpts: SelectOpt[]

  /**
   * 排序方向的两档。
   */
  dirOpts: SelectOpt[]

  /**
   * 右轴档的选项。
   */
  y2Opts: SelectOpt[]

  /**
   * 通道筛选的选项。
   */
  chanOpts: SelectOpt[]

  /**
   * 大类的选项(从当前数据里长出来,不写死清单)。
   */
  broadOpts: SelectOpt[]

  /**
   * 中类的选项(随已选大类收窄)。
   */
  midOpts: SelectOpt[]

  /**
   * 小类的选项(随已选大类与中类收窄)。
   */
  fineOpts: SelectOpt[]

  /**
   * 最低在招岗数的选项。
   */
  minJobsOpts: SelectOpt[]

  /**
   * 这一次要画的 echarts option。
   */
  option: ChartOption

  /**
   * 搜索词改值。
   */
  onQuery: TextChangeFn

  /**
   * 横轴档换值。
   */
  onXKey: SelectChangeFn

  /**
   * 分组档换值。
   */
  onGroup: SelectChangeFn

  /**
   * 排序主键换值。
   */
  onSortBy: SelectChangeFn

  /**
   * 排序方向逐档的手柄工厂。
   */
  dirPickOf: (dir: string) => ClickFn

  /**
   * 右轴档换值。
   */
  onY2: SelectChangeFn

  /**
   * 通道筛选换值。
   */
  onChan: SelectChangeFn

  /**
   * 大类换值(顺带清掉中小类)。
   */
  onBroad: SelectChangeFn

  /**
   * 中类换值(顺带清掉小类)。
   */
  onMid: SelectChangeFn

  /**
   * 小类换值。
   */
  onFine: SelectChangeFn

  /**
   * 最低在招岗数换值。
   */
  onMinJobs: SelectChangeFn

  /**
   * 「更多筛选」开合。
   */
  onMore: ClickFn
}

/**
 * withAllOf 的入参:在一串选项前面插一个「全部」空值档。
 */
export type WithAllIn = {
  /**
   * 「全部」那一档的文案。
   */
  all: string

  /**
   * 原本那串选项。
   */
  opts: SelectOpt[]
}

/**
 * segClsOf 的入参。
 */
export type OnIn = {
  /**
   * 这一档是不是当前选中的那一个。
   */
  on: boolean
}

/**
 * chartClsOf 的入参。
 */
export type ClickableIn = {
  /**
   * 这张图点不点得动(不能点就不出小手)。
   */
  clickable: boolean
}

/**
 * fsKeyOf 的入参。
 */
export type FsKeyIn = {
  /**
   * 现在是不是全屏态。
   */
  fs: boolean
}

/**
 * useMarketState 交回的一格:三块视图共读的十四格现值、全屏容器的 ref 与十二只落格。
 */
export type MarketState = {
  /**
   * 搜索词现值。
   */
  query: string

  /**
   * 横轴档现值。
   */
  xKey: XKey

  /**
   * 用户选的分组档(还没过退化判定)。
   */
  rawGroup: GroupKey

  /**
   * 排序主键现值。
   */
  sortBy: SortBy

  /**
   * 排序方向现值。
   */
  sortDir: SortDir

  /**
   * 右轴档现值。
   */
  y2: Y2Key

  /**
   * 通道筛选现值。
   */
  chan: ChanKey

  /**
   * 最低在招岗数现值。
   */
  minJobs: number

  /**
   * 已选大类现值。
   */
  fBroad: string

  /**
   * 已选中类现值。
   */
  fMid: string

  /**
   * 已选小类现值。
   */
  fFine: string

  /**
   * 「更多筛选」开着没有。
   */
  more: boolean

  /**
   * 搜索词的落格。
   */
  setQuery: (v: string) => void

  /**
   * 横轴档的落格。
   */
  setXKey: (v: XKey) => void

  /**
   * 分组档的落格。
   */
  setGroup: (v: GroupKey) => void

  /**
   * 排序主键的落格。
   */
  setSortBy: (v: SortBy) => void

  /**
   * 排序方向的落格。
   */
  setSortDir: (v: SortDir) => void

  /**
   * 右轴档的落格。
   */
  setY2: (v: Y2Key) => void

  /**
   * 通道筛选档的落格。
   */
  setChan: (v: ChanKey) => void

  /**
   * 最低在招岗数的落格。
   */
  setMinJobs: (v: number) => void

  /**
   * 大类的落格。
   */
  setFBroad: (v: string) => void

  /**
   * 中类的落格。
   */
  setFMid: (v: string) => void

  /**
   * 小类的落格。
   */
  setFFine: (v: string) => void

  /**
   * 折叠态的落格。
   */
  setMore: (v: boolean) => void
}

/**
 * marketPanelOf 的入参:整机要的现值、派生值与算好的 option。
 */
export type MarketPanelOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 十四格现值与十二只落格。
   */
  state: MarketState

  /**
   * 全国职业行(三级分类的选项从它长出来)。
   */
  natl: OccRow[]

  /**
   * 生效的分组档(退化组合已收成不分组)。
   */
  group: GroupKey

  /**
   * 中位线的名字。
   */
  medName: string

  /**
   * 算好的 echarts option。
   */
  option: ChartOption

  /**
   * 数据层没落地 → 整块不渲。
   */
  empty: boolean
}

/**
 * 只收一个取词函数的入参(几张固定选项表共用)。
 */
export type LabelOptsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * groupOptsOf 的入参。
 */
export type GroupOptsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前横轴档(退化组合按它置灰)。
   */
  xKey: XKey
}

/**
 * sortOptsOf 的入参。
 */
export type SortOptsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 中位线的名字(按中位排序那一档就叫这个名字)。
   */
  medName: string
}

/**
 * chartHeightOf 的入参。
 */
export type ChartHeightIn = {
  /**
   * 现在是不是全屏态。
   */
  fs: boolean

  /**
   * 视口高度。
   */
  vh: number
}

/**
 * emptyOf 的入参。
 */
export type EmptyOfIn = {
  /**
   * 按职业的统计行。
   */
  occ: OccRow[]

  /**
   * 按城市的统计行。
   */
  city: CityRow[]
}

/**
 * EChart(echarts 薄壳)的 props。
 */
export type EChartIn = {
  /**
   * 这一次要画的 option(原样透传给 echarts)。
   */
  option: ChartOption

  /**
   * 图的高度(px)。
   */
  height: number

  /**
   * 柱子被点时的回调;缺席 = 这张图不可点。
   */
  onBarClick?: ChartClickFn
}

/**
 * MarketChart(统计主图)的 props。
 */
export type MarketChartIn = {
  /**
   * 按职业的统计行(含各省行与全国行)。
   */
  occ: OccRow[]

  /**
   * 按城市的统计行。
   */
  city: CityRow[]

  /**
   * 按省 × 大类的统计行。
   */
  rows: StatRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言;可省 = 中文。
   */
  lang?: string

  /**
   * 两条通道的职业清单;可省 = 不筛通道。
   */
  channels?: ChannelNocs

  /**
   * 横轴=职业时首屏露几个职业;可省 = 12。
   */
  firstScreen?: number
}

/**
 * 三块域内视图共用的 props:整机一件传下去。
 */
export type MarketPanelIn = {
  /**
   * 统计主图的整机。
   */
  panel: MarketPanel
}

/**
 * MarketSelect(带标签的原生下拉)的 props。收拢七处逐字双胞胎 ——
 * 通用件 select 域那份不收(它有量宽镜像、恒插一个空值档,且没有禁用与逐项置灰)。
 */
export type MarketSelectIn = {
  /**
   * 下拉左边那个灰字标签。
   */
  label: string

  /**
   * 当前值。
   */
  value: string

  /**
   * 选项清单。
   */
  opts: SelectOpt[]

  /**
   * 换值手柄。
   */
  onChange: SelectChangeFn

  /**
   * 整只下拉置灰(通道与三级分类只有横轴=职业时才成立);可省 = 可用。
   */
  disabled?: boolean
}
