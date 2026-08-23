/**
 * 雇主域的全部形状。这个域装「雇主」这一个实体的四条线:
 * AIP/RCIP/FCIP 指定雇主名录(designated)、在招担保雇主(sponsor)、
 * 多雇主对照(compare)、单公司背调(research),外加职业目录(occupations,雇主板的下钻维度)。
 *
 * 🔴 口径红线(全域最要紧的两条,消费端不许自己另立):
 *    · 被指定 ≠ 在招,更 ≠ 要你 —— 名录是「可以走这条试点招人」的资格,不是招聘信息;
 *    · 名录**没写职业**的行(RCIP/FCIP 绝大多数),选了 NOC 筛选时**照常保留** ——
 *      空 = 官方没列清单,不是「该雇主不招这个职业」,剔掉 = 拿数据缺口冒充官方排除。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

import type { Db } from '../db'
// 对照线的档案与维度形状归 jobs 域(match 引擎在那儿),这里只透传不拆读 ——
// 自声明要复制四层嵌套形状,引擎一改这里就悄悄失配;jobs 重构时再回头判这条边(no-import-in-leaf 挂账)。
import type { MatchDims, MatchProfile } from '../jobs'

/**
 * 名录一行(SQL `DESIGNATED_ALL` 映射后的干净行)。
 */
export type DesignatedRow = {
  /**
   * 雇主名,名录原文。
   */
  name: string

  /**
   * 省码。
   */
  province: string

  /**
   * 社区/城市(RCIP/FCIP 的名录按社区发,AIP 按省 —— 按省的行这一格是空串)。
   */
  location: string

  /**
   * 制度:AIP | RCIP | FCIP | RCIP+FCIP(双标社区)。
   */
  source: string

  /**
   * 逗号分隔 NOC 原文(AIP 名录部分行有;RCIP/FCIP 多为空 —— 空 = 名录没写,不是没有限制)。
   */
  nocs: string

  /**
   * 名录官方页。
   */
  url: string

  /**
   * 名录抓取日(已归一成 YYYY-MM-DD)。
   */
  fetched: string
}

/**
 * `DesignatedRow` 的复数(数组进签名要有自己的名字)。
 */
export type DesignatedRows = DesignatedRow[]

/**
 * 在招雇主一行(SQL `HIRING_EMPLOYERS` 映射后的干净行)。
 */
export type HiringRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 省码。
   */
  province: string

  /**
   * 城市。
   */
  location: string

  /**
   * 本站库内在招岗数。
   */
  openJobs: number
}

/**
 * `HiringRow` 的复数。
 */
export type HiringRows = HiringRow[]

/**
 * 雇主板的两种口径:官方指定名录 / 本站库内在招。
 */
export type EmployerMode = 'designated' | 'hiring'

/**
 * 雇主板筛选(SSR 与 /api/employers 共用一份,避免两端口径漂移)。
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
   * 社区/城市(名录 location 原值);空串 = 全部。
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
 * 两种口径归一的板上一行(列随口径换:designated 出制度+职业,hiring 出在招岗数)。
 */
export type EmployerRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 省码。
   */
  province: string

  /**
   * 社区/城市;名录没写社区时留空,由展示层回落省名。
   */
  where: string

  /**
   * designated:AIP/RCIP/FCIP(可双标);hiring:空串。
   */
  program: string

  /**
   * 名录列明的 NOC;**空 = 名录没写,不是没有限制**(展示「未列明」,筛职业时不许当不匹配剔掉)。
   */
  nocs: string[]

  /**
   * hiring:本站库内在招岗数;designated:null(名录不含在招信息)。
   */
  openJobs: number | null

  /**
   * 名录官方页;hiring 口径为空串。
   */
  url: string
}

/**
 * `EmployerRow` 的复数。
 */
export type EmployerRows = EmployerRow[]

/**
 * 雇主板下拉选项。
 */
export type EmployerFacets = {
  /**
   * 省下拉(看整份数据 —— 切了省也不能把省下拉自己清空)。
   */
  provs: string[]

  /**
   * 制度下拉(看整份数据)。
   */
  programs: string[]

  /**
   * 社区下拉(看**已按省+制度收窄后**的数据,否则 NB 的社区会出现在 SK 的下拉里)。
   */
  cities: string[]

  /**
   * 职业下拉(收窄口径同社区)。
   */
  nocs: string[]
}

