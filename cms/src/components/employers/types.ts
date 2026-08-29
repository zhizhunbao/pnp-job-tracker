/**
 * employers 页面域的形状。三段律走完整的一遍:lib 那边交回的**事实行**
 * (EmployerRow / SponsorEmployerRow / CompareRow,本域只声明真正读到的格 ——
 * 宪法 08-25「types 自声明」)→ 视图体内洗成**展示行**(XxxCellRow:每一格都已经
 * 算成文本与色档类)→ 单元格组件只读已经算好的那一项。
 * 🔴 洗行这一步是 2026-08-27 Frank 打回 make*Cell 工厂后定的形:单元格组件一律是顶层哑组件,
 * 单参收展示行、零闭包零工厂(「工厂裹内嵌格组件是把嵌套函数换马甲」);要 t/lang 才算得出
 * 的显示值由调用方先算好挂在行上(先例:callbacks 节 RankedBlock 的 cost)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 界面语言码 —— 本域自抄(全站三门语言,结构相同即兼容)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * `t(key, vars)` 的插值表({n} → 值)。
 */
export type TVars = Record<string, string | number>

/**
 * 取词函数。本域只用它的调用形态(i18n 域那份还挂着一个只读 lang 字段,
 * 我们一格都不读 —— 结构相同即兼容)。
 */
export type TFn = (key: string, vars?: TVars) => string

/**
 * 雇主板的两种口径:官方指定名录 / 本站库内在招。
 */
export type EmployerMode = 'designated' | 'hiring'

/**
 * 雇主板筛选(SSR 与 /api/employers 共用一份口径;本域原样收下七格)。
 */
export type EmployerFilters = {
  /**
   * 口径。由**路径段**定,不由 query 改写。
   */
  mode: EmployerMode

  /**
   * AIP | RCIP | FCIP;空串 = 全部制度(仅 designated 口径有意义)。
   */
  program: string

  /**
   * 省码;空串 = 全部省。
   */
  prov: string

  /**
   * 社区/城市;空串 = 全部。
   */
  city: string

  /**
   * 5 位职业码;空串 = 全部职业。
   */
  noc: string

  /**
   * 雇主名关键词;空串 = 不筛。
   */
  q: string

  /**
   * 页码,0 起。
   */
  page: number
}

/**
 * 职业码的三语人话名(字典查不到的码不返回,展示层原样显示 5 位码)。
 */
export type NocTitle = {
  /**
   * 英文名。
   */
  en: string

  /**
   * 中文名。
   */
  zh: string

  /**
   * 韩文名。
   */
  ko: string
}

/**
 * 职业码 → 三语人话名的字典。
 */
export type NocTitles = Record<string, NocTitle>

/**
 * 雇主板筛选下拉的选项(本域只读三格;制度下拉的选项另有 EMP_PROGRAMS 枚举兜着)。
 */
export type EmployerFacets = {
  /**
   * 省下拉。
   */
  provs: string[]

  /**
   * 社区下拉。
   */
  cities: string[]

  /**
   * 职业下拉。
   */
  nocs: string[]
}

/**
 * 雇主板的一行事实。
 */
export type EmployerRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 省码(社区为空时所在地列回落它)。
   */
  province: string

  /**
   * 社区/城市;名录没写社区时留空。
   */
  where: string

  /**
   * designated:AIP/RCIP/FCIP(可双标);hiring:空串。
   */
  program: string

  /**
   * 名录列明的 NOC;**空 = 名录没写,不是没有限制**(展示「未列明」)。
   */
  nocs: string[]

  /**
   * hiring:本站库内在招岗数;designated:null(名录不含在招信息)。
   */
  openJobs: number | null

  /**
   * 名录官方页;hiring 口径为空串(整批都空则整列不出)。
   */
  url: string
}

/**
 * 雇主板的一页(SSR 首帧与 /api/employers 交回同一形状)。
 */
export type EmployerPage = {
  /**
   * 本页口径。
   */
  mode: EmployerMode

  /**
   * 本页的行。
   */
  rows: EmployerRow[]

  /**
   * 筛选后的总行数(不是本页行数)。
   */
  total: number

  /**
   * 页码,0 起。
   */
  page: number

  /**
   * 每页行数(0 时按 PAGE_SIZE_FALLBACK 算总页数)。
   */
  pageSize: number

  /**
   * 下拉选项。
   */
  facets: EmployerFacets

  /**
   * 名录抓取日期(designated;hiring 为空串)。
   */
  fetched: string

  /**
   * 职业码 → 三语人话名。
   */
  nocTitles: NocTitles
}

/**
 * 担保雇主三分表的人群档:aip 去大西洋省 / lmia 没工签要雇主办 LMIA /
 * named 有工签要打包省提名。
 */
