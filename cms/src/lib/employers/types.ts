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

// 🔵 2026-08-25 Frank 落锤清账:ruling(EmployerFacts/EmployerVerdict/ReqRow)与
// jobs(MatchDims/MatchProfile)的五个跨域 type import 全撤,按「先自己写自己的,
// 等最后都稳定了再看要不要抽公共层」改为本域自声明 —— 引擎收的是结构,全格照抄即兼容;
// EmployerVerdict 不再另立,判定函数直接用本域 SponsorVerdict 收返回值(state/failed ⊆ 引擎返回)。
import type { Db } from '../db'

/**
 * 雇主板排序主键(与 constants.POOL_SORTS 逐字对齐;SQL 片段按键取)。
 */
export type PoolSort = 'star' | 'open' | 'designated' | 'name' | 'sector' | 'province' | 'city' | 'lmia'

/**
 * 排序方向(与 constants.POOL_DIRS 逐字对齐)。
 */
export type PoolDir = 'asc' | 'desc'

/**
 * 雇主板筛选(SSR 与 /api/employers 共用一份;2026-09-13 雇主板批二自 designated/hiring 双口径换成雇主池)。
 * 三个态由它推出:q 非空 = 查证态(全库按名搜);group 非空 = 榜态;都空 = 首屏只出选择器。
 */
export type PoolFilters = {
  /**
   * 行业组键(POOL_GROUPS 之一);空串 = 没选(首屏)。
   */
  group: string

  /**
   * 省码;空串 = 全国。
   */
  prov: string

  /**
   * 主市(英文市名);空串 = 不筛。只在选了省时才有值。
   */
  city: string

  /**
   * 主区;空串 = 不筛。只在选了市时才有值。
   */
  district: string

  /**
   * 在招 EE 类别(联邦 EE 类别标签);空串 = 不筛。
   */
  ee: string

  /**
   * 雇主类别(POOL_SECTORS 之一,`private` = 库里 NULL 的那批);空串 = 不筛。
   */
  sector: string

  /**
   * 公司分类(POOL_CATEGORIES 之一);空串 = 不筛。
   */
  category: string

  /**
   * 制度(AIP | RCIP | FCIP,直达参数);空串 = 不筛。
   */
  program: string

  /**
   * 5 位职业码(直达参数;SSR 一次性换算成组,不做行筛选);空串 = 没带。
   */
  noc: string

  /**
   * 只看无经验可投(桶内入门岗 > 0)。
   */
  entry: boolean

  /**
   * 只看有技能类 LMIA 记录(组切面看桶内份数,全组看池行总量)。
   */
  lmia: boolean

  /**
   * 雇主名关键词(已去掉 SQL 通配符);空串 = 不搜。
   */
  q: string

  /**
   * 排序主键。
   */
  sort: PoolSort

  /**
   * 排序方向(缺席时取该键的默认方向)。
   */
  dir: PoolDir

  /**
   * 页码,0 起。
   */
  page: number
}

/**
 * 雇主板一行事实 = 雇主池行 × 它在当前行业组的桶行(查证态取星级最高的桶)。
 */