/**
 * 职业下拉的人话名(站规:代码不裸奔)。
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
 * 雇主板一页(SSR 与 /api/employers 共用;#313 红线:一次只吐一页,total 报全量)。
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
   * 每页行数。
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
   * 职业码 → 三语人话名;查不到的码不返回,展示层原样显示 5 位码。
   */
  nocTitles: Record<string, NocTitle>
}

/**
 * 雇主侧门槛判定 —— **只声明本域真正读的两格**(state 与 failed;整树归 ruling,
 * 赋值处收 ruling 的 `employerVerdict` 返回值,结构兼容)。
 */
export type SponsorVerdict = {
  /**
   * 整体判定。`unknown` **不是「不满足」** —— 是我们查不到;`public` = 公共部门旁路。
   */
  state: 'met' | 'short' | 'unknown' | 'public'

  /**
   * state='short' 时点名哪几项没达标(年限/雇员数)。
   */
  failed: ('years' | 'staff')[]
}

/**
 * 在招担保雇主一行(B2:在招且有担保凭证 —— AIP 指定 / LMIA 获批 / 紧缺清单命中)。
 * 语义红线循 E6-02:凭证 = 历史事实/官方名录,**非担保承诺**。
 */
export type SponsorEmployerRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 公司页 slug。
   */
  slug: string

  /**
   * 行业。
   */
  industry: string

  /**
   * 中文别名(Wikidata 官方标签,不机翻)。
   */
  aliasZh: string

  /**
   * 韩文别名。
   */
  aliasKo: string

  /**
   * 担保等级;null = 未评。
   */
  sponsorGrade: number | null

  /**
   * 本站库内在招岗数(全国)。
   */
  openJobs: number

  /**
   * 代表城市。
   */
  city: string

  /**
   * 在招岗所在省清单(去重)。
   */
  provs: string[]

  /**
   * 在招岗命中的职业码清单(去重,供职业筛)。
   */
  nocs: string[]

  /**
   * 在招岗所在城市清单(#313 橱窗瘦身时置空 —— 表格不渲不筛)。
   */
  cities: string[]

  /**
   * AIP 指定雇主。
   */
  aip: boolean

  /**
   * 在招岗命中具名省清单。
   */
  named: boolean

  /**
   * AIP 视图专用在招数(Frank 08-08 实指「AIP 不是只在四个省吗」:指定只存在于 NB/NS/PE/NL,
   * 全国在招数会让用户把安省岗也读成 AIP 可用 —— 该视图只计 aip=true 的岗)。
   */
  openJobsAip: number

  /**
   * AIP 视图专用所在省清单(口径同上)。
   */
  provsAip: string[]

  /**
   * LMIA 获批岗位数(历史事实)。
   */
  lmiaPositions: number

  /**
   * 其中技能股获批数;null = 列未回填(🔴 官方可空,不许折 0 —— 折 0 = 替官方编数)。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近一次 LMIA 获批的季度。
   */
  lmiaLastQuarter: string

  /**
   * 近 4 季获批数(B4 时间窗;列未回填时 0)。
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
   * 在招岗命中的具名省清单标签(去重,如「BC 医疗」;Frank 08-08 二拍:PNP 视图=看省提名资质,不挂 LMIA)。
   */
  streams: string[]

  /**
   * 雇主侧门槛判定(公司事实 × 该省官方门槛)。字段没落库/门槛未收录时 state 恒 'unknown',
   * 不是一等公民的报错 —— 消费端(表列)据此判断要不要整列隐藏。
   */
  verdict: SponsorVerdict
}

/**
 * `SponsorEmployerRow` 的复数。
 */
export type SponsorRows = SponsorEmployerRow[]

/**
 * 在招担保雇主筛选(翻页在消费端,不进这里)。
 */
export type SponsorFilters = {
  /**
   * 凭证视图:空串 = 全部。
   */
  f: '' | 'aip' | 'lmia' | 'named'

  /**
   * 省码;空串 = 全部。
   */
  prov: string

  /**
   * 城市;空串 = 全部。
   */
  city: string

  /**
   * 职业码;空串 = 全部。
   */
  noc: string

  /**
   * 雇主名关键词;空串 = 不筛。
   */
  q: string

  /**
   * 排序:在招数 / 技能股获批数。
   */
  sort: 'open' | 'skilled'
}

/**
 * 把脉页橱窗一分表:前 50 行 + 全量数。
 */
export type SponsorBoardData = {
  /**
   * 切前 SE_SSR_ROWS 行(已按该表拍板的序)。
   */
  top: SponsorEmployerRow[]

  /**
   * 该表全量行数。
   */
  total: number
}