export type SponsorKind = 'aip' | 'lmia' | 'named'

/**
 * 雇主门槛的整体判定。`unknown` **不是「不满足」** —— 是我们查不到;
 * `public` = 公共部门旁路。
 */
export type SponsorVerdictState = 'met' | 'short' | 'unknown' | 'public'

/**
 * 雇主侧门槛判定(公司事实 × 该省官方门槛)。
 */
export type SponsorVerdict = {
  /**
   * 整体判定。
   */
  state: SponsorVerdictState

  /**
   * state='short' 时点名哪几项没达标(年限/雇员数的机器名,人话见 VERDICT_FACTOR_KEY)。
   */
  failed: string[]
}

/**
 * 在招担保雇主的一行事实(本域只声明表列与卡片真正读到的格)。
 */
export type SponsorEmployerRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 中文别名(Wikidata 官方标签,不机翻);空串 = 没有公认中文名。
   */
  aliasZh: string

  /**
   * 韩文别名;空串 = 没有。
   */
  aliasKo: string

  /**
   * 本站库内在招岗数(全国口径)。
   */
  openJobs: number

  /**
   * 在招岗所在省清单(去重)。
   */
  provs: string[]

  /**
   * AIP 视图专用在招数(只计 aip=true 的岗)。
   */
  openJobsAip: number

  /**
   * AIP 视图专用所在省清单(只有大西洋四省)。
   */
  provsAip: string[]

  /**
   * LMIA 获批岗位数(历史事实)。
   */
  lmiaPositions: number

  /**
   * 其中技能类获批数;null = 列未回填(🔴 官方可空,不许折 0)。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 近 4 季获批数(列未回填时 0)。
   */
  lmia4q: number

  /**
   * 近 2 季获批数。
   */
  lmia2q: number

  /**
   * 近 1 季获批数。
   */
  lmia1q: number

  /**
   * 雇主侧门槛判定。
   */
  verdict: SponsorVerdict
}

/**
 * 多雇主对照的一行事实(一家雇主 = 表里的一列 / 手机上的一张卡)。
 */
export type CompareRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 行业大类 slug;空串 = 未分类。
   */
  industry: string

  /**
   * 中文别名;空串 = 没有。
   */
  aliasZh: string

  /**
   * 韩文别名;空串 = 没有。
   */
  aliasKo: string

  /**
   * 官网;空串 = 没有(雇主名就不做成链接)。
   */
  website: string

  /**
   * K 调查五节简介原文;空串 = 没查过。
   */
  aiBrief: string

  /**
   * LMIA 获批岗位数;null = 无记录列(0 是真的 0,照显示)。
   */
  lmiaPositions: number | null

  /**
   * 技能类获批数;null = 列未回填(保 null,不折 0)。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近获批季度;空串 = 没有。
   */
  lmiaLastQuarter: string

  /**
   * 有 AIP 标记的在招岗。
   */
  aip: boolean

  /**
   * 在库开放岗数。
   */
  openJobs: number

  /**
   * 开放岗平均分;null = 无可平均的岗。
   */
  avgScore: number | null

  /**
   * 具名省清单命中的岗数。
   */
  namedJobs: number

  /**
   * 开放岗年薪中位数;null = 无薪资数据。
   */
  medSalary: number | null

  /**
   * 主要省(开放岗最多的省);空串 = 无岗。
   */
  mainProvince: string

  /**
   * 主要省的难度档;null = 未收录。
   */
  diffTier: string | null

  /**
   * 与我的匹配:高匹配岗数;null = 未建档/未算。
   */
  matchHigh: number | null

  /**
   * 与我的匹配:中匹配岗数;null = 未建档/未算。
   */
  matchMid: number | null
}

/**
 * 已经算好的一个单元格文本:显示什么 + 套什么色档类。
 * 🔴 `text` 为空串 = **本站没有这一项**(单元格组件渲成灰色横杠),不是 0 ——
 * 官方可空的数值折 0 = 替官方编数,所以「有没有」在洗行时就判完,单元格组件不再认识 0。
 */
export type CellText = {
  /**
   * 显示文本;空串 = 没有这一项。
   */
  text: string

  /**
   * 有值时的色档类(空串 = 纯文本不套壳)。
   */
  cls: string
}

/**
 * 省难度档标签的三种变体:easy 通过绿、mid 关注琥珀、tight 联邦蓝
 * (与「好/坏」二元区分开 —— 卷的省只是难,不是坏)。
 */
export type DiffVariant = 'ok' | 'warn' | 'federal'

/**
 * 已经算好的一个单元格标签:标签文字 + 变体。
 */
export type CellTag = {
  /**
   * 标签文字;空串 = 没有这一项(单元格组件渲成灰色横杠)。
   */
  label: string

  /**
   * 标签变体。
   */
  variant: 'region' | 'ok'
}