export type PoolRow = {
  /**
   * 池主键(slug 或 n:归一名)。
   */
  key: string

  /**
   * 公司详情页 slug;null = 三源独有、没有公司页。
   */
  slug: string | null

  /**
   * 雇主名。
   */
  name: string

  /**
   * 官网(只留 http / https 链接);空串 = 没有(雇主名不成链)。
   */
  website: string

  /**
   * 进过探索队列没(板上据此决定要不要替这一行报「被列出过」)。
   */
  explored: boolean

  /**
   * 行业(companies.sectors);null = 无源。
   */
  industry: string | null

  /**
   * 雇主类别(federal / government / municipal / indigenous / public);空串 = 私营(库里 NULL)。
   */
  sector: string

  /**
   * 公司分类键(POOL_CATEGORIES 之一;私营 = 模型判的优先、没有才是按在招岗反推的);空串 = 判不出。
   */
  category: string

  /**
   * 主省码;空串 = 池里没记。
   */
  province: string

  /**
   * 主市;空串 = 池里没记。
   */
  city: string

  /**
   * 主区(主市的在招岗里出现最多的区);空串 = 岗都没带区。
   */
  district: string

  /**
   * 公司地址(总部列的地图链接直接定位到它);空串 = 没记(地图退回查「区, 市, 省」)。
   */
  address: string

  /**
   * 主市的人工核定中文译名(cities.name_zh;2026-09-13 地点列接 CityNameCell 双行形);空串 = 译名表外。
   */
  cityZh: string

  /**
   * 主市的人工核定韩文译名(cities.name_ko);空串 = 译名表外。
   */
  cityKo: string

  /**
   * 多地点(「市, 省码」,主场第一,最多三处;板上只显主场,其余收「另 N 地」)。
   */
  locations: string[]

  /**
   * 指定资格所在地(「项目|地点」:AIP|NB、RCIP|Sudbury, ON);空表 = 非指定 / 名单没给地点。
   */
  designatedPlaces: string[]

  /**
   * 在招 EE 类别(联邦 EE 类别标签,岗多的在前);空表 = 没有在招 / 都不属 EE 类别。板上「类别」列读它。
   */
  eeKeys: string[]

  /**
   * 指定雇主命中(AIP/RCIP/FCIP 任一)。
   */
  designated: boolean

  /**
   * 命中的项目清单(徽章灰注)。
   */
  programs: string[]

  /**
   * 指定归属省清单(AIP 按省给资格;主场在多伦多的雇主也可能持 NS 的 AIP 指定)。
   */
  designatedProvinces: string[]

  /**
   * 全桶在招总岗数。
   */
  openJobsTotal: number

  /**
   * 池构建日(YYYY-MM-DD)。
   */
  fetched: string

  /**
   * 公司官方中文名(companies.alias_zh,维基取的);空串 = 没有(名下不出灰注)。
   */
  aliasZh: string

  /**
   * 公司官方韩文名;空串 = 没有。
   */
  aliasKo: string

  /**
   * 这一行所在的行业组键(查证态 = 星级最高的桶;'' = 无线索通用桶,other = 未分类岗桶)。
   */
  group: string

  /**
   * 桶内在招岗数。
   */
  openJobs: number

  /**
   * 桶内最新发布日;null = 无在招。
   */
  latestPosted: string | null

  /**
   * 桶内主要职业名(频次前 N)。
   */
  topTitles: string[]

  /**
   * 入门可及岗数。
   */
  entryJobs: number

  /**
   * 入门占比(百分比整数);null = 无在招不表态。
   */
  entryShare: number | null

  /**
   * 桶内已知最低经验档;null = 全 unknown 不表态。
   */
  minExperience: string | null

  /**
   * 桶内技能类 LMIA 获批份数。
   */
  lmiaSkilled: number

  /**
   * 桶内最近 LMIA 获批季;null = 无记录。
   */
  lmiaLastQuarter: string | null

  /**
   * 切面星 1-5(数据层算死;板只读)。
   */
  star: number

  /**
   * 桶内年薪中位;null = 无薪资数据。
   */
  wageMedAnnual: number | null

  /**
   * 工资水位(vs 同组同省中位的百分比,100 = 持平);null = 分母缺。
   */
  wageIndexPct: number | null
}

/**
 * `PoolRow` 的复数。
 */
export type PoolRows = PoolRow[]

/**
 * 雇主板一页(SSR 与 /api/employers 共用;#313 红线:一次只吐一页,total 报全量)。
 */