/**
 * 把脉页橱窗三分表(#313:lmia/named/aip;SSR 与 /api/employers/sponsors 共用)。
 */
export type SponsorBoards = {
  /**
   * LMIA 表,按新近度排序(Frank 08-08「按最近 LMIA 数排前面」)。
   */
  lmia: SponsorBoardData

  /**
   * 具名省清单表,按 #285 三灯默认序。
   */
  named: SponsorBoardData

  /**
   * AIP 表,保持聚合序。
   */
  aip: SponsorBoardData
}

/**
 * 多雇主对照一行(D3 / E5-06;红线:摆事实不下结论、LMIA=历史事实≠担保,措辞在 i18n)。
 */
export type CompareRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 行业。
   */
  industry: string

  /**
   * 中文别名。
   */
  aliasZh: string

  /**
   * 韩文别名。
   */
  aliasKo: string

  /**
   * 英文维基条目。
   */
  wiki: string

  /**
   * 官网。
   */
  website: string

  /**
   * K 调查五节简介原文。
   */
  aiBrief: string

  /**
   * LMIA 获批岗位数;null = 无记录列。
   */
  lmiaPositions: number | null

  /**
   * 技能股获批数;null = 列未回填(保 null,不折 0)。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近获批季度。
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
   * 主要省的难度档(E12-07 stats.difficulty 同源);null = 未收录。
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
 * `CompareRow` 的复数。
 */
export type CompareRows = CompareRow[]

/**
 * `compareEmployers` 的入参。
 */
export type CompareIn = {
  /**
   * 能打 SQL 的东西(拍板③:db 只在边缘入口)。
   */
  db: Db

  /**
   * 要对照的雇主名(未去重未截断,函数里收窄到 CMP_MAX 家)。
   */
  names: string[]

  /**
   * 已归一的档案(信任边界在路由收窄:`normalizeProfile` 在调用方做);null = 未建档。
   */
  profile: MatchProfile | null

  /**
   * 匹配维度表;null = 加载失败,跳过「与我的匹配」两列。
   */
  dims: MatchDims | null
}

/**
 * `compareEmployers` 的返回。
 */
export type CompareOut = Promise<CompareRow[]>

/**
 * 单公司背调结果(K 调查;缓存 = companies.ai_* 四列,永久)。
 */
export type CompanyResearch = {
  /**
   * 五节固定标记简介([WHAT][BASE][SIZE][FOUNDED][NOTE],缺项 (not stated))。
   */
  brief: string

  /**
   * 官网;空串 = 结果没给。
   */
  website: string

  /**
   * 检索来源 URL 清单。
   */
  sources: string[]

  /**
   * 调查日期(YYYY-MM-DD)。
   */
  fetched: string
}

/**
 * `companyRow` 的入参。
 */
export type CompanyRowIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 雇主名(按名取缓存行,大小写不敏感)。
   */
  name: string
}

/**
 * 公司缓存行:主键 + 已缓存的调查(null = 没查过或旧版格式待重查)。
 */
export type CompanyCacheRow = {
  /**
   * companies 主键。
   */
  id: number

  /**
   * 已缓存的调查;null = 无缓存(下次打开自动重查一次)。
   */
  cached: CompanyResearch | null
}

/**
 * `companyRow` 的返回:缓存行;不在库且懒建失败则 null。
 */
export type CompanyRowOut = Promise<CompanyCacheRow | null>

/**
 * `investigateCompany` 的入参。
 */
export type InvestigateIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * companies 主键(调查结果回写这一行)。
   */
  id: number

  /**
   * 雇主名。
   */
  name: string
}

/**
 * `investigateCompany` 的返回:调查结果;查不到如实回 null(反编)。
 */
export type InvestigateOut = Promise<CompanyResearch | null>

/**
 * Wikidata 懒查命中:官方跨语言标签 + 英文维基条目。
 */
export type WikidataHit = {
  /**
   * 简体中文标签;没有则空串。
   */
  zh: string

  /**
   * 韩文标签;没有则空串。
   */
  ko: string

  /**
   * 英文维基条目 URL。
   */
  wiki: string
}

/**
 * 职业目录一行(/occupations;照 lib/rankings 模式,零计算只 SELECT)。
 */