/**
 * 雇主板的一行**展示行**:每一项都已经算成文本(省名回落、职业名与码、横杠)。
 */
export type EmployerCellRow = {
  /**
   * 行身份(同名雇主可能落在不同社区,所以带上所在地)。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 雇主名的落点(职位板按名搜)。
   */
  href: string

  /**
   * 落点的悬停提示。
   */
  hrefTitle: string

  /**
   * 雇主名的排序键(小写 —— 全大写的公司名不该整批排到前面)。
   */
  nameSort: string

  /**
   * 所在地(名录写了社区就显社区,没写回落省名;显示与排序同值)。
   */
  where: string

  /**
   * 制度(名录没写时已经是横杠)。
   */
  program: string

  /**
   * 制度的排序键(原值,不是横杠)。
   */
  programSort: string

  /**
   * 「未列明」文案;空串 = 这一行有职业。
   */
  nocNone: string

  /**
   * 职业人话名(顿号连)。
   */
  nocNames: string

  /**
   * 职业 5 位码灰注(顿号连);空串 = 与人话名逐字相同,不再重复渲一遍。
   */
  nocCodes: string

  /**
   * 「+N」文案;空串 = 没有折起来的职业。
   */
  nocMore: string

  /**
   * 职业列的排序键(名录列明了几个职业)。
   */
  nocSort: number

  /**
   * 名录出处链;空串 = 这一行没有出处。
   */
  listUrl: string

  /**
   * 名录出处的链面文字。
   */
  listLabel: string

  /**
   * 在招岗数文本(0 也照显示 —— 库里真的一个都没有,不是缺数)。
   */
  openText: string

  /**
   * 在招岗数的排序键。
   */
  openSort: number

  /**
   * 制度原值(名录口径下当手机卡上的胶囊);空串 = 不出胶囊。
   * 与 `program` 分两格:那一格是**表里显示的**(没写已经补成横杠),
   * 而卡上的胶囊没写就整枚不出 —— 一枚写着横杠的胶囊比不出更糟。
   */
  programChip: string

  /**
   * 手机卡上的职业注(名录口径):卡上没有列名撑着,「未列明」单摆会被读成
   * 「不知道这家招什么」—— 带上列名才说得清是名录没写。空串 = 在招口径不出这一行。
   */
  cardNote: string

  /**
   * 手机卡右列的在招岗数话术(在招口径);空串 = 名录口径不出这一格
   * (名录不含在招信息)。
   */
  cardSalary: string
}

/**
 * 无参无返的手柄形状(埋点、抽屉开合、清空筛选都是这一形)。
 */
export type ClickFn = () => void

/**
 * 担保雇主的一行**展示行**。
 */
export type SponsorCellRow = {
  /**
   * 行身份(雇主名)。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 雇主名的落点(首页按名搜)。
   */
  href: string

  /**
   * 别名灰注;空串 = 这门语言没有别名(无名不占位)。
   */
  alias: string

  /**
   * 点雇主名时的埋点手柄。
   */
  onView: ClickFn

  /**
   * 雇主名的排序键。
   */
  nameSort: string

  /**
   * 在招岗数文本(AIP 档只计四省内的 AIP 岗)。
   */
  openText: string

  /**
   * 在招岗数的排序键。
   */
  openSort: number

  /**
   * 近 1 季 LMIA 获批数。
   */
  w1: CellText

  /**
   * 近 1 季的排序键。
   */
  w1Sort: number

  /**
   * 近 2 季 LMIA 获批数。
   */
  w2: CellText

  /**
   * 近 2 季的排序键。
   */
  w2Sort: number

  /**
   * 近 4 季 LMIA 获批数。
   */
  w4: CellText

  /**
   * 近 4 季的排序键。
   */
  w4Sort: number

  /**
   * LMIA 获批岗位数合计。
   */
  lmia: CellText

  /**
   * 合计的排序键。
   */
  lmiaSort: number

  /**
   * 其中技能类获批数。
   */
  skilled: CellText

  /**
   * 技能类的排序键(🔴 保 null:折 0 = 替官方编数,而 null 恒沉底才排得对)。
   */
  skilledSort: number | null

  /**
   * 所在地(省维度;显示与排序不同值,排序按首个省码)。
   */
  where: string

  /**
   * 所在地的排序键。
   */
  whereSort: string

  /**
   * 雇主门槛(表格档色:达标绿粗、差项红粗、待核灰常规)。
   */
  verdict: CellText

  /**
   * 雇主门槛(手机卡档色:只有色 —— 粗由卡里那层 `<b>` 定)。
   */
  verdictCard: CellText

  /**
   * 雇主门槛的排序键;表里没有的态是 null(沉底)。
   */
  verdictSort: number | null
}