export type PoolPage = {
  /**
   * 本页的行。
   */
  rows: PoolRow[]

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
   * 省下拉的选项(池里雇主的主省分布;进程内 TTL 缓存)。
   */
  provs: string[]

  /**
   * 市下拉的选项(当前省里雇主的主市,雇主多的在前);没选省 = 空数组。
   */
  cities: string[]

  /**
   * 区下拉的选项(当前市里雇主的主区,雇主多的在前);没选市、或这个市的雇主都没有区 = 空数组。
   */
  districts: string[]

  /**
   * 「全部类别」下拉的选项(联邦 EE 类别标签,覆盖雇主多的在前)。
   */
  ees: string[]

  /**
   * 池构建日(本页最新一行的;'' = 本页无行)。
   */
  fetched: string
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
   * AIP 岗(aip=true,数据层已含 TEER 0-4 门)的 NOC 清单(去重);把脉页 AIP 表「在招职业」只列它(2026-09-05)。
   */
  nocsAip: string[]

  /**
   * 是不是连锁:在招岗覆盖大西洋以外 ≥ CHAIN_PROVS_MIN 省(2026-09-05 Frank 拆本地/连锁两表)。
   */
  chain: boolean

  /**
   * RCIP 岗数:岗在 RCIP 社区且雇主在该社区指定名单(2026-09-06,把脉页 RCIP 表的「在招」)。
   */
  openJobsRcip: number

  /**
   * RCIP 岗的 NOC 清单(去重)。
   */
  nocsRcip: string[]

  /**
   * FCIP 岗数(口径同 RCIP)。
   */
  openJobsFcip: number

  /**
   * FCIP 岗的 NOC 清单(去重)。
   */
  nocsFcip: string[]

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
   * 雇主类别(government / public / '' = 私营;数据层按名字规则算,2026-09-05)。
   */
  sector: string

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

  /**
   * RCIP / FCIP 那张:社区指定雇主且在该社区有在招岗(2026-09-06;只有社区指定资格的雇主不在前三张里,
   * 把脉页 RCIP / FCIP 表从这张取)。
   */
  pilot: SponsorBoardData
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
 * 分型码 —— 本域自声明(2026-08-25 撤 jobs 跨域 import;MatchProfile 的一格)。
 */
export type CurrentStatus = 'overseas' | 'studying' | 'working' | 'jobhunting' | 'pr'

/**
 * 匹配档案 —— **本域全格照抄**(2026-08-25 撤 jobs 跨域 import;整份要喂给 jobs 的
 * match 引擎,少一格结构就不兼容,不做「只声明真读的格」瘦身)。
 */
export type MatchProfile = {
  /**
   * 自报职业码。
   */
  nocCodes: string[]

  /**
   * 语言 CLB;null = 未填。
   */
  clb: number | null

  /**
   * 自报 CRS;null = 未填。
   */
  crs: number | null

  /**
   * 目标省(偏好不是资格)。
   */
  targetProvinces: string[]

  /**
   * PGWP 剩余月数;null = 未填。
   */
  pgwpMonthsLeft: number | null

  /**
   * 分型;null = 未填。
   */
  currentStatus: CurrentStatus | null
}

/**
 * 省提名职业清单维度一行 —— 本域全格照抄(MatchDims 的嵌套格,同上判)。
 */
export type PnpOccDim = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道人话名。
   */
  label: string

  /**
   * 清单类型(ineligible=排除)。
   */
  type: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * EE 类别维度一行 —— 本域全格照抄(MatchDims 的嵌套格,同上判)。
 */
export type EeCatDim = {
  /**
   * 类别 slug。
   */
  category: string

  /**
   * 类别人话名。
   */
  label: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 上次抽选 CRS;null = 无记录。
   */
  drawCrs: number | null

  /**
   * 上次抽选日期。
   */
  drawDate: string

  /**
   * 官方页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * 匹配维度表 —— 本域全格照抄(2026-08-25 撤 jobs 跨域 import;整张喂给 match 引擎)。
 */
export type MatchDims = {
  /**
   * 省提名职业清单维度。
   */
  pnpOccupations: PnpOccDim[]

  /**
   * EE 类别维度。
   */
  eeCategories: EeCatDim[]
}

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
 * `loadOccupations` 的返回。
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
  filters: PoolFilters

  /**
   * 每页行数(API 允许调,SSR 用 EMP_SSR_ROWS)。
   */
  pageSize: number
}

/**
 * `loadEmployerPage` 的返回。
 */
export type LoadEmployerPageOut = Promise<PoolPage>

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
  initial: PoolPage

  /**
   * 预置筛选(入口契约:/employers?prov=…&noc=… / ?program=… 直达且预置;noc 已换算成 group)。
   */
  initialFilters: PoolFilters
}

/**
 * `employersBoardProps` 的返回。
 */
export type BoardPropsOut = Promise<BoardProps>

/**
 * `loadSponsorEmployers` / `fetchAllDesignated` 这类带缓存取数的返回。
 */
export type SponsorRowsOut = Promise<SponsorEmployerRow[]>

/**
 * 判定要吃的公司事实 —— **本域自声明**(2026-08-25 撤 ruling 跨域 import;
 * `toEmployerFacts` 构造它、整份喂给注入的判定引擎,全格照抄)。
 */