export type OccRow = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道。
   */
  stream: string

  /**
   * 通道人话名。
   */
  label: string

  /**
   * 清单类型。
   */
  type: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * 官方清单页。
   */
  url: string

  /**
   * 抓取日(YYYY-MM-DD)。
   */
  fetched: string
}

/**
 * `fetchOccupations` 的返回。
 */
export type OccRowsOut = Promise<OccRow[]>

/**
 * URL 参数取值器(SSR 的 searchParams 与 API 的 URLSearchParams 都收敛成这一个形状)。
 */
export type ParamGetter = (k: string) => string | null

/**
 * `normalizeEmployerFilters` 的入参。
 */
export type NormalizeFiltersIn = {
  /**
   * 参数取值器。
   */
  get: ParamGetter

  /**
   * mode 参数缺席/不合法时的默认口径(入口契约:路径段即口径)。
   */
  defMode: EmployerMode
}

/**
 * `clip` 的入参:一格 URL 参数收窄成定长干净串。
 */
export type ClipIn = {
  /**
   * 原始值;null = 参数缺席。
   */
  value: string | null

  /**
   * 保留长度上限。
   */
  max: number
}

/**
 * `nocMatches` 的入参。
 */
export type NocMatchesIn = {
  /**
   * 该行列明的职业码(空数组 = 名录没写)。
   */
  rowNocs: string[]

  /**
   * 选中的职业码;空串 = 没筛职业。
   */
  noc: string
}

/**
 * `programMatches` 的入参。
 */
export type ProgramMatchesIn = {
  /**
   * 该行的制度值(可双标,如 'RCIP+FCIP')。
   */
  rowProgram: string

  /**
   * 选中的制度;空串 = 没筛制度。
   */
  program: string
}

/**
 * `applyEmployerFilters` 的入参。
 */
export type ApplyEmployerFiltersIn = {
  /**
   * 全量行。
   */
  rows: EmployerRow[]

  /**
   * 筛选。
   */
  filters: EmployerFilters
}

/**
 * `employerFacets` 的入参。
 */
export type EmployerFacetsIn = {
  /**
   * 全量行(下拉选项从全量算,不从筛后算)。
   */
  rows: EmployerRow[]

  /**
   * 当前筛选(社区/职业下拉按省+制度收窄要用)。
   */
  filters: EmployerFilters
}

/**
 * `pageSlice` 的入参。
 */
export type PageSliceIn = {
  /**
   * 筛选后的全量行。
   */
  rows: EmployerRow[]

  /**
   * 页码,0 起(负数当 0)。
   */
  page: number

  /**
   * 每页行数。
   */
  size: number
}

/**
 * `loadEmployerPage` 的入参。
 */
export type LoadEmployerPageIn = {
  /**
   * 能打 SQL 的东西;null = 池没拿到(照出空表,绝不 500)。
   */
  db: Db | null

  /**
   * 规范化后的筛选。
   */
  filters: EmployerFilters

  /**
   * 每页行数(API 允许调,SSR 用 EMP_SSR_ROWS)。
   */
  pageSize: number
}

/**
 * `loadEmployerPage` 的返回。
 */
export type LoadEmployerPageOut = Promise<EmployerPage>

/**
 * Next 服务端组件的 searchParams 形状(Next 定死:缺席参数是 undefined)。
 */
// eslint-disable-next-line local/no-undefined-type -- 别人家的形状:Next 的 searchParams 缺席参数就是 undefined,这格只是照实描述
export type SearchParams = Record<string, string | string[] | undefined>

/**
 * `employersBoardProps` 的入参。
 */
export type BoardPropsIn = {
  /**
   * 页面收到的 searchParams(已 await)。
   */
  sp: SearchParams

  /**
   * 口径,由**路径段**定(/employers/designated 与 /employers/hiring 两个入口)。
   */
  mode: EmployerMode

  /**
   * 能打 SQL 的东西;null = 池没拿到(照出空表)。
   */
  db: Db | null
}

/**
 * 雇主板 SSR 首屏:第一页 + 预置筛选。
 */
export type BoardProps = {
  /**
   * 第一页数据。
   */
  initial: EmployerPage

  /**
   * 预置筛选(入口契约:/employers/designated?program=…&prov=… 必须直达且预置)。
   */
  initialFilters: EmployerFilters
}

/**
 * `employersBoardProps` 的返回。
 */
export type BoardPropsOut = Promise<BoardProps>

/**
 * `fetchSponsorEmployers` / `fetchAllDesignated` 这类带缓存取数的返回。
 */
export type SponsorRowsOut = Promise<SponsorEmployerRow[]>