/**
 * 对照表里一家雇主的**展示行**(表里是一列、手机上是一张卡)。
 */
export type CompareCellRow = {
  /**
   * 行身份(雇主名)。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 官网;空串 = 名字不做成链接。
   */
  website: string

  /**
   * 别名灰注;空串 = 没有。
   */
  alias: string

  /**
   * 行业大类标签。
   */
  industry: CellTag

  /**
   * 技能类获批数。
   */
  skilled: CellText

  /**
   * LMIA 获批岗位数。
   */
  lmia: CellText

  /**
   * 最近获批季度。
   */
  quarter: CellText

  /**
   * AIP 指定标签。
   */
  aip: CellTag

  /**
   * 在招岗数文本。
   */
  openText: string

  /**
   * 在招岗的落点;空串 = 零岗不做链(点进去一条都没有的链是空承诺)。
   */
  openHref: string

  /**
   * 开放岗平均分。
   */
  avg: CellText

  /**
   * 具名岗数。
   */
  named: CellText

  /**
   * 年薪中位数(千元)。
   */
  sal: CellText

  /**
   * 主要省名;空串 = 无岗(画灰杠)。
   */
  provName: string

  /**
   * 省难度档文案;空串 = 未收录(不出标签 —— 缺数不猜档)。
   */
  diffLabel: string

  /**
   * 省难度档的标签变体。
   */
  diffVariant: DiffVariant

  /**
   * 高匹配那一行的文案;空串 = 未建档/未算(画灰杠,不是「零匹配」)。
   */
  matchHigh: string

  /**
   * 中匹配那一行的文案。
   */
  matchMid: string

  /**
   * 简介全文(挂 title 悬停看);空串 = 没查过。
   */
  brief: string

  /**
   * 简介截断后的显示文本(含省略号)。
   */
  briefText: string
}

/**
 * 模糊样例表的一行(指标名 + 三家假雇主的假值)。三家写成三格而不是一个数组:
 * 按下标取值读不出哪一格是哪一家(闸 local/no-literal-index)。
 */
export type CompareDemoRow = {
  /**
   * 指标名(最左列)。
   */
  metric: string

  /**
   * 第一家假雇主的假值。
   */
  a: string

  /**
   * 第二家假雇主的假值。
   */
  b: string

  /**
   * 第三家假雇主的假值。
   */
  c: string
}

/**
 * 单元格渲染器的形状 —— 与 table 域列声明的 render 位逐字对齐
 * (一个参数收这一行,哑组件的签名天然就是它)。
 */
export type CellFn<T> = (r: T) => React.ReactNode

/**
 * 排序取值器的形状(null 恒沉底)。
 */
export type SortFn<T> = (r: T) => string | number | null

/**
 * 一列的声明 —— 本域自声明真正用到的八项(table 域那份还有 thTip 等,本域不用;
 * 结构相同即兼容,走样当场 tsc 红)。
 */
export type EmpCol<T> = {
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
   * 单元格不换行。
   */
  nowrap?: boolean

  /**
   * 显式列宽(百分比)。
   */
  width?: string

  /**
   * 数字列右对齐;缺省左。
   */
  align?: 'left' | 'right'

  /**
   * 列级类(整列同一个视觉形态时用它,省掉一枚只为套色的单元格组件)。
   */
  className?: string
}

/**
 * 对照表的一个维度行(表里是行,卡片里是一条键值)。
 */
export type CompareDim = {
  /**
   * 维度身份(行键)。
   */
  key: string

  /**
   * 维度名(表最左列 / 卡片里的键)。
   */
  label: React.ReactNode

  /**
   * 口径提示;空串 = 不挂 title 也不加虚下划线。
   */
  tip: string

  /**
   * 这一维度在某家雇主身上的值。
   */
  render: CellFn<CompareCellRow>
}

/**
 * DashText(域内小件:一个单元格的文本,或灰色横杠)的 props。
 */
export type DashTextIn = {
  /**
   * 已经算好的这一项。
   */
  v: CellText
}

/**
 * TagText(域内小件:一枚标签,或灰色横杠)的 props。
 */
export type TagTextIn = {
  /**
   * 已经算好的这一项。
   */
  v: CellTag
}

/**
 * toEmployerCellRow 的入参。
 */
export type EmployerCellRowIn = {
  /**
   * 这一行事实。
   */
  r: EmployerRow

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 当前筛选(职业格要按它决定只显选中那条)。
   */
  f: EmployerFilters

  /**
   * 职业名字典。
   */
  titles: NocTitles
}

/**
 * toEmployerCellRows 的入参。
 */