export type EmployerFacts = {
  /**
   * 成立年份;查不到就是 null,判定落 unknown(08-10 三路实测多数无源,已结案)。
   */
  foundedYear: number | null

  /**
   * 在册状态;仅透传展示,判定不吃它。
   */
  registryStatus: string | null

  /**
   * 雇员数估计;估计值不许当官方数用,措辞层要说清是估的。
   */
  staffEst: number | null

  /**
   * 估算来源(懒查 AI / Wikidata),只标注证据性质。
   */
  staffEstSrc: string | null

  /**
   * 'public' = 公共部门,整体旁路。
   */
  sector: string | null
}

/**
 * 门槛条文管的是申请人侧还是雇主侧(ReqRow 的一格)。
 */
export type SubjectKind = 'applicant' | 'employer'

/**
 * 判定引擎认的门槛行 —— **本域全格照抄**(2026-08-25 撤 ruling 跨域 import;
 * `toEmployerReq` 构造它:判定用不到的列给空值占位,阈值官方可空 `numOrNull` 保 null)。
 */
export type ReqRow = {
  /**
   * 省码。
   */
  province: string

  /**
   * 制度(本域恒 'PNP')。
   */
  program: string

  /**
   * 通道(本域不分通道,空串占位)。
   */
  stream: string

  /**
   * 申请人侧/雇主侧(本域恒 'employer')。
   */
  subject: SubjectKind

  /**
   * 门槛项。
   */
  factor: string

  /**
   * 比较符(库里空则缺省 '>=')。
   */
  op: string

  /**
   * 阈值;官方可空保 null,折 0 = 替官方编数。
   */
  value: number | null

  /**
   * 阈值原文(本域空串占位)。
   */
  valueText: string

  /**
   * 单位。
   */
  unit: string

  /**
   * 适用 TEER(本域空串占位)。
   */
  appliesTeer: string

  /**
   * 适用职业码(本域空串占位)。
   */
  appliesNoc: string

  /**
   * 排除职业码(本域空串占位)。
   */
  excludesNoc: string

  /**
   * 适用地区。
   */
  appliesArea: string

  /**
   * 适用条件(本域空串占位)。
   */
  appliesCondition: string

  /**
   * 家庭人数档;本域用不到,null 占位。
   */
  familySize: number | null

  /**
   * 计算基准(本域空串占位)。
   */
  basis: string

  /**
   * 官方原文(本域空串占位)。
   */
  label: string

  /**
   * 官方节号(本域空串占位)。
   */
  section: string

  /**
   * 官方生效日(本域空串占位)。
   */
  effective: string

  /**
   * 出处 URL(本域空串占位)。
   */
  url: string

  /**
   * 出处页 URL(本域空串占位)。
   */
  pageUrl: string

  /**
   * 抓取日(本域空串占位)。
   */
  fetched: string
}

/**
 * 雇主判定引擎收的参(与 ruling 的 employerVerdict 门面同形;本域只声明自己读的格)。
 */
export type EmployerJudgeIn = {
  /**
   * 公司事实。
   */
  facts: EmployerFacts

  /**
   * 判定用省码。
   */
  province: string

  /**
   * 门槛行。
   */
  reqs: ReqRow[]

  /**
   * 当前年(成立年限判定)。
   */
  nowYear: number
}

/**
 * 雇主判定引擎(ruling 的 employerVerdict,由入口注进来 —— 2026-08-23 收牌批,
 * 经 index 桶取会把 ruling/functions 的 payload 链拉进浏览器包,毒丸实拦)。
 * 返回值收本域的 `SponsorVerdict`(2026-08-25 撤 ruling 跨域 import:引擎返回的整树
 * state/failed 两格 ⊆ 它,结构兼容,本域不另立 EmployerVerdict)。
 */
export type EmployerJudgeFn = (input: EmployerJudgeIn) => SponsorVerdict

/**
 * 带注入判定的取数入参(loadSponsorEmployers/loadSponsors 全链同形)。
 */
export type SponsorsIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 注入的雇主判定引擎。
   */
  judge: EmployerJudgeFn
}

/**
 * 字符串清单(数组进签名要有自己的名字:探测列名、职业码清单都用它)。
 */
export type StrList = string[]

/**
 * 库里的字符串数组格(array_agg / jsonb 数组列;null = 没有)。
 */
export type StrListCell = string[] | null

/**
 * 省下拉选项缓存的一份。
 */
export type ProvsSlot = {
  /**
   * 灌入时刻(Date.now())。
   */
  at: number

  /**
   * 省码清单(升序)。
   */
  provs: string[]
}

/**
 * `fetchPoolProvs` 的返回。
 */
export type PoolProvsOut = Promise<string[]>