/**
 * 字符串清单(数组进签名要有自己的名字:探测列名、职业码清单都用它)。
 */
export type StrList = string[]

/**
 * 库里的字符串数组格(array_agg 列;null = 没有)。
 */
export type StrListCell = string[] | null

/**
 * 省码 → 岗数的计数表(对照页主要省用)。
 */
export type ProvTally = Record<string, number>

/**
 * 名录整表缓存的一份。
 */
export type DesignatedSlot = {
  /**
   * 灌入时刻(Date.now())。
   */
  at: number

  /**
   * 整表行。
   */
  rows: DesignatedRow[]
}

/**
 * 担保聚合整表缓存的一份。
 */
export type SponsorSlot = {
  /**
   * 灌入时刻(Date.now())。
   */
  at: number

  /**
   * 整表行。
   */
  rows: SponsorEmployerRow[]
}

/**
 * 雇主域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type EmployersCache = {
  /**
   * 指定雇主名录整表;null = 冷。
   */
  designated: DesignatedSlot | null

  /**
   * 名录刷新的单飞 promise;null = 没有在飞的。
   */
  designatedInflight: Promise<DesignatedRow[]> | null

  /**
   * 在招担保雇主聚合整表;null = 冷。
   */
  sponsors: SponsorSlot | null

  /**
   * 担保聚合刷新的单飞 promise;null = 没有在飞的。
   */
  sponsorsInflight: Promise<SponsorEmployerRow[]> | null

  /**
   * 背调同名并发合流:公司名 → 在飞的调查(一家公司全站只查一次)。
   */
  research: Map<string, Promise<CompanyResearch | null>>

  /**
   * 橱窗三分表(/api/employers/sponsors)。开机是空的。
   */
  boards: BoardsSlot | null
}

/**
 * `fetchAllDesignated` 的返回。
 */
export type DesignatedRowsOut = Promise<DesignatedRow[]>

/**
 * `applySponsorFilters` 的入参。
 */
export type ApplySponsorFiltersIn = {
  /**
   * 缓存全量行(共享,绝不原地排序 —— 排序前先浅拷贝)。
   */
  rows: SponsorEmployerRow[]

  /**
   * 筛选与排序。
   */
  filters: SponsorFilters
}

/**
 * `toSponsorRow` 的入参:SQL 原始行 + 已算好的判定(判定是业务,rows.ts 不做)。
 */
export type ToSponsorRowIn = {
  /**
   * `sponsorEmployers` SQL 的原始行。
   */
  row: SponsorDbRow

  /**
   * 雇主侧门槛判定(边缘算好传进来)。
   */
  verdict: SponsorVerdict
}

/**
 * 职业码与它的三语名(`toNocTitlePair` 的返回,调用处折成 Record)。
 */
export type NocTitlePair = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 三语名。
   */
  title: NocTitle
}

/**
 * 对照行的岗位聚合(边缘在 400 行封顶的岗清单上算好,rows.ts 只拼装)。
 */
export type CompareAgg = {
  /**
   * 有 AIP 标记的在招岗。
   */
  aip: boolean

  /**
   * 在库开放岗数。
   */
  openJobs: number

  /**
   * 平均分;null = 无可平均的岗。
   */
  avgScore: number | null

  /**
   * 具名省清单命中的岗数。
   */
  namedJobs: number

  /**
   * 年薪中位数;null = 无薪资数据。
   */
  medSalary: number | null

  /**
   * 主要省(开放岗最多的省);空串 = 无岗。
   */
  mainProvince: string

  /**
   * 高匹配岗数;null = 未建档/未算。
   */
  matchHigh: number | null

  /**
   * 中匹配岗数;null = 未建档/未算。
   */
  matchMid: number | null
}

/**
 * `toCompareRow` 的入参。
 */
export type ToCompareRowIn = {
  /**
   * `COMPANIES_FOR_COMPARE` 的原始行。
   */
  company: CompareCompanyDbRow

  /**
   * 该公司的岗位聚合。
   */
  agg: CompareAgg
}

/**
 * `DESIGNATED_ALL` 的原始行(consult 惯例:一条 SQL 一个列形状,收窄只在映射里做一次)。
 */
export type DesignatedDbRow = {
  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 社区/城市。
   */
  location: string | null

  /**
   * 制度。
   */
  source: string | null

  /**
   * 逗号分隔 NOC 原文。
   */
  nocs: string | null

  /**
   * 名录官方页。
   */
  url: string | null

  /**
   * 抓取日(库里两种写法:20260419 / 2026-04-19,映射时归一)。
   */
  fetched: string | null
}