export type EmployerCellRowsIn = {
  /**
   * 本页的行事实。
   */
  rows: EmployerRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 当前筛选。
   */
  f: EmployerFilters

  /**
   * 职业名字典。
   */
  titles: NocTitles
}

/**
 * toSponsorCellRow 的入参。
 */
export type SponsorCellRowIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(别名按它取)。
   */
  lang: Lang

  /**
   * 人群档。
   */
  kind: SponsorKind
}

/**
 * toSponsorCellRows 的入参。
 */
export type SponsorCellRowsIn = {
  /**
   * 本批的行事实。
   */
  rows: SponsorEmployerRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 人群档。
   */
  kind: SponsorKind
}

/**
 * toCompareCellRow 的入参。
 */
export type CompareCellRowIn = {
  /**
   * 这一家的事实。
   */
  r: CompareRow

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * toCompareCellRows 的入参。
 */
export type CompareCellRowsIn = {
  /**
   * 要对照的雇主事实。
   */
  rows: CompareRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * employerColsOf 的入参。
 */
export type EmployerColsIn = {
  /**
   * 取词函数(列名)。
   */
  t: TFn

  /**
   * 口径(名录五列 / 在招三列)。
   */
  mode: EmployerMode

  /**
   * 本批有没有一行带名录出处 —— 一行都没有就整列不出
   * (容缺先例同 hasVerdictSignal:不渲染一列全「—」)。
   */
  hasList: boolean
}

/**
 * sponsorEmployerColsOf 的入参(2026-08-27 换装批把原先的四个位置参数收成一包;
 * lang 那一格随「显示值先算好挂在行上」下沉进洗行,列组不再需要它)。
 */
export type SponsorColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人群档。
   */
  kind: SponsorKind

  /**
   * 出不出雇主门槛列(调用方算好的 hasVerdictSignal 结果;false = 该列压根不进
   * cols 数组,不是渲染出一列全「待核」)。
   */
  showVerdict: boolean
}

/**
 * compareDimsOf 的入参。
 */
export type CompareDimsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有没有雇主带得出「与我的匹配」—— 一家都没有就不出那一行。
   */
  withMatch: boolean
}

/**
 * makeDimValue 的入参(纯取值工厂:它返回的是数据访问器,不是单元格组件 ——
 * 对比表的列数由用户选了几家雇主决定,列序只能靠闭包带进去)。
 */
export type DimValueIn = {
  /**
   * 这一列代表的雇主(表是**转置**的:列 = 雇主、行 = 维度)。
   */
  row: CompareCellRow
}

/**
 * 判定的色档:ok 达标 / ng 差项 / dim 待核与公共部门旁路。
 */
export type VerdictTone = 'ok' | 'ng' | 'dim'

/**
 * 判定事实:显示什么话 + 属于哪一档色。
 */
export type VerdictFact = {
  /**
   * 这一格显示的话。
   */
  text: string

  /**
   * 色档。
   */
  tone: VerdictTone
}

/**
 * verdictFactOf 的入参。
 */
export type VerdictFactIn = {
  /**
   * 这一行的判定。
   */
  v: SponsorVerdict

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * verdictClsOf / verdictCardClsOf 的入参。
 */
export type VerdictToneIn = {
  /**
   * 色档。
   */
  tone: VerdictTone
}

/**
 * whereTextOf 的入参。
 */
export type WhereTextIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人群档(aip 档只看四省内的岗)。
   */
  kind: SponsorKind
}

/**
 * sponsorProvsOf / sponsorOpenOf 的入参。
 */
export type SponsorKindIn = {
  /**
   * 这一行事实。
   */
  r: SponsorEmployerRow

  /**
   * 人群档。
   */
  kind: SponsorKind
}

/**
 * provNameOf 的入参。
 */
export type ProvNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码。
   */
  code: string
}

/**
 * nocLabelOf 的入参。
 */