/**
 * 全组页缓存的一份。
 */
export type PoolPageSlot = {
  /**
   * 灌入时刻(Date.now())。
   */
  at: number

  /**
   * 整页。
   */
  page: PoolPage
}

/**
 * `pageOf` 的入参。
 */
export type PageOfIn = {
  /**
   * 原始行。
   */
  raw: PoolDbRows

  /**
   * 当前筛选。
   */
  filters: PoolFilters

  /**
   * 每页行数。
   */
  pageSize: number

  /**
   * 省选项。
   */
  provs: string[]
}

/**
 * `fetchPoolAllPage` 的入参。
 */
export type PoolAllIn = {
  /**
   * 能打 SQL 的东西。
   */
  db: Db

  /**
   * 当前筛选。
   */
  filters: PoolFilters

  /**
   * 每页行数。
   */
  pageSize: number

  /**
   * 省选项(已取到,随页带回)。
   */
  provs: string[]
}

/**
 * `EMPLOYER_POOL_CITIES` 的原始行。
 */
export type CityDbRow = {
  /**
   * 市名。
   */
  city: string | null
}

/**
 * `EMPLOYER_EXPLORE_PENDING` 的原始行。
 */
export type ExploreDbRow = {
  /**
   * 池主键。
   */
  key: string | null

  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 该雇主在招岗的大类(LEFT JOIN employer_pool;池里没有这家 / 没有在招 = null)。
   */
  broads: string[] | null
}

/**
 * 探索队列的一条待办(给后台工人)。
 */
export type ExploreTodo = {
  /**
   * 池主键。
   */
  key: string

  /**
   * 雇主名(要翻的就是它)。
   */
  name: string

  /**
   * 在招岗的大类(岗多的在前;给模型判公司大类当旁证)。
   */
  broads: string[]
}

/**
 * 工人交回来的一条结果(线格式;归一前形状,格子可能缺)。
 */
export type ExploreResultJson = {
  /**
   * 池主键。
   */
  key?: string | null

  /**
   * 状态(done / skip / fail)。
   */
  status?: string | null

  /**
   * 中文译名。
   */
  aliasZh?: string | null

  /**
   * 韩文译名。
   */
  aliasKo?: string | null

  /**
   * 备注(跳过 / 失败的由头)。
   */
  note?: string | null

  /**
   * 公司大类键(模型判的;判不出不给)。
   */
  industry?: string | null
}

/**
 * 洗净后的一条工人结果。
 */
export type ExploreResult = {
  /**
   * 池主键;空串 = 线上没给(丢掉)。
   */
  key: string

  /**
   * 状态;不在白名单的丢掉。
   */
  status: string

  /**
   * 中文译名;空串 = 没有。
   */
  aliasZh: string

  /**
   * 韩文译名;空串 = 没有。
   */
  aliasKo: string

  /**
   * 备注;空串 = 没有。
   */
  note: string

  /**
   * 公司大类键;空串 = 没有。
   */
  industry: string
}

/**
 * 入队请求体(线格式)。
 */
export type ExploreSeenBody = {
  /**
   * 板上列出过的池主键。
   */
  keys?: string[] | null
}

/**
 * 交活请求体(线格式)。
 */
export type ExploreDoneBody = {
  /**
   * 一批结果。
   */
  results?: ExploreResultJson[] | null
}

/**
 * `enqueueExplore` 的入参。
 */
export type EnqueueExploreIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 已洗净的池主键(去重、限长、限数)。
   */
  keys: string[]
}

/**
 * `loadExplorePending` 的入参。
 */
export type ExplorePendingIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 取多少条。
   */
  limit: number
}

/**
 * `saveExploreResults` 的入参。
 */
export type SaveExploreIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 工人交回来的结果(线格式,未洗)。
   */
  results: ExploreResultJson[]
}

/**
 * `loadExplorePending` 的返回。
 */
export type ExploreTodosOut = Promise<ExploreTodo[]>

/**
 * `saveExploreResults` 的返回:写回了几条。
 */
export type ExploreSavedOut = Promise<number>

/**
 * `poolAliasOf` 的入参。
 */
export type PoolAliasIn = {
  /**
   * 原始池行。
   */
  r: PoolDbRow

  /**
   * 要哪一门:true = 韩文,false = 中文。
   */
  ko: boolean
}

/**
 * `EMPLOYER_POOL_EES` 的原始行。
 */