/**
 * `HIRING_EMPLOYERS` 的原始行。
 */
export type HiringDbRow = {
  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 城市。
   */
  location: string | null

  /**
   * 在招岗数(pg 计数常回字符串)。
   */
  n: number | string | null
}

/**
 * `NOC_TITLES_FOR_EMPLOYERS` 的原始行。
 */
export type NocTitleDbRow = {
  /**
   * 职业码。
   */
  noc: string | null

  /**
   * 英文名。
   */
  en: string | null

  /**
   * 中文名。
   */
  zh: string | null

  /**
   * 韩文名。
   */
  ko: string | null
}

/**
 * `PNP_OCCUPATIONS_ALL` 的原始行。
 */
export type OccDbRow = {
  /**
   * 省码。
   */
  province: string | null

  /**
   * 通道。
   */
  stream: string | null

  /**
   * 通道人话名。
   */
  label: string | null

  /**
   * 清单类型。
   */
  type: string | null

  /**
   * 职业码。
   */
  noc: string | null

  /**
   * 职业名。
   */
  name: string | null

  /**
   * 官方清单页。
   */
  url: string | null

  /**
   * 抓取时刻(映射时截到十位)。
   */
  fetched: string | null
}

/**
 * `COMPANIES_HAS_COLUMNS` 的原始行(B3 公司事实列逐列探测)。
 */
export type ColumnDbRow = {
  /**
   * information_schema 里的列名。
   */
  column_name: string | null
}

/**
 * `PNP_REQ_EMPLOYER` 的原始行(雇主侧门槛)。
 */
export type ReqDbRow = {
  /**
   * 省码。
   */
  province: string | null

  /**
   * 门槛项。
   */
  factor: string | null

  /**
   * 比较符。
   */
  op: string | null

  /**
   * 阈值(pg numeric 常回字符串)。
   */
  value: number | string | null

  /**
   * 单位。
   */
  unit: string | null

  /**
   * 适用地区。
   */
  applies_area: string | null
}

/**
 * `sponsorEmployers` 聚合 SQL 的原始行(B4 公司事实五列是探测列,大概率缺席 —— 缺时值为
 * undefined,映射函数用 `== null` 一网兜住)。
 */
export type SponsorDbRow = {
  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 公司页 slug。
   */
  slug: string | null

  /**
   * 行业。
   */
  industry: string | null

  /**
   * 中文别名。
   */
  alias_zh: string | null

  /**
   * 韩文别名。
   */
  alias_ko: string | null

  /**
   * 担保等级。
   */
  sponsor_grade: number | string | null

  /**
   * 在招岗数。
   */
  open_jobs: number | string | null

  /**
   * 代表城市。
   */
  city: string | null

  /**
   * 在招岗所在省(array_agg)。
   */
  provs: string[] | null

  /**
   * 在招岗职业码(array_agg)。
   */
  nocs: string[] | null

  /**
   * 在招岗城市(array_agg)。
   */
  cities: string[] | null

  /**
   * AIP 指定。
   */
  aip: boolean | null

  /**
   * 具名省清单命中。
   */
  named: boolean | null

  /**
   * AIP 视图在招数。
   */
  open_jobs_aip: number | string | null

  /**
   * AIP 视图所在省(array_agg)。
   */
  provs_aip: string[] | null

  /**
   * LMIA 获批岗位数。
   */
  lmia_positions: number | string | null

  /**
   * 技能股获批数(🔴 官方可空,保 null)。
   */
  lmia_positions_skilled: number | string | null

  /**
   * 最近获批季度。
   */
  lmia_last_quarter: string | null

  /**
   * 近 4 季获批数。
   */
  lmia_positions_4q: number | string | null

  /**
   * 近 2 季获批数。
   */
  lmia_positions_2q: number | string | null

  /**
   * 近 1 季获批数。
   */
  lmia_positions_1q: number | string | null

  /**
   * 具名省清单标签(array_agg)。
   */
  streams: string[] | null

  /**
   * 成立年份(探测列,B3 未建 DDL 时整列缺席)。
   */
  founded_year: number | string | null

  /**
   * 在册状态(探测列)。
   */
  registry_status: string | null

  /**
   * 雇员数估计(探测列)。
   */
  staff_est: number | string | null

  /**
   * 估算来源(探测列)。
   */
  staff_est_src: string | null

  /**
   * 部门(探测列;'public' = 公共部门旁路)。
   */
  sector: string | null
}