export type NocLabelIn = {
  /**
   * 5 位职业码。
   */
  noc: string

  /**
   * 职业名字典。
   */
  titles: NocTitles

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * 职业码 → 显示名(下拉的 labelOf 与洗行共用同一份口径)。
 */
export type NocNameFn = (noc: string) => string

/**
 * makeNocLabel 的入参。
 */
export type NocLabelListIn = {
  /**
   * 职业名字典。
   */
  titles: NocTitles

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * aliasOf 的入参。
 */
export type AliasIn = {
  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 中文别名。
   */
  aliasZh: string

  /**
   * 韩文别名。
   */
  aliasKo: string
}

/**
 * moneyTextOf 的入参。
 */
export type MoneyIn = {
  /**
   * 年薪;null = 无薪资数据。
   */
  v: number | null
}

/**
 * cellTextOf 的入参(把一个可空数值洗成一格)。
 */
export type CellTextIn = {
  /**
   * 已经算好的文本;空串 = 没有这一格。
   */
  text: string

  /**
   * 有值时的色档类。
   */
  cls: string
}

/**
 * qsOf / foldActiveOf / anyFilterOf / needScopeOf 的入参。
 */
export type FiltersIn = {
  /**
   * 当前筛选。
   */
  f: EmployerFilters
}

/**
 * boardUrlOf / apiUrlOf 的入参。
 */
export type BoardUrlIn = {
  /**
   * 口径(深链走路径段、API 走 query)。
   */
  mode: EmployerMode

  /**
   * 已拼好的 query(空串 = 不带)。
   */
  qs: string
}

/**
 * loadBoard 的入参。
 */
export type LoadBoardIn = {
  /**
   * 口径。
   */
  mode: EmployerMode

  /**
   * 已拼好的 query。
   */
  qs: string

  /**
   * 中断信号(换筛选换得快时把上一发掐掉)。
   */
  signal: AbortSignal

  /**
   * 数据落格。
   */
  setData: (p: EmployerPage) => void

  /**
   * 加载态落格。
   */
  setLoading: (v: boolean) => void
}

/**
 * 筛选态落格的形状。
 */
export type SetFilters = (f: EmployerFilters) => void

/**
 * 换一格筛选的手柄形状(下拉的 onChange)。
 */
export type PickFn = (v: string) => void

/**
 * 翻页手柄的形状。
 */
export type PageFn = (p: number) => void

/**
 * withQOf 的入参。
 */
export type WithQIn = {
  /**
   * 当前筛选。
   */
  f: EmployerFilters

  /**
   * 防抖满了才落进来的搜索词。
   */
  q: string
}

/**
 * 换筛选一族工厂的入参。
 */
export type FilterPickIn = {
  /**
   * 当前筛选(新值只改一格,其余原样抄回 —— 不用对象展开,字段写全)。
   */
  f: EmployerFilters

  /**
   * 筛选态落格。
   */
  setF: SetFilters
}

/**
 * makeClear 的入参。
 */
export type ClearIn = {
  /**
   * 当前筛选(只留口径)。
   */
  f: EmployerFilters

  /**
   * 筛选态落格。
   */
  setF: SetFilters

  /**
   * 搜索草稿落格(输入框里的字也要一起清)。
   */
  setQDraft: (v: string) => void
}

/**
 * makeDrawerToggle 的入参。
 */
export type DrawerToggleIn = {
  /**
   * 抽屉现状。
   */
  drawer: boolean

  /**
   * 抽屉落格。
   */
  setDrawer: (v: boolean) => void
}

/**
 * makeCardClick 的入参。
 */
export type CardClickIn = {
  /**
   * 这一行的落点(整卡点击去哪)。
   */
  href: string
}

/**
 * 整卡点击手柄的形状(收原生事件,判点是不是落在卡内链接上)。
 */
export type CardClickFn = (e: React.MouseEvent) => void

/**
 * moreBtnClsOf 的入参。
 */
export type MoreBtnClsIn = {
  /**
   * 抽屉展开着,或折叠里有生效的筛选 —— 两种情况钮都亮起来。
   */
  active: boolean
}

/**
 * listClsOf 的入参。
 */
export type ListClsIn = {
  /**
   * 在不在懒取(半透明 + 屏蔽点击)。
   */
  busy: boolean
}

/**
 * noteTextOf 的入参。
 */
export type NoteTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前筛选。
   */
  f: EmployerFilters

  /**
   * 筛选后的总行数。
   */
  total: number
}

/**
 * emptyTextOf / titleTextOf 的入参。
 */
export type TextByFiltersIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前筛选。
   */
  f: EmployerFilters
}

/**
 * maxPageOf 的入参。
 */
export type MaxPageIn = {
  /**
   * 总行数。
   */
  total: number

  /**
   * 每页行数(0 时按兜底档算)。
   */
  pageSize: number
}

/**
 * Employers(雇主板)的 props。
 */
export type EmployersIn = {
  /**
   * SSR 首帧的第一页 + total(名录 6,680 行不进 payload,换筛选打 API 懒取)。
   */
  initial: EmployerPage

  /**
   * SSR 解析出的初始筛选(深链 `/employers/designated?program=AIP&prov=NS` 直达)。
   */
  initialFilters: EmployerFilters
}

/**
 * useEmployersPage 交回的整机面板:一台机器管筛选态、深链回写与懒取。
 */