export type EeDbRow = {
  /**
   * EE 类别标签。
   */
  ee: string | null
}

/**
 * `EMPLOYER_POOL_DISTRICTS` 的原始行。
 */
export type DistrictDbRow = {
  /**
   * 区名。
   */
  district: string | null
}

/**
 * `fetchPoolDistricts` 的入参。
 */
export type PoolDistrictsIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 省码。
   */
  prov: string

  /**
   * 市名;空串 = 没选市(不查,回空)。
   */
  city: string
}

/**
 * 市下拉选项缓存的一份(一个省一份)。
 */
export type CitiesSlot = {
  /**
   * 灌入时刻(Date.now())。
   */
  at: number

  /**
   * 市名清单(雇主多的在前)。
   */
  cities: string[]
}

/**
 * `fetchPoolCities` 的入参。
 */
export type PoolCitiesIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 省码;空串 = 没选省(不查,回空)。
   */
  prov: string
}

/**
 * `withCitiesOf` 的入参。
 */
export type WithCitiesIn = {
  /**
   * 取好的一页。
   */
  page: PoolPage

  /**
   * 当前省的市选项。
   */
  cities: string[]

  /**
   * 当前市的区选项。
   */
  districts: string[]

  /**
   * 「全部类别」下拉的选项。
   */
  ees: string[]
}

/**
 * `EMPLOYER_POOL_PROVS` 的原始行。
 */
export type ProvDbRow = {
  /**
   * 省码。
   */
  province: string | null
}

/**
 * `groupOfNoc` 的入参。
 */
export type GroupOfNocIn = {
  /**
   * 能打 SQL 的东西。
   */
  db: Db

  /**
   * 5 位职业码(已过 NOC_RE)。
   */
  noc: string
}

/**
 * `EMPLOYER_GROUP_OF_NOC` 的原始行。
 */
export type GroupOfNocDbRow = {
  /**
   * 行业组键。
   */
  ind_group: string | null
}

/**
 * `employerPoolPage` / `EMPLOYER_POOL_SEARCH` 的原始行(池行 × 桶行 + 窗口总数;numeric 列 pg 回字符串)。
 */
export type PoolDbRow = {
  /**
   * 池主键。
   */
  key: string | null

  /**
   * 公司页 slug。
   */
  slug: string | null

  /**
   * 雇主名。
   */
  name: string | null

  /**
   * 行业。
   */
  industry: string | null

  /**
   * 雇主类别;NULL = 私营。
   */
  sector: string | null

  /**
   * 主省码。
   */
  province: string | null

  /**
   * 主市。
   */
  city: string | null

  /**
   * 主区;NULL = 岗都没带区。
   */
  district: string | null

  /**
   * 主市中文译名(LEFT JOIN cities;译名表外 = null)。
   */
  city_zh: string | null

  /**
   * 主市韩文译名。
   */
  city_ko: string | null

  /**
   * 多地点(jsonb 数组)。
   */
  locations: string[] | null

  /**
   * 在招 EE 类别(jsonb 数组,岗多的在前);NULL = 同上。
   */
  ees: string[] | null

  /**
   * 指定命中。
   */
  designated: boolean | null

  /**
   * 指定项目清单(jsonb 数组)。
   */
  designated_programs: string[] | null

  /**
   * 指定归属省清单(jsonb 数组)。
   */
  designated_provinces: string[] | null

  /**
   * 全桶在招总数。
   */
  open_jobs_total: number | string | null

  /**
   * 池构建日。
   */
  fetched: string | null

  /**
   * 公司官网(LEFT JOIN companies;无公司页 / 没记官网 = null)。
   */
  website: string | null

  /**
   * 公司地址(LEFT JOIN companies;Job Bank 帖子上的雇主地址或 ATS 名单里人工记的;没记 = null)。
   */
  address: string | null

  /**
   * 探索队列里的状态(LEFT JOIN employer_explore;没进过队 = null)。
   */
  x_status: string | null

  /**
   * 探索队列里的中文译名。
   */
  x_alias_zh: string | null

  /**
   * 探索队列里的韩文译名。
   */
  x_alias_ko: string | null

  /**
   * 探索队列译名的版本号。
   */
  x_trans_v: number | string | null

  /**
   * 公司分类(SQL 里已按「私营用模型判的优先」合好的一格);NULL = 判不出。
   */
  category: string | null

  /**
   * 指定资格所在地(jsonb 数组,「项目|地点」);NULL = 非指定 / 还没灌过这一列。
   */
  designated_places: string[] | null

  /**
   * 公司中文别名(LEFT JOIN companies;无公司页 = null)。
   */
  alias_zh: string | null

  /**
   * 公司韩文别名。
   */
  alias_ko: string | null

  /**
   * 行业组键。
   */
  ind_group: string | null

  /**
   * 桶内在招。
   */
  open_jobs: number | string | null

  /**
   * 桶内最新发布日。
   */
  latest_posted: string | null

  /**
   * 桶内主要职业名(jsonb 数组)。
   */
  top_titles: string[] | null

  /**
   * 入门岗数。
   */
  entry_jobs: number | string | null

  /**
   * 入门占比。
   */
  entry_share: number | string | null

  /**
   * 最低经验档。
   */
  min_experience: string | null

  /**
   * 技能类 LMIA 份数。
   */
  lmia_skilled: number | string | null

  /**
   * 最近获批季。
   */
  lmia_last_quarter: string | null

  /**
   * 切面星。
   */
  star: number | string | null

  /**
   * 年薪中位。
   */
  wage_med_annual: number | string | null

  /**
   * 工资水位。
   */
  wage_index_pct: number | string | null

  /**
   * 窗口总数(每行同值)。
   */
  total: number | string | null

  /**
   * 译文版本;NULL = 老批次(别名过期)。
   */
  trans_v: number | string | null
}