/**
 * 带 companies 主键的行(主键格的最小共同形状)。
 */
export type IdCell = {
  /**
   * companies 主键(pg 可能回字符串)。
   */
  id: number | string | null
}

/**
 * `COMPANY_AI_BRIEF` 的原始行(K 调查缓存四列)。
 */
export type CompanyBriefDbRow = {
  /**
   * companies 主键。
   */
  id: number | string | null

  /**
   * 五节简介缓存。
   */
  ai_brief: string | null

  /**
   * 官网缓存。
   */
  ai_website: string | null

  /**
   * 来源清单缓存(JSON 文本)。
   */
  ai_sources: string | null

  /**
   * 调查时刻。
   */
  ai_fetched: string | null
}

/**
 * `COMPANIES_FOR_COMPARE` 的原始行。
 */
export type CompareCompanyDbRow = {
  /**
   * companies 主键。
   */
  id: number | string | null

  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 行业。
   */
  industry: string | null

  /**
   * 中文别名。
   */
  alias_zh: string | null

  /**
   * 韩文别名。
   */
  alias_ko: string | null

  /**
   * 英文维基条目。
   */
  wiki_url: string | null

  /**
   * 官网(人工/ETL 列)。
   */
  website: string | null

  /**
   * K 调查简介。
   */
  ai_brief: string | null

  /**
   * K 调查官网。
   */
  ai_website: string | null

  /**
   * LMIA 获批岗位数。
   */
  lmia_positions: number | string | null

  /**
   * 技能股获批数(保 null)。
   */
  lmia_positions_skilled: number | string | null

  /**
   * 最近获批季度。
   */
  lmia_last_quarter: string | null
}

/**
 * `COMPANY_JOBS_FOR_COMPARE` 的原始行(封顶 400 行,防超大雇主拖垮)。
 */
export type CompareJobDbRow = {
  /**
   * 职业码。
   */
  noc: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 粗筛信号。
   */
  pnp_eligible: boolean | null

  /**
   * 具名省清单命中。
   */
  pnp_stream: string | null

  /**
   * EE 类别命中。
   */
  ee_category: string | null

  /**
   * 年薪。
   */
  salary_annual: number | string | null

  /**
   * 该职业省中位年薪。
   */
  wage_med_annual: number | string | null

  /**
   * 旧 0-100 分(对照页均值用)。
   */
  score: number | string | null

  /**
   * AIP 标记。
   */
  aip: boolean | null
}

/**
 * 职业码 → 三语名的映射表。
 */
export type NocTitleMap = Record<string, NocTitle>

/**
 * `nocTitlesOf` 的入参。
 */
export type NocTitlesIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 要查人话名的职业码(函数里过 5 位校验并封顶)。
   */
  codes: string[]
}

/**
 * `nocTitlesOf` 的返回。
 */
export type NocTitlesOut = Promise<NocTitleMap>

/**
 * `emptyEmployerPage` 的入参。
 */
export type EmptyPageIn = {
  /**
   * 当前筛选(空表也要回显它)。
   */
  filters: EmployerFilters

  /**
   * 每页行数。
   */
  pageSize: number
}

/**
 * `teerOf` 的返回:5 位码第二位;不是像样的码则 null。
 */
export type MaybeTeer = number | null

/**
 * 对照页岗位一行的干净形状(`COMPARE_JOBS` 映射后)。
 */
export type CompareJob = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 省码。
   */
  province: string

  /**
   * 粗筛信号。
   */
  pnpEligible: boolean

  /**
   * 具名省清单命中;空串 = 没有。
   */
  pnpStream: string

  /**
   * EE 类别命中;空串 = 没有。
   */
  eeCategory: string

  /**
   * 年薪;null = 没写。
   */
  salaryAnnual: number | null

  /**
   * 该职业省中位年薪;null = 未收录。
   */
  wageMedAnnual: number | null

  /**
   * 旧 0-100 分;null = 未评。
   */
  score: number | null

  /**
   * AIP 标记。
   */
  aip: boolean
}

/**
 * `companyAggOf` 的入参。
 */
export type CompanyAggIn = {
  /**
   * 该公司的开放岗(封顶 400 行)。
   */
  jobs: CompareJob[]

  /**
   * 已归一的档案;null = 未建档(跳过匹配两列)。
   */
  profile: MatchProfile | null

  /**
   * 匹配维度表;null = 加载失败(跳过匹配两列)。
   */
  dims: MatchDims | null
}