export type EmployersPanel = {
  /**
   * 界面语言(职业名按它取列)。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前筛选。
   */
  f: EmployerFilters

  /**
   * 当前这一页数据(懒取失败时保留手上这一份,不白屏)。
   */
  data: EmployerPage

  /**
   * 正在懒取(表格半透明 + 加载条)。
   */
  loading: boolean

  /**
   * 「更多筛选」抽屉展开着。
   */
  drawer: boolean

  /**
   * 搜索框里的草稿(防抖满了才进筛选)。
   */
  qDraft: string

  /**
   * 改搜索草稿。
   */
  onQDraft: (v: string) => void

  /**
   * 开合「更多筛选」抽屉。
   */
  onDrawer: ClickFn

  /**
   * 换口径(顺带清社区;切到在招口径时制度筛选失效,一并清)。
   */
  onMode: PickFn

  /**
   * 换省(顺带清社区 —— 上一个省的社区在新省里不存在)。
   */
  onProv: PickFn

  /**
   * 换制度(顺带清社区,同上)。
   */
  onProgram: PickFn

  /**
   * 换社区。
   */
  onCity: PickFn

  /**
   * 换职业。
   */
  onNoc: PickFn

  /**
   * 清空全部筛选(口径保留 —— 它是路径,不是筛选项)。
   */
  onClear: ClickFn

  /**
   * 翻页。
   */
  onPage: PageFn
}

/**
 * EmployerFilterBar(筛选区)与 EmployerBoard(表/卡/翻页)的 props:
 * 整机面板直接透传 —— 两块都只读不写。
 */
export type EmployerPanelIn = {
  /**
   * 整机面板。
   */
  p: EmployersPanel
}

/**
 * EmployerCards(手机卡片流)的 props。
 */
export type EmployerCardsIn = {
  /**
   * 已洗好的展示行。
   */
  rows: EmployerCellRow[]

  /**
   * 计数文案(卡片形态没有表头,计数自己占一行)。
   */
  note: string

  /**
   * 空态文案。
   */
  empty: string
}

/**
 * EmployerCard(一张手机卡)的 props。
 */
export type EmployerCardIn = {
  /**
   * 这一行展示行(卡上要的每一格都已经在洗行时算好)。
   */
  r: EmployerCellRow
}

/**
 * SponsorCard(担保雇主手机卡)的 props。
 */
export type SponsorCardIn = {
  /**
   * 这一行事实(卡自己洗成展示行 —— 调用方 Pulse 只管给事实)。
   */
  r: SponsorEmployerRow

  /**
   * 界面语言(别名按它取)。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人群档。
   */
  kind: SponsorKind

  /**
   * 出不出雇主门槛那一条(整批全 unknown 时不出;可省 = 不出)。
   */
  showVerdict?: boolean
}

/**
 * Compare(多雇主对照)的 props。
 */
export type CompareIn = {
  /**
   * 要对照的雇主(Pro 且 ≥2 家才有真值;免费/匿名恒空)。
   */
  rows: CompareRow[]

  /**
   * 付费态(免费只给模糊样例,真值不出服务端)。
   */
  pro: boolean

  /**
   * 登录态(升级弹框按它决定先登录还是直接付)。
   */
  loggedIn: boolean
}

/**
 * CompareDemo(免费态的价值时刻:三行价值点 + 模糊样例表 + 升级钮)的 props。
 */
export type CompareDemoIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录态(透传给升级弹框)。
   */
  loggedIn: boolean
}

/**
 * CompareTable(桌面转置表)与 CompareCards(手机转置卡)的 props。
 */
export type CompareViewIn = {
  /**
   * 已洗好的展示行(一家一列 / 一家一卡)。
   */
  rows: CompareCellRow[]

  /**
   * 维度行(表里是行、卡里是键值,一份数组两处复用零双写)。
   */
  dims: CompareDim[]
}

/**
 * CompareCard(一家雇主的转置卡)的 props。
 */
export type CompareCardIn = {
  /**
   * 这一家的展示行。
   */
  r: CompareCellRow

  /**
   * 维度行。
   */
  dims: CompareDim[]
}

/**
 * CompareHeadLabel(对照表的雇主列头:名字 + 别名灰注)的 props。
 */
export type CompareHeadLabelIn = {
  /**
   * 这一列代表的雇主(展示行)。
   */
  r: CompareCellRow
}

/**
 * toEmployerNocParts 交回的几段文本:雇主板「职业」列要显示的东西,
 * 外加手机卡上那条职业说明。
 */
export type EmployerNocParts = {
  /**
   * 「未列明」文案;空串 = 这一行有职业。
   */
  none: string

  /**
   * 职业人话名(顿号连)。
   */
  names: string

  /**
   * 职业 5 位码灰注;空串 = 与人话名逐字相同,不再重复渲一遍。
   */
  codes: string

  /**
   * 「+N」文案;空串 = 没有折起来的职业。
   */
  more: string

  /**
   * 手机卡上的职业说明。
   */
  cardNote: string
}

/**
 * cardNoteOf 的入参。
 */