/**
 * `PoolDbRow` 的复数(数组进签名要有自己的名字)。
 */
export type PoolDbRows = PoolDbRow[]

/**
 * `groupOfNoc` 的返回(行业组键或空串)。
 */
export type GroupKeyOut = Promise<string>

/**
 * `orderOf` 的入参:主列表 + 收尾 + 键 + 方向 → ORDER BY 片段。
 */
export type OrderOfIn = {
  /**
   * 键 → 主列表(桶表或全组那份)。
   */
  cols: Record<string, string>

  /**
   * 同分收尾片段。
   */
  tie: string

  /**
   * 已收窄的排序键。
   */
  sort: PoolSort

  /**
   * 已收窄的方向。
   */
  dir: PoolDir
}

/**
 * `emptyPoolPage` 的入参。
 */
export type EmptyPoolPageIn = {
  /**
   * 当前筛选(页码原样带回)。
   */
  filters: PoolFilters

  /**
   * 每页行数。
   */
  pageSize: number

  /**
   * 省下拉选项(已取到的照给;池没拿到时空数组)。
   */
  provs: string[]
}

/**
 * 省码 → 岗数的计数表(对照页主要省用)。
 */
export type ProvTally = Record<string, number>

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
   * 雇主池省下拉的选项(池里雇主的主省分布);null = 冷。
   */
  poolProvs: ProvsSlot | null

  /**
   * 省选项刷新的单飞 promise;null = 没有在飞的。
   */
  poolProvsInflight: Promise<string[]> | null

  /**
   * 市下拉选项:省码 → 那个省的市清单(至多十三个键)。
   */
  poolCities: Map<string, CitiesSlot>

  /**
   * 区下拉选项:「省码|市名」→ 那个市的区清单(形同市那一格,清单放在 cities 格里;满 POOL_PAGES_MAX 清空重来)。
   */
  poolDistricts: Map<string, CitiesSlot>

  /**
   * 「全部类别」(EE)下拉的选项(形同市那一格,清单放在 cities 格里);null = 冷。
   */
  poolEes: CitiesSlot | null

  /**
   * 全组页缓存:参数键 → 整页(DISTINCT ON 扫桶表一遍 ~290ms,站级聚合禁每请求现算)。
   */
  poolPages: Map<string, PoolPageSlot>

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

  /**
   * 简介译文：name:lang → 全文（全量翻齐才进）。
   */
  briefTransBy: Map<string, string>

  /**
   * 公司别名缓存:lower(name)|lang → 译名。
   */
  aliasBy: Map<string, string>
}

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
   * AIP 岗的 NOC(array_agg,只计 aip=true)。
   */
  nocs_aip: string[] | null

  /**
   * 在招岗覆盖的大西洋以外省数(COUNT DISTINCT)。
   */
  provs_out: number | string | null

  /**
   * RCIP 岗数(社区内 + 指定雇主)。
   */
  open_jobs_rcip: number | string | null

  /**
   * RCIP 岗的 NOC(array_agg)。
   */
  nocs_rcip: string[] | null

  /**
   * FCIP 岗数(社区内 + 指定雇主)。
   */
  open_jobs_fcip: number | string | null

  /**
   * FCIP 岗的 NOC(array_agg)。
   */
  nocs_fcip: string[] | null

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

  /**
   * 译文版本;NULL = 老批次(别名过期)。
   */
  trans_v: number | string | null
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