/**
 * `difficultyPairOf` 的返回:省与难度档。
 */
export type DifficultyPair = {
  /**
   * 省码。
   */
  province: string

  /**
   * 难度档;null = 未收录/解析不出。
   */
  tier: string | null
}

/**
 * named 表排序用的装饰行:比较器只读现成值,派生值由构建方先算好挂上
 * (宪法:比较器体内只许读,不许查表)。
 */
export type RankedSponsor = {
  /**
   * 原行。
   */
  row: SponsorEmployerRow

  /**
   * 灯①雇主资格序:met=0 → unknown/public=1 → short=2。
   */
  rank: number

  /**
   * 灯②担保行为记录:有 LMIA 获批或 AIP 指定 = 1。
   */
  rec: number
}

/**
 * `AbortSignal` 的本地名(库类型先起本地名,签名里不出现外部类型)。
 */
export type AbortHandle = AbortSignal

/**
 * `wdGet` 的入参。
 */
export type WdGetIn = {
  /**
   * Wikidata API 查询参数(format=json 由函数补)。
   */
  params: Record<string, string>

  /**
   * 超时中断句柄。
   */
  signal: AbortHandle
}

/**
 * Wikidata 两种动作共用的信封(search 动作有 search 格,entities 动作有 entities 格)。
 */
export type WdEnvelope = {
  /**
   * wbsearchentities 的候选;非该动作时缺席。
   */
  search: WdSearchHit[] | null

  /**
   * wbgetentities 的实体表;非该动作时缺席。
   */
  entities: Record<string, WdEntity> | null
}

/**
 * `wdGet` 的返回。
 */
export type WdGetOut = Promise<WdEnvelope>

/**
 * Wikidata 检索候选(只读 id 一格)。
 */
export type WdSearchHit = {
  /**
   * 实体号(Q…)。
   */
  id: string | null
}

/**
 * Wikidata 实体(只声明本域读的三格)。
 */
export type WdEntity = {
  /**
   * 语言 → 标签。
   */
  labels: Record<string, WdLabel> | null

  /**
   * 语言 → 别名清单。
   */
  aliases: Record<string, WdLabel[]> | null

  /**
   * 站点 → 条目链接。
   */
  sitelinks: Record<string, WdSitelink> | null
}

/**
 * Wikidata 标签/别名一格。
 */
export type WdLabel = {
  /**
   * 文本值。
   */
  value: string | null
}

/**
 * Wikidata 条目链接。
 */
export type WdSitelink = {
  /**
   * 条目标题。
   */
  title: string | null
}

/**
 * `entityNameHits` 的入参。
 */
export type EntityNameHitsIn = {
  /**
   * 候选实体。
   */
  entity: WdEntity

  /**
   * 归一后的目标公司名。
   */
  target: string
}

/**
 * 命中或没有(`wikidataHitOf` 的返回)。
 */
export type WikidataHitOrNull = WikidataHit | null

/**
 * `wikidataLookup` 的返回:命中;查不到/超时/掉线则 null(不重试,一家公司一生一次)。
 */
export type WikidataOut = Promise<WikidataHit | null>

/**
 * `PROV_DIFFICULTY_ANY` 的原始行(E12-07 难度档)。
 */
export type DifficultyDbRow = {
  /**
   * 省码。
   */
  province: string | null

  /**
   * 难度 JSON(列类型 json 时驱动已解析成对象,jsonb 文本时是字符串 —— 映射函数两头都接)。
   */
  difficulty: string | DifficultyObj | null
}

/**
 * 难度 JSON 解析后的对象(只读 tier 一格)。
 */
export type DifficultyObj = {
  /**
   * 难度档。
   */
  tier: string | null
}

/**
 * 橱窗三分表缓存一格(/api/employers/sponsors 的 10 分钟进程缓存)。
 */
export type BoardsSlot = {
  /**
   * 三分表本体。
   */
  v: SponsorBoards

  /**
   * 落格时刻(ms)。
   */
  ts: number
}

/**
 * POST /api/employers/info 的请求体形状(跨边界断言目标,逐格判后才用)。
 */
export type InfoBody = {
  /**
   * 公司名;不是字符串就当没带。
   */
  name: string | null
}

/**
 * 可缺位的数（CSV 数值格词汇的入参；库里可空列的本域名字）。
 */
export type MaybeNum = number | null