export type CardNoteIn = {
  /**
   * 洗行的整包入参(这一行、取词函数、语言、筛选与字典)。
   */
  x: EmployerCellRowIn

  /**
   * 职业码 → 显示名。
   */
  labelOf: NocNameFn

  /**
   * 多个职业之间的顿号。
   */
  sep: string
}

/**
 * toCompareProv 交回的三样:对比表「主要省」那一项要显示的省名、难度档文案与标签变体。
 */
export type CompareProvParts = {
  /**
   * 省名;空串 = 这家雇主一个在招岗都没有。
   */
  name: string

  /**
   * 难度档文案;空串 = 未收录(不出标签 —— 缺数不猜档)。
   */
  label: string

  /**
   * 难度档的标签变体。
   */
  variant: DiffVariant
}

/**
 * toCompareMatch 交回的两行:对比表「与我的匹配」那一项的高匹配与中匹配文案。
 */
export type CompareMatchParts = {
  /**
   * 高匹配那一行;空串 = 未建档/未算。
   */
  high: string

  /**
   * 中匹配那一行。
   */
  mid: string
}

/**
 * sponsorOpenLabelOf 的入参(表列名与手机卡上那一条键名共用同一份口径)。
 */
export type SponsorColsWordsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人群档(AIP 视图另有一条说明「只计四省内 AIP 岗」的词)。
   */
  kind: SponsorKind
}

/**
 * 只要取词函数的入参(下拉选项显示名一族)。
 */
export type WordsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CompareResult(付费态的正文:雇主不足两家时的空态引导,够两家时的表 + 卡 + 底部两枚钮)
 * 的 props。
 */
export type CompareResultIn = {
  /**
   * 已洗好的展示行。
   */
  rows: CompareCellRow[]

  /**
   * 维度行。
   */
  dims: CompareDim[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * EmployerLoading(加载条)的 props。
 */
export type EmployerLoadingIn = {
  /**
   * 正在懒取(转圈与文字只在这时出;高度常驻由类占着)。
   */
  loading: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * makePricingSet 的入参。
 */
export type PricingSetIn = {
  /**
   * 升级弹框的开合落格。
   */
  setPricing: (v: boolean) => void

  /**
   * 这一枚手柄要把它落成开还是合。
   */
  open: boolean
}

/**
 * compareNamesOf 的入参。归一前形状(Next 递来的查询参数原样格),所以带 `?:`。
 */
export type CompareNamesIn = {
  /**
   * 对照页 URL 上 `?names=` 那一格的原样值:选中的几个雇主名用竖线连成一串。
   * 参数没带时这个键压根不存在(不是「空字符串」),照实写成真可选。
   */
  names?: string
}

/**
 * 担保雇主手机卡里的一条键值行。
 */
export type SponsorKv = {
  /**
   * 键(与桌面表那一列的列名同一个词)。
   */
  k: React.ReactNode

  /**
   * 值。
   */
  v: React.ReactNode
}

/**
 * 一页 SEO 头的两格(Next 从 generateMetadata 的返回值里读它们)。
 * 雇主板的两个入口(designated / hiring)共用这一张形状:标题都是「范围前缀 + 固定尾巴」,
 * 描述都是各自定稿的一句,两格都保证有值(算不出范围时前缀为空,标题仍然成立)。
 */
export type PageMeta = {
  /**
   * `<title>`:范围前缀(省码 / 制度码)+ 该入口的固定尾巴。
   */
  title: string

  /**
   * 搜索结果里那段摘要,各入口一句定稿、不随参数变。
   */
  description: string
}

/**
 * designatedMetaOf 的入参 —— 归一前形状(Next 递来的查询参数原样格),所以带 `?:`。
 */
export type DesignatedMetaIn = {
  /**
   * 直达链接上 `?program=` 那一格的原样值;落在三个指定制度码里才进标题前缀。
   * 参数没带时这个键压根不存在(不是「空字符串」),照实写成真可选。
   */
  program?: string

  /**
   * 直达链接上 `?prov=` 那一格的原样值;两位大写省码才进标题前缀。同上,没带就是键不存在。
   */
  prov?: string
}

/**
 * designatedMetaOf 的出参。
 */
export type DesignatedMetaOut = PageMeta

/**
 * hiringMetaOf 的入参 —— 归一前形状(Next 递来的查询参数原样格),所以带 `?:`。
 */
export type HiringMetaIn = {
  /**
   * 直达链接上 `?prov=` 那一格的原样值;两位大写省码才进标题前缀。
   * 参数没带时这个键压根不存在(不是「空字符串」),照实写成真可选。
   */
  prov?: string
}

/**
 * hiringMetaOf 的出参。
 */
export type HiringMetaOut = PageMeta