/**
 * 可缺位的文本（库里可空列的本域名字）。
 */
export type MaybeStr = string | null

/**
 * `loadCompanyBrief` 的入参。
 */
export type CompanyBriefIn = {
  /**
   * 能查的连接（池由调用方注进来）。
   */
  db: Db

  /**
   * 公司名。
   */
  name: string
}

/**
 * 单列文本取数的返回。
 */
export type MaybeStrOut = Promise<MaybeStr>

/**
 * POST /api/employers/translate 的请求体形状（跨边界断言目标，逐格判后才用）。
 */
export type EmployersTransBody = {
  /**
   * 公司名；不是字符串当没带。
   */
  name: string | null

  /**
   * 目标语种；不在白名单 400。
   */
  lang: string | null

  /**
   * 只查缓存与库不翻(2026-09-16 公司弹框开框首拍:存好的译文与正文一起铺,没存回 404 再另起翻译);不带当 false。
   */
  storedOnly: boolean | null
}

/**
 * 一行简介译文(SQL.COMPANY_BRIEF_ZH_BY_NAME)。
 */
export type CompanyBriefZhDbRow = {
  /**
   * 译文;库里 NULL 给 null。
   */
  ai_brief_zh: string | null
}

/**
 * `saveCompanyBriefZh` 的入参。
 */
export type SaveBriefZhIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 公司名(按名写,同名多行一起)。
   */
  name: string

  /**
   * 译文全文(五节标记保留)。
   */
  text: string
}

/**
 * 只写不回值的异步出参(写回译文这类)。
 */
export type DoneOut = Promise<void>

/**
 * 懒翻公司名接口的请求体(线格式:缺键 = 没传)。
 */
export type EmployersAliasBody = {
  /**
   * 公司名。
   */
  name?: string | null

  /**
   * 目标语种(zh / ko)。
   */
  lang?: string | null
}

/**
 * companies 别名两格(pg 原始行)。
 */
export type AliasDbRow = {
  /**
   * 中文别名;NULL = 没有。
   */
  alias_zh: string | null

  /**
   * 韩文别名;NULL = 没有。
   */
  alias_ko: string | null

  /**
   * 译文版本;NULL = 老批次。
   */
  trans_v: number | null
}

/**
 * companies 别名两格(洗净)。
 */
export type AliasFact = {
  /**
   * 中文别名;'' = 没有。
   */
  aliasZh: string

  /**
   * 韩文别名;'' = 没有。
   */
  aliasKo: string

  /**
   * 译文版本;null = 老批次(读侧当过期)。
   */
  transV: number | null
}

/**
 * `loadCompanyAlias` 的出参:两格,公司不在库给 null。
 */
export type AliasOut = Promise<AliasFact | null>

/**
 * `saveCompanyAlias` 的入参。
 */
export type SaveAliasIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 公司名。
   */
  name: string

  /**
   * 语种(zh / ko)。
   */
  lang: string

  /**
   * 译名。
   */
  alias: string
}

/**
 * `aliasCellOf` 的入参。
 */
export type AliasCellIn = {
  /**
   * 两格。
   */
  fact: AliasFact

  /**
   * 语种(zh / ko)。
   */
  lang: string
}

/**
 * companies 官网简介单格(pg 原始行)。
 */
export type CompanyDescDbRow = {
  /**
   * 官网简介;NULL = 没有。
   */
  description: string | null
}

/**
 * `saveCompanyDescZh` 的入参。
 */
export type SaveDescZhIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 公司名。
   */
  name: string

  /**
   * 译文。
   */
  text: string
}

/**
 * companies 官网简介中文版单格(pg 原始行)。
 */
export type CompanyDescZhDbRow = {
  /**
   * 官网简介中文版;NULL = 没有。
   */
  description_zh: string | null
}

/**
 * 公司「重译」接口的请求体(线格式)。
 */
export type EmployersRetransBody = {
  /**
   * 公司名。
   */
  name?: string | null
}
