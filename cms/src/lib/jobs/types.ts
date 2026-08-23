/**
 * 职位域的全部形状:库里一行(JobRow 与它的原始行)、维度表行、匹配引擎(档案 × 岗位 × 维度)、
 * 查询函数的出入参,外加页面「怎么摆」的三个(ColKey / FieldGroup / Plan)。
 *
 * 为什么全在这儿(2026-08-18 Frank「函数和类型都搬过来 lib」):数据形状是行映射**产出**的东西,
 * 类型跟着产出方走,依赖方向才是单向的 app → lib;形状一旦分两处,「去哪找」本身就成了要记的事。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

import type { Db } from '../db'

// =========================================================================
// 1. 库标量与原始行
// =========================================================================

/**
 * 库标量:一格的值域(文本/数字/布尔/空)—— 与 ruling 同一声明法,**不用 `unknown`**:
 * 列的值域是确定的,写 `unknown` 等于把「取值前先收窄」推给每个调用点。
 * ⚠️ timestamp 列驱动回来是 Date 对象 —— 时间格单独走 `TimeCell` 与词汇 `iso`。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行(窄查询用它 + 词汇表收窄;宽行如 JobDbRow 单独declare)。
 */
export type Row = Record<string, Cell>

/**
 * 时间格:pg timestamp 回来是 Date、텍스트列是字符串、可空(词汇 `iso` 一网收干净)。
 */
export type TimeCell = string | Date | null

/**
 * `Date` 的本地名(库类型先起本地名,签名里不出现外部类型)。
 */
export type PgDate = Date

/**
 * jobs 主表一行的原始列(`JOB_COLUMNS` 列集;列名是 Payload snake_case —— 老坑 5:
 * 改 Jobs schema 只动这里与 `toJobRow`)。numeric 列 pg 回字符串,时间列回 Date,映射时收窄。
 */
export type JobDbRow = {
  /**
   * 主键。
   */
  id: number | string

  /**
   * 岗名。
   */
  title: string | null

  /**
   * 公司名(join companies)。
   */
  company_name: string | null

  /**
   * 公司页 slug。
   */
  company_slug: string | null

  /**
   * 公司一句话描述。
   */
  company_description: string | null

  /**
   * 公司行业段。
   */
  company_sectors: string | null

  /**
   * 官网来路(''=自报/名录 · jd=帖内线索 · searched=自动检索)。
   */
  website_source: string | null

  /**
   * 公司近两年 LMIA 获批岗位数。
   */
  lmia_positions: number | string | null

  /**
   * 其中技能股(🔴 官方可空保 null;null=列未回填)。
   */
  lmia_positions_skilled: number | string | null

  /**
   * 最近获批季度。
   */
  lmia_last_quarter: string | null

  /**
   * 股别展示串。
   */
  lmia_streams: string | null

  /**
   * 岗位精确地址(含街号才有值)。
   */
  address: string | null

  /**
   * 公司地址(岗位地址空时兜底)。
   */
  company_address: string | null

  /**
   * 原始板来源。
   */
  source: string | null

  /**
   * 来源显示标签(mart 洗好)。
   */
  source_label: string | null

  /**
   * 发布渠道(jobbank/ats/directory)。
   */
  origin: string | null

  /**
   * 国家。
   */
  country: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 区(大渥太华社区等)。
   */
  district: string | null

  /**
   * 职业码。
   */
  noc: string | null

  /**
   * 旧分类串。
   */
  category: string | null

  /**
   * TEER(numeric,pg 回字符串)。
   */
  teer: number | string | null

  /**
   * 大类(本站 17 类)。
   */
  broad: string | null

  /**
   * 中类。
   */
  mid: string | null

  /**
   * 小类。
   */
  fine: string | null

  /**
   * 无障碍标注。
   */
  accessibility: string | null

  /**
   * 旧 0-100 分(不再参与排序)。
   */
  score: number | string | null

  /**
   * 通道档 1-5。
   */
  grade_channel: number | string | null

  /**
   * 公司担保档 1-5。
   */
  sponsor_grade: number | string | null

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
   * AIP 标记。
   */
  aip: boolean | null

  /**
   * RCIP/FCIP 试点命中('RCIP'|'FCIP'|'RCIP+FCIP'|'')。
   */
  pilot: string | null

  /**
   * 试点社区名。
   */
  pilot_community: string | null

  /**
   * 雇主在社区官方指定名单上(false≠未指定,名单可能未公布)。
   */
  pilot_employer: boolean | null

  /**
   * 岗位 NOC × 社区在收清单('yes'|'no'|'')。
   */
  pilot_occ: string | null

  /**
   * 雇佣形态(permanent/term/casual/seasonal/'')。
   */
  employment_term: string | null

  /**
   * 全职/兼职(full/part/'')。
   */
  employment_hours: string | null

  /**
   * GAP1③ 红旗(''|'no_sponsorship'|'pr_required')。
   */
  eligibility_flag: string | null

  /**
   * 红旗命中原句。
   */
  eligibility_quote: string | null

  /**
   * 证书/执照要求(Payload array 列,回 JSON 数组)。
   */
  certificates: string[] | null

  /**
   * 学历要求原文。
   */
  education: string | null

  /**
   * 薪资原文。
   */
  salary: string | null

  /**
   * 年薪(归一)。
   */
  salary_annual: number | string | null

  /**
   * 薪资展示文本。
   */
  salary_text: string | null

  /**
   * 该职业当地中位时薪。
   */
  wage_med_hourly: number | string | null

  /**
   * 中位年薪。
   */
  wage_med_annual: number | string | null

  /**
   * 低位时薪。
   */
  wage_low_hourly: number | string | null

  /**
   * 低位年薪。
   */
  wage_low_annual: number | string | null

  /**
   * 高位时薪。
   */
  wage_high_hourly: number | string | null

  /**
   * 高位年薪。
   */
  wage_high_annual: number | string | null

  /**
   * 工资口径年份。
   */
  wage_year: string | null

  /**
   * 官方原帖 URL。
   */
  official_url: string | null

  /**
   * 公司官网(official_url 空时兜底)。
   */
  company_website: string | null

  /**
   * 投递 URL。
   */
  apply_url: string | null

  /**
   * 发布时间。
   */
  date_posted: TimeCell

  /**
   * 首次发现。
   */
  first_seen: TimeCell

  /**
   * 最后确认在招。
   */
  last_seen: TimeCell

  /**
   * 状态(open/closed;null 当 open)。
   */
  status: string | null

  /**
   * 下架时刻。
   */
  closed_at: TimeCell
}

// =========================================================================
// 2. 干净行:JobRow 与维度
// =========================================================================

/**
 * 职位板一行(`toJobRow` 产出;页面/顾问/提醒都吃它)。
 */
export type JobRow = {
  /**
   * 主键。
   */
  id: string | number

  /**
   * 与我的匹配(E5-00,服务端算;null=未建档/未登录)。
   */
  match: 'high' | 'mid' | 'low' | 'na' | null

  /**
   * E12-08 移民通道档 1-5(2026-07-26 起不再展示,只供排序/筛选);null=未评。
   */
  gradeChannel: number | null

  /**
   * 公司担保档 1-5(公司名旁药丸);null=无记录不评。
   */
  sponsorGrade: number | null

  /**
   * 岗名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * E8-09 公司详情页 /companies/[slug] 直链。
   */
  companySlug: string

  /**
   * 公司一句话描述。
   */
  companyDescription: string

  /**
   * 公司行业段。
   */
  companySectors: string

  /**
   * 官网来路:''=雇主自报/名录 · jd=帖内线索 · searched=自动检索(加小字,E8-04 D2)。
   */
  companyWebsiteSrc: string

  /**
   * 原始板来源。
   */
  source: string

  /**
   * 来源显示标签(数据层洗好,前端只读)。
   */
  sourceLabel: string

  /**
   * 发布渠道(jobbank/ats/directory),不代表雇主真假。
   */
  origin: string

  /**
   * 国家。
   */
  country: string

  /**
   * 省码。
   */
  province: string

  /**
   * 城市。
   */
  city: string

  /**
   * 区。
   */
  district: string

  /**
   * 精确地址(含街号才有;岗位空时用公司地址兜底)。
   */
  address: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 旧分类串。
   */
  category: string

  /**
   * TEER;null=未分类。
   */
  teer: number | null

  /**
   * 大类;未匹配 NOC 标「未分类」不硬塞。
   */
  broad: string

  /**
   * 中类。
   */
  mid: string

  /**
   * 小类。
   */
  fine: string

  /**
   * 无障碍标注。
   */
  accessibility: string

  /**
   * 旧 0-100 分(#127 不再参与任何排序);null=未评。
   */
  score: number | null

  /**
   * 粗筛信号(TEER 0-3 或紧缺低 TEER 通道)—— 非资格认定。
   */
  pnpEligible: boolean

  /**
   * 具名省清单命中标签。
   */
  pnpStream: string

  /**
   * EE 类别命中。
   */
  eeCategory: string

  /**
   * AIP 标记。
   */
  aip: boolean

  /**
   * RCIP/FCIP 试点社区命中('RCIP'|'FCIP'|'RCIP+FCIP'|'');粗筛信号,试点须雇主先被社区指定。
   */
  pilot: string

  /**
   * 试点社区名。
   */
  pilotCommunity: string

  /**
   * 批B:雇主在其试点社区的官方指定名单上;false≠未指定(名单可能未公布),只做正向展示。
   */
  pilotEmployer: boolean

  /**
   * 批C 尾巴:岗位 NOC × 社区在收清单('yes'|'no'|'');no 是官方清单为据的负判定,可写。
   */
  pilotOcc: string

  /**
   * GAP1③ 红旗:''|'no_sponsorship'|'pr_required'(数据层 visa_flag 检测)。
   */
  eligibilityFlag: string

  /**
   * 红旗命中原句(可核验出处)。
   */
  eligibilityQuote: string

  /**
   * 雇佣形态(permanent/term/casual/seasonal/'';E6-06 详情页结构化标注,ATS 岗天然空)。
   */
  employmentTerm: string

  /**
   * 全职/兼职(full/part/'')。
   */
  employmentHours: string

  /**
   * 证书/执照要求原文(标准化词表)。
   */
  certificates: string[]

  /**
   * 学历要求原文。
   */
  education: string

  /**
   * 公司近两年 LMIA 获批岗位数(E6-02 历史事实,非「能担保」判定);null=无记录。
   */
  lmiaPositions: number | null

  /**
   * 技能股获批数(B4-02);null=列未回填,规则 6 回退旧口径;0=确认纯农业/低薪股。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近获批季度。
   */
  lmiaLastQuarter: string

  /**
   * 股别展示串。
   */
  lmiaStreams: string

  /**
   * 薪资原文。
   */
  salary: string

  /**
   * 年薪;null=没写。
   */
  salaryAnnual: number | null

  /**
   * 薪资展示文本。
   */
  salaryText: string

  /**
   * 中位时薪;null=未收录。
   */
  wageMedHourly: number | null

  /**
   * 中位年薪。
   */
  wageMedAnnual: number | null

  /**
   * 低位时薪。
   */
  wageLowHourly: number | null

  /**
   * 低位年薪。
   */
  wageLowAnnual: number | null

  /**
   * 高位时薪。
   */
  wageHighHourly: number | null

  /**
   * 高位年薪。
   */
  wageHighAnnual: number | null

  /**
   * 工资口径年份。
   */
  wageYear: string

  /**
   * 官方原帖 URL(空时用公司官网兜底)。
   */
  officialUrl: string

  /**
   * 投递 URL。
   */
  applyUrl: string

  /**
   * 发布时间(ISO)。
   */
  datePosted: string

  /**
   * 首次发现(ISO)。
   */
  firstSeen: string

  /**
   * 最后确认在招(ISO)。
   */
  lastSeen: string

  /**
   * 状态;null 当 open。
   */
  status: string

  /**
   * 下架时刻(ISO;未下架空串)。
   */
  closedAt: string
}

/**
 * 一条省提名清单行(E8-07 维度;program:PNP=省提名(默认)/ AIP=大西洋试点背书,两条路分开判 E6-09)。
 */
export type PnpOcc = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道 slug。
   */
  stream: string

  /**
   * 通道人话名。
   */
  label: string

  /**
   * 清单类型(indemand/ineligible/…)。
   */
  type: string

  /**
   * 项目归属:PNP / AIP(空档在映射时落 'PNP')。
   */
  program: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * GTA 限制(OINP 部分通道)。
   */
  gtaRestricted: boolean

  /**
   * 官方清单页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * 省抽选事实一行(E6-04;score 是省自评分制,scale 标注,非 CRS —— 只作事实展示)。
 */
export type PnpDraw = {
  /**
   * 省码。
   */
  province: string

  /**
   * 抽选类别。
   */
  kind: string

  /**
   * 抽选日期。
   */
  drawDate: string

  /**
   * 通道。
   */
  stream: string

  /**
   * 通道中文名;没有则空串。
   */
  streamZh: string

  /**
   * 分数线(省自评分制);null=该轮未公布。
   */
  score: number | null

  /**
   * 分制标注。
   */
  scale: string

  /**
   * 邀请数;null=未公布。
   */
  invitations: number | null

  /**
   * 备注。
   */
  note: string

  /**
   * 展示标签。
   */
  label: string

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
 * 联邦 EE 类别清单一行。
 */
export type EeOcc = {
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
   * TEER;null=未标。
   */
  teer: number | null

  /**
   * 职业名。
   */
  title: string

  /**
   * 官方页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string

  /**
   * 上次类别抽选 CRS 分数线;null=无记录。
   */
  drawCrs: number | null

  /**
   * 上次抽选日期。
   */
  drawDate: string

  /**
   * 上次抽选邀请数;null=无记录。
   */
  drawSize: number | null
}

/**
 * AIP 指定雇主瘦行(维度表)。
 */
export type DesigEmp = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 省码。
   */
  province: string

  /**
   * 社区/城市。
   */
  location: string

  /**
   * 科技类标记。
   */
  isTech: boolean
}

/**
 * NOC 官方职业描述行。
 */
export type NocDesc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名;没有则空串。
   */
  titleZh: string

  /**
   * 韩文名;没有则空串。
   */
  titleKo: string

  /**
   * 主要职责。
   */
  duties: string

  /**
   * 入职要求。
   */
  requirements: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * 字段出处一行(字段来源弹框)。
 */
export type FieldSource = {
  /**
   * 字段名。
   */
  field: string

  /**
   * 出处类别。
   */
  kind: string

  /**
   * 发布方。
   */
  publisher: string

  /**
   * 出处 URL。
   */
  url: string

  /**
   * 出处标题。
   */
  title: string

  /**
   * 一句说明。
   */
  description: string

  /**
   * 状态。
   */
  status: string

  /**
   * 抓取时刻。
   */
  fetched: string

  /**
   * 备注。
   */
  note: string
}

/**
 * 官方移民新闻瘦行(E12-06,PNP 弹框「本省最新公告」;详情在 /news/[slug])。
 */
export type NewsSlim = {
  /**
   * 地区(省码或 IRCC)。
   */
  region: string

  /**
   * 标题。
   */
  title: string

  /**
   * 日期。
   */
  date: string

  /**
   * 详情页 slug。
   */
  slug: string
}

/**
 * 首屏维度包(SSR 与 /api/jobs/dims 共用一份行映射,口径不分叉)。
 */
export type Dims = {
  /**
   * 省清单。
   */
  provinces: ProvOption[]

  /**
   * 城市清单(SSR 瘦身:首屏空,客户端从 /api/jobs/dims 拉后并入)。
   */
  cities: CityOption[]

  /**
   * 区清单(同上)。
   */
  districts: DistrictOption[]

  /**
   * 分类树(三级三语;中/小分类英韩名随维度表下发,显示层不自己攒翻译表)。
   */
  nocCategories: NocCat[]

  /**
   * 来源清单。
   */
  sources: NameOption[]

  /**
   * 经验档清单。
   */
  experienceLevels: NameOption[]

  /**
   * 省提名清单行。
   */
  pnpOccupations: PnpOcc[]

  /**
   * 省抽选事实行。
   */
  pnpDraws: PnpDraw[]

  /**
   * 联邦 EE 类别行。
   */
  eeCategories: EeOcc[]

  /**
   * AIP 指定雇主(SSR 瘦身:首屏空)。
   */
  designatedEmployers: DesigEmp[]

  /**
   * NOC 官方描述(SSR 瘦身:首屏空,788KB 大头)。
   */
  nocDescriptions: NocDesc[]

  /**
   * 字段出处。
   */
  fieldSources: FieldSource[]

  /**
   * 官方移民新闻瘦行。
   */
  news: NewsSlim[]
}

/**
 * 分类树一行(三级三语)。
 */
export type NocCat = {
  /**
   * 大类。
   */
  broad: string

  /**
   * 中类。
   */
  mid: string

  /**
   * 小类。
   */
  fine: string

  /**
   * TEER;null=未标。
   */
  teer: number | null

  /**
   * 大类英文名。
   */
  broadEn: string

  /**
   * 大类韩文名。
   */
  broadKo: string

  /**
   * 中类英文名。
   */
  midEn: string

  /**
   * 中类韩文名。
   */
  midKo: string

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
 * 一条省提名通道 + 它点名的职业(由 PnpOcc 行按 stream 聚合;详情页用)。
 */
export type PnpStream = {
  /**
   * 通道 slug。
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
   * 官方页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string

  /**
   * 点名职业。
   */
  occupations: StreamOcc[]
}

/**
 * 一个联邦 EE 类别 + 它涵盖的职业(由 EeOcc 行按 category 聚合;详情页用)。
 */
export type EeCat = {
  /**
   * 类别 slug。
   */
  key: string

  /**
   * 类别人话名。
   */
  label: string

  /**
   * 上次抽选 CRS;null=无记录。
   */
  drawCrs: number | null

  /**
   * 上次抽选日期。
   */
  drawDate: string

  /**
   * 上次邀请数;null=无记录。
   */
  drawSize: number | null

  /**
   * 涵盖职业。
   */
  occupations: EeCatOcc[]
}

/**
 * 公司担保档·担保维明细(档位 + 依据值;数据层算好写库,前端只读)。
 */
export type CoSponsorDim = {
  /**
   * 该维档位。
   */
  g: number

  /**
   * 依据值;null = AIP 指定但无 LMIA 记录。
   */
  v: {
    /**
     * 近两年获批总数。
     */
    total: number

    /**
     * 其中技能股;null=列未回填。
     */
    skilled: number | null

    /**
     * 最近获批季度。
     */
    q: string

    /**
     * AIP 指定。
     */
    aip: boolean
  } | null
}

/**
 * 公司担保档·活跃度维。
 */
export type CoActiveDim = {
  /**
   * 该维档位。
   */
  g: number

  /**
   * 依据值;null=缺。
   */
  v: {
    /**
     * 在招岗数。
     */
    open: number

    /**
     * 近 30 天新发。
     */
    new30: number
  } | null
}

/**
 * 公司担保档·薪资维(v = 相对中位的百分比)。
 */
export type CoSalaryDim = {
  /**
   * 该维档位。
   */
  g: number

  /**
   * 相对中位的百分比。
   */
  v: number
}

/**
 * 公司担保档·知名度维。
 */
export type CoFameDim = {
  /**
   * 该维档位。
   */
  g: number

  /**
   * 依据值;null=缺。
   */
  v: {
    /**
     * 维基条目;空串=无。
     */
    wiki: string

    /**
     * 在招覆盖省数。
     */
    provs: number

    /**
     * 在招岗数。
     */
    open: number
  } | null
}

/**
 * 公司担保档四维明细;整体 null=无明细。
 */
export type CoGradeDetail = {
  /**
   * 担保记录维;null=缺。
   */
  sponsor: CoSponsorDim | null

  /**
   * 活跃度维;null=缺。
   */
  active: CoActiveDim | null

  /**
   * 薪资维;null=缺。
   */
  salary: CoSalaryDim | null

  /**
   * 知名度维;null=缺。
   */
  fame: CoFameDim | null
} | null

/**
 * 省级 IRCC 体量单项(数 + 口径年)。
 */
export type ProvInfoNum = {
  /**
   * 数值。
   */
  n: number

  /**
   * 口径年。
   */
  year: string
}

/**
 * 省级 IRCC 体量事实(地点弹框):留学生/临时外劳/IMP 存量 + PNP 落地 + 提名配额。
 */
export type ProvInfo = {
  /**
   * 留学生存量;null=未收录。
   */
  study: ProvInfoNum | null

  /**
   * TFWP 存量;null=未收录。
   */
  tfwp: ProvInfoNum | null

  /**
   * IMP 存量;null=未收录。
   */
  imp: ProvInfoNum | null

  /**
   * PNP PR 落地;null=未收录。
   */
  pnpPr: ProvInfoNum | null

  /**
   * 提名配额两年;null=未收录。
   */
  alloc: AllocYears | null
}

// =========================================================================
// 3. 匹配引擎(付费墙头牌;规则只住 functions.ts 一处)
// =========================================================================

/**
 * 用户分型(E11-04,§2.5 A–E):稳定 slug,枚举单一来源。
 */
export type CurrentStatus = 'overseas' | 'studying' | 'working' | 'jobhunting' | 'pr'

/**
 * 档案(规范化后;normalizeProfile 是唯一入口)。
 */
export type MatchProfile = {
  /**
   * 自报职业码。
   */
  nocCodes: string[]

  /**
   * 语言 CLB;null=未填(v1 不进评分,advisor 事实可见)。
   */
  clb: number | null

  /**
   * 自报 CRS;null=未填。
   */
  crs: number | null

  /**
   * 目标省(偏好不是资格,不一致只提示不扣分)。
   */
  targetProvinces: string[]

  /**
   * PGWP 剩余月数;null=未填。
   */
  pgwpMonthsLeft: number | null

  /**
   * 分型;null=未填(仅作 advisor grounding 路径语境)。
   */
  currentStatus: CurrentStatus | null
}

/**
 * Users.profile 原始 JSON 的一格(形状不可信,normalizeProfile 逐格收窄)。
 */
export type ProfileJsonCell = string | number | boolean | null | string[]

/**
 * Users.profile 原始 JSON(键任意,值不可信)。
 */
export type ProfileJson = Record<string, ProfileJsonCell>

/**
 * 匹配只读岗位的这几个字段(JobRow 超集兼容)。
 */
export type MatchJob = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * TEER;null=未分类。
   */
  teer: number | null

  /**
   * 省码。
   */
  province: string

  /**
   * 粗筛信号。
   */
  pnpEligible: boolean

  /**
   * 具名省清单命中。
   */
  pnpStream: string

  /**
   * EE 类别命中。
   */
  eeCategory: string

  /**
   * 年薪;null=没写。
   */
  salaryAnnual: number | null

  /**
   * 当地中位年薪;null=未收录。
   */
  wageMedAnnual: number | null

  /**
   * 雇主近两年 LMIA 获批数(E6-02 历史事实);null=无记录。
   */
  lmiaPositions: number | null

  /**
   * 最近获批季度;空串=无。
   */
  lmiaLastQuarter: string

  /**
   * 技能股获批数(B4-02);null=列未回填(规则 6 回退旧口径);0=确认纯农业/低薪股。
   */
  lmiaPositionsSkilled: number | null
}

/**
 * 匹配吃的省清单维度行。
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
 * 匹配吃的 EE 类别维度行。
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
   * 上次抽选 CRS;null=无记录。
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
 * 匹配维度包(pnp/ee 清单;loadMatchDims 带 1h 缓存取)。
 */
export type MatchDims = {
  /**
   * 省清单行(只吃 program=PNP,滤在 SQL WHERE 里 —— dims.ts 口径分叉的教训)。
   */
  pnpOccupations: PnpOccDim[]

  /**
   * EE 类别行。
   */
  eeCategories: EeCatDim[]
}

/**
 * 单条理由的判定。
 */
export type MatchVerdict = 'pass' | 'warn' | 'fail' | 'na'

/**
 * 一条匹配理由(i18n 键+参数三语渲染;sourceRef 指回具体维度记录)。
 * 措辞红线:只陈述可核验事实,永不说「你能/不能移民」。
 */
export type MatchReason = {
  /**
   * 规则名。
   */
  rule: 'noc' | 'prov' | 'ee' | 'teer' | 'wage' | 'lmia'

  /**
   * 判定。
   */
  verdict: MatchVerdict

  /**
   * i18n 键(match.r.*)。
   */
  key: string

  /**
   * 渲染参数。
   */
  params: Record<string, string | number>

  /**
   * 依据链;null=该条无外部依据。
   */
  source: ReasonSource | null
}

/**
 * 匹配档。
 */
export type MatchLevel = 'high' | 'mid' | 'low' | 'na'

/**
 * 档或没有(列表行的 match 格)。
 */
export type MaybeLevel = MatchLevel | null

/**
 * 匹配结果。
 */
export type MatchResult = {
  /**
   * 档。
   */
  level: MatchLevel

  /**
   * 内部分(只用于分档,不展示)。
   */
  score: number

  /**
   * 理由链。
   */
  reasons: MatchReason[]
}

/**
 * `match` 的入参。
 */
export type MatchIn = {
  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 岗位侧字段。
   */
  job: MatchJob

  /**
   * 维度包。
   */
  dims: MatchDims
}

/**
 * 省清单覆盖档(单一来源;报告/匹配/统计共用)。「某省 0 命中」有四种不同含义,混为一谈=报告撒谎:
 * listed=查过确实没命中可下结论;exclusion=不在排除清单即按 TEER 粗筛;partial=只有专项通道清单,
 * 主线未核实;uncovered=本站未覆盖只能说「清单未收录本站」;qc=魁省自有体系。
 */
export type ProvListCoverage = 'listed' | 'partial' | 'exclusion' | 'uncovered' | 'qc'

/**
 * `provListCoverage` 的入参。
 */
export type CoverageIn = {
  /**
   * 省码。
   */
  prov: string

  /**
   * 维度包。
   */
  dims: MatchDims
}

/**
 * 文本或没有(statusEn 等的返回)。
 */
export type MaybeStr = string | null

// =========================================================================
// 4. 查询层:筛选、排序、页
// =========================================================================

/**
 * 筛选参数的一格(URL 参数/保存筛选 JSON;qCompanyIds 是预查出的公司 id 组)。
 */
export type FilterCell = string | number | boolean | null | string[] | number[] | number[][]

/**
 * 职位筛选(键名 = /jobs 前端筛选 state 原样:fProv/fCity/q/directOnly…)。
 */
export type JobsFilters = Record<string, FilterCell>

/**
 * WHERE 参数的一格。
 */
export type WhereParam = string | number | string[] | number[]

/**
 * `buildJobsWhere` 的返回:条件串(无 WHERE 前缀,空=TRUE)、绑定参数、被跳过的键。
 */
export type JobsWhere = {
  /**
   * 条件串。
   */
  sql: string

  /**
   * 绑定参数。
   */
  params: WhereParam[]

  /**
   * 识别不了被跳过的筛选键(提醒邮件里给用户交代)。
   */
  skipped: string[]
}

/**
 * `buildJobsWhere` 的入参。
 */
export type BuildWhereIn = {
  /**
   * 筛选。
   */
  filters: JobsFilters

  /**
   * 占位符起始($N;提醒查询 $1 留给 since 时传 2)。
   */
  startIndex: number
}

/**
 * 表头排序指令;null=默认序(发布时间↓)。
 */
export type SortSpec = {
  /**
   * 列 key(白名单外回退默认序)。
   */
  key: string

  /**
   * 方向('asc' 升,其余降)。
   */
  dir: string
} | null

/**
 * `orderByClause` 的入参。
 */
export type OrderByIn = {
  /**
   * 排序指令。
   */
  sort: SortSpec

  /**
   * 付费态(Pro 列回退集当前为空,#73 泄露前提不存在)。
   */
  pro: boolean
}

/**
 * `resolveQCompanyIds` 的入参。
 */
export type ResolveQIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 筛选(q 有词才预查)。
   */
  filters: JobsFilters
}

/**
 * `resolveQCompanyIds` 的返回:原筛选 + qCompanyIds(下标与 splitQ 对齐)。
 */
export type ResolveQOut = Promise<JobsFilters>

/**
 * `toJobRow` 的入参。
 */
export type ToJobRowIn = {
  /**
   * 原始行。
   */
  row: JobDbRow

  /**
   * 该行的匹配档(调用方按人算好传入)。
   */
  matchLevel: MaybeLevel

  /**
   * 付费态(Pro 数据列剥离口径;2026-07-25「先都显示出来」后暂不剥)。
   */
  pro: boolean
}

/**
 * `rowMatchLevel` 的入参。
 */
export type RowMatchIn = {
  /**
   * 原始行。
   */
  row: JobDbRow

  /**
   * 建档可用(false 直接 null)。
   */
  profileOk: boolean

  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 维度包。
   */
  dims: MatchDims
}

/**
 * SSR 首屏维度包(Dims + news;历史命名保留)。
 */
export type SsrDims = Dims

/**
 * `fetchSsrDims` 的返回。
 */
export type SsrDimsOut = Promise<SsrDims>

/**
 * `fetchJobRows` 的入参(SSR 首屏 50 行)。
 */
export type JobRowsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 付费态。
   */
  pro: boolean

  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 建档可用。
   */
  profileOk: boolean

  /**
   * 维度包。
   */
  matchDims: MatchDims

  /**
   * 取前几行。
   */
  limit: number
}

/**
 * `fetchJobRows` 的返回。
 */
export type JobRowsOut = Promise<{
  /**
   * 行。
   */
  jobs: JobRow[]

  /**
   * 最近核对时刻。
   */
  updatedAt: string

  /**
   * 全量 high 计数(FOMO 数字)。
   */
  matchHigh: number

  /**
   * 全量 mid 计数。
   */
  matchMid: number
}>

/**
 * `fetchJobsPage` 的入参(E10-01 服务端筛选+排序+分页)。
 */
export type JobsPageIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 付费态。
   */
  pro: boolean

  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 建档可用。
   */
  profileOk: boolean

  /**
   * 维度包。
   */
  matchDims: MatchDims

  /**
   * 筛选。
   */
  filters: JobsFilters

  /**
   * 排序。
   */
  sort: SortSpec

  /**
   * 页码,0 起。
   */
  page: number

  /**
   * 每页行数。
   */
  pageSize: number
}

/**
 * `fetchJobsPage` 的返回。
 */
export type JobsPageOut = Promise<{
  /**
   * 当前页行。
   */
  jobs: JobRow[]

  /**
   * 同 WHERE 总数。
   */
  total: number

  /**
   * 最近核对时刻。
   */
  updatedAt: string
}>

/**
 * `fetchMatchPage` 的入参(「我的匹配」视图)。
 */
export type MatchPageIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 付费态。
   */
  pro: boolean

  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 维度包。
   */
  matchDims: MatchDims

  /**
   * 页码,0 起。
   */
  page: number

  /**
   * 每页行数。
   */
  pageSize: number

  /**
   * 排序。
   */
  sort: SortSpec
}

/**
 * `fetchMatchPage` 的返回。
 */
export type MatchPageOut = Promise<{
  /**
   * 当前页行。
   */
  jobs: JobRow[]

  /**
   * 命中总数。
   */
  total: number

  /**
   * high 计数。
   */
  matchHigh: number

  /**
   * mid 计数。
   */
  matchMid: number

  /**
   * 最近核对时刻。
   */
  updatedAt: string
}>

/**
 * `fetchJobById` 的入参(详情页单岗;closed 岗也返回)。
 */
export type JobByIdIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 岗位号。
   */
  id: number

  /**
   * 付费态。
   */
  pro: boolean

  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 建档可用。
   */
  profileOk: boolean

  /**
   * 维度包。
   */
  matchDims: MatchDims
}

/**
 * `fetchJobById` 的返回;查无/id 不像样则 null。
 */
export type JobByIdOut = Promise<JobRow | null>

/**
 * 相关职位瘦行。
 */
export type RelatedJob = {
  /**
   * 岗位号。
   */
  id: number

  /**
   * 岗名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资展示文本。
   */
  salaryText: string
}

/**
 * `fetchRelatedJobs` 的入参。
 */
export type RelatedIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 本岗(排除自身;fine/mid/broad 供 closed 兜底探测)。
   */
  job: {
    /**
     * 岗位号。
     */
    id: string | number

    /**
     * 公司名。
     */
    company: string

    /**
     * 省码。
     */
    province: string

    /**
     * 职业码。
     */
    noc: string

    /**
     * 小类。
     */
    fine: string

    /**
     * 中类。
     */
    mid: string

    /**
     * 大类。
     */
    broad: string
  }
}

/**
 * `fetchRelatedJobs` 的返回(2026-08-11:两组都空时给 fallbackLevel —— 下架页不能是死路)。
 */
export type RelatedOut = Promise<{
  /**
   * 同公司在招 ≤3。
   */
  sameCompany: RelatedJob[]

  /**
   * 同省同 NOC 小类在招 ≤3。
   */
  sameOcc: RelatedJob[]

  /**
   * 能筛出东西的最细一级;三级都空 = null(调用方退到只按省)。
   */
  fallbackLevel: 'fine' | 'mid' | 'broad' | null
}>

/**
 * `fetchTotalAndProof` 的返回:头条总数 + 证言数字。
 */
export type ProofOut = Promise<{
  /**
   * 在招总数(去重+排除下架,与列表同口径)。
   */
  total: number

  /**
   * 省提名清单命中岗数。
   */
  named: number

  /**
   * 有外劳记录雇主数。
   */
  lmia: number
}>

/**
 * 公司详情页在招岗一行。
 */
export type CompanyJobRow = {
  /**
   * 岗位号。
   */
  id: number

  /**
   * 岗名。
   */
  title: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 通道档;null=未评。
   */
  gradeChannel: number | null

  /**
   * 职业码。
   */
  noc: string

  /**
   * NOC 官方英文名。
   */
  nocTitle: string

  /**
   * 中文名。
   */
  nocTitleZh: string

  /**
   * 韩文名。
   */
  nocTitleKo: string

  /**
   * TEER;null=未分类。
   */
  teer: number | null

  /**
   * 薪资展示文本。
   */
  salaryText: string

  /**
   * 发布时间(ISO)。
   */
  datePosted: string
}

/**
 * 公司 LMIA 获批职业一行(#286;列没建/没灌时整块空数组,弹框不渲)。
 */
export type LmiaNocRow = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 获批岗位数。
   */
  positions: number

  /**
   * 官方英文名;缺时前端渲裸码。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 韩文名。
   */
  titleKo: string
}

/**
 * 公司详情页数据(E8-09;零新抓取:companies 行 + 该司在招岗聚合;全事实层免费)。
 */
export type CompanyDetail = {
  /**
   * 公司名。
   */
  name: string

  /**
   * slug。
   */
  slug: string

  /**
   * 官网。
   */
  website: string

  /**
   * 官网来路。
   */
  websiteSource: string

  /**
   * 行业。
   */
  industry: string

  /**
   * 行业段。
   */
  sectors: string

  /**
   * 中文别名。
   */
  aliasZh: string

  /**
   * 韩文别名。
   */
  aliasKo: string

  /**
   * 维基条目。
   */
  wikiUrl: string

  /**
   * 担保档;null=未评。
   */
  sponsorGrade: number | null

  /**
   * 担保档四维明细;null=无。
   */
  scoreDetail: CoGradeDetail

  /**
   * K 调查简介。
   */
  aiBrief: string

  /**
   * K 调查官网。
   */
  aiWebsite: string

  /**
   * K 调查来源。
   */
  aiSources: string[]

  /**
   * K 调查日期。
   */
  aiFetched: string

  /**
   * 公司描述。
   */
  description: string

  /**
   * 地址。
   */
  address: string

  /**
   * 省码。
   */
  province: string

  /**
   * LMIA 获批岗位数;null=无记录列。
   */
  lmiaPositions: number | null

  /**
   * LMIA 份数;null=无。
   */
  lmiaLmias: number | null

  /**
   * 最近获批季度。
   */
  lmiaLastQuarter: string

  /**
   * 股别展示串(「High Wage 58 · Low Wage 1008」)。
   */
  lmiaStreams: string

  /**
   * 技能股获批数;null=列未回填。
   */
  lmiaSkilled: number | null

  /**
   * 获批职业拆分(近两年;容缺自激活)。
   */
  lmiaNocs: LmiaNocRow[]

  /**
   * 在招总数。
   */
  openCount: number

  /**
   * 在招岗 ≤50。
   */
  jobs: CompanyJobRow[]
}

/**
 * `fetchCompanyBySlug` / `fetchCompanyByJobId` 的返回;查无则 null(页面走 Notice 不 404)。
 */
export type CompanyOut = Promise<CompanyDetail | null>

/**
 * `fetchCompanyBySlug` 的入参。
 */
export type CompanyBySlugIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 公司页 slug。
   */
  slug: string
}

/**
 * `fetchCompanyByJobId` 的入参(E8-11 B1:按 jobs.company_id 解析,同名公司也不串)。
 */
export type CompanyByJobIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 岗位号。
   */
  jobId: number
}

/**
 * 相似雇主一行(E8-09:同省同行业、有在招岗)。
 */
export type SimilarEmployer = {
  /**
   * slug。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 行业。
   */
  industry: string

  /**
   * 担保档;null=未评。
   */
  sponsorGrade: number | null

  /**
   * 在招数。
   */
  openCount: number
}

/**
 * `fetchSimilarEmployers` 的入参。
 */
export type SimilarIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 省码。
   */
  province: string

  /**
   * 行业。
   */
  industry: string

  /**
   * 排除自身的 slug。
   */
  excludeSlug: string
}

/**
 * `fetchSimilarEmployers` 的返回。
 */
export type SimilarOut = Promise<SimilarEmployer[]>

/**
 * 邮件提醒命中一行(E5-03;列名保持 snake_case —— 邮件模板按它渲)。
 */
export type AlertHit = {
  /**
   * 岗位号。
   */
  id: number

  /**
   * 岗名。
   */
  title: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资展示文本。
   */
  salary_text: string

  /**
   * 公司名。
   */
  company_name: string
}

/**
 * `fetchAlertHits` 的入参。
 */
export type AlertHitsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 保存的筛选。
   */
  filters: JobsFilters

  /**
   * 只要这之后新出现的岗。
   */
  since: string
}

/**
 * `fetchAlertHits` 的返回。
 */
export type AlertHitsOut = Promise<{
  /**
   * 命中行。
   */
  rows: AlertHit[]

  /**
   * 识别不了被跳过的筛选键。
   */
  skipped: string[]
}>

// =========================================================================
// 5. 入口三问(免费结果;铁律:毫秒级、纯库内聚合、不碰 AI)
// =========================================================================

/**
 * 三问事实包(口径与列表一致,不另起一套判定)。
 */
export type QuizFacts = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * TEER;null=未标。
   */
  teer: number | null

  /**
   * 官方英文职业名(不能拿岗位标题冒充)。
   */
  title: string

  /**
   * 中文职业名。
   */
  titleZh: string

  /**
   * 窄位中文名(「注册护士和注册精神科护士」→「注册护士」)。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名(官方名一个字不动,这是另一列)。
   */
  titleEnShort: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number

  /**
   * 具名清单命中数。
   */
  named: number

  /**
   * 命中通道分布。
   */
  streams: QuizStreamCount[]

  /**
   * 按省分布。
   */
  byProv: QuizProvCount[]

  /**
   * 中位年薪;null=无数据。
   */
  medianSalary: number | null

  /**
   * 发过「能走省提名的岗」的雇主家数(只给数不给名单 —— 名单是锁区正文)。
   */
  sponsors: number
}

/**
 * `fetchQuizFacts` 的入参。
 */
export type QuizFactsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 职业码。
   */
  noc: string
}

/**
 * `fetchQuizFacts` 的返回;码不像样/无在招则 null。
 */
export type QuizFactsOut = Promise<QuizFacts | null>

/**
 * `fetchNocOpenCounts` 的入参。
 */
export type NocCountsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 职业码清单。
   */
  nocs: string[]
}

/**
 * `fetchNocOpenCounts` 的返回:码 → 在招/可提名。
 */
export type NocCountsOut = Promise<Record<string, NocOpenCount>>

/**
 * 热门职业一行(第 2 题清单;不手写,按库里在招量取前 N)。
 */
export type TopNoc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string

  /**
   * 大类。
   */
  broad: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number

  /**
   * 中位年薪;null=大清单不算(percentile 是查询大头)。
   */
  medianSalary: number | null
}

/**
 * `fetchTopNocs` 的入参。
 */
export type TopNocsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 取前几(1..200 夹紧)。
   */
  limit: number
}

/**
 * `fetchTopNocs` 的返回。
 */
export type TopNocsOut = Promise<TopNoc[]>

/**
 * 按大类浏览一行(无中位薪资)。
 */
export type BroadNoc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string

  /**
   * 大类。
   */
  broad: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * `fetchBroadNocs` 的入参(只在用户点中某类后查,避免打开问卷就扫 top=200)。
 */
export type BroadNocsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 大类名。
   */
  broad: string

  /**
   * 取前几(1..80 夹紧)。
   */
  limit: number
}

/**
 * `fetchBroadNocs` 的返回。
 */
export type BroadNocsOut = Promise<BroadNoc[]>

/**
 * 职业名搜索一行。
 */
export type NocHit = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string
}

/**
 * `searchNocByTitle` 的入参。
 */
export type NocSearchIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 检索词(<2 字符不查)。
   */
  q: string
}

/**
 * `searchNocByTitle` 的返回(≤8 条)。
 */
export type NocSearchOut = Promise<NocHit[]>

// =========================================================================
// 6. JD 正文(取数 + 懒抓)
// =========================================================================

/**
 * `jobDescription` / `lazyFetchJd` 的入参。
 */
export type JdIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 投递 URL(JD 缓存的键)。
   */
  applyUrl: string
}

/**
 * JD 正文的返回;抓不到空串(前端空态引导官方原帖)。
 */
export type JdOut = Promise<string>

/**
 * `URL` 的本地名(库类型先起本地名)。
 */
export type UrlHandle = URL

/**
 * `stripTitleLine` 的入参。
 */
export type StripTitleIn = {
  /**
   * 抽取后的正文。
   */
  text: string

  /**
   * 原始 HTML(取 <title> 对照)。
   */
  html: string
}

/**
 * 字符串清单(数组进签名要有自己的名字)。
 */
export type StrList = string[]

/**
 * 数或没有。
 */
export type MaybeNum = number | null

/**
 * 数字格(numeric 列:pg 回字符串,Local API 回数字)。
 */
export type NumCell = number | string | null

/**
 * 字符串格。
 */
export type StrCell = string | null

/**
 * pg 错误对象的形状(code 是 pg 挂上去的,TS 看不见 —— 部署时序降级要按它分支)。
 */
export type PgFailure = Error & {
  /**
   * pg 错误码(42703 列不存在 / 42P01 表不存在);没有则 null。
   */
  code: string | null
}

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
 * 匹配视图的装饰行:比较器只读现成值,列值与档位序由构建方先算好挂上。
 */
export type RankedHit = {
  /**
   * 原始行。
   */
  j: JobDbRow

  /**
   * 命中档(high/mid)。
   */
  level: MatchLevel

  /**
   * 档位序(matchRank 先算好)。
   */
  rank: number

  /**
   * 排序列的取值(matchSortVal 先算好);默认序时 null。
   */
  v: Cell
}

/**
 * `matchSortVal` 的入参。
 */
export type SortValIn = {
  /**
   * 列 key(白名单同 SORT_COLUMNS)。
   */
  key: string

  /**
   * 原始行。
   */
  j: JobDbRow
}

/**
 * 单条匹配规则的入参(六条规则同一形状)。
 */
export type RuleIn = {
  /**
   * 规范化档案。
   */
  profile: MatchProfile

  /**
   * 岗位侧字段。
   */
  job: MatchJob

  /**
   * 维度包。
   */
  dims: MatchDims
}

/**
 * 省下拉一项。
 */
export type ProvOption = {
  /**
   * 省码。
   */
  code: string

  /**
   * 省全名。
   */
  name: string
}

/**
 * 城市下拉一项。
 */
export type CityOption = {
  /**
   * 城市名。
   */
  name: string

  /**
   * 所在省。
   */
  province: string
}

/**
 * 区下拉一项。
 */
export type DistrictOption = {
  /**
   * 区名。
   */
  name: string

  /**
   * 所在城市。
   */
  city: string

  /**
   * 所在省。
   */
  province: string
}

/**
 * 只有名字的一项(来源/经验档下拉)。
 */
export type NameOption = {
  /**
   * 名字。
   */
  name: string
}

/**
 * 通道点名职业一项。
 */
export type StreamOcc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * GTA 限制。
   */
  gtaRestricted: boolean
}

/**
 * EE 类别涵盖职业一项。
 */
export type EeCatOcc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * TEER;null=未标。
   */
  teer: number | null

  /**
   * 职业名。
   */
  title: string
}

/**
 * 提名配额两年。
 */
export type AllocYears = {
  /**
   * 2026 配额;null=未公布。
   */
  y2026: number | null

  /**
   * 2025 配额;null=未公布。
   */
  y2025: number | null
}

/**
 * 一条理由的依据链(指回具体维度记录)。
 */
export type ReasonSource = {
  /**
   * 依据名。
   */
  label: string

  /**
   * 依据页。
   */
  url: string

  /**
   * 抓取时刻;数据集页无快照则空串。
   */
  fetched: string
}

/**
 * 三问的通道分布一项。
 */
export type QuizStreamCount = {
  /**
   * 通道。
   */
  stream: string

  /**
   * 命中岗数。
   */
  n: number
}

/**
 * 三问的按省分布一项。
 */
export type QuizProvCount = {
  /**
   * 省码。
   */
  province: string

  /**
   * 在招数。
   */
  n: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * 某职业码的在招/可提名计数。
 */
export type NocOpenCount = {
  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * 时间或库标量(iso 词汇的入参:窄行的时间格在类型上是 Cell,运行时才是 Date)。
 */
export type TimeLike = Cell | PgDate

/**
 * 档案或没有。
 */
export type MaybeProfile = MatchProfile | null

/**
 * 原始档案 JSON 或没有。
 */
export type ProfileJsonOrNull = ProfileJson | null

/**
 * `PnpOcc` 的复数(数组进签名要有自己的名字)。
 */
export type PnpOccs = PnpOcc[]

/**
 * `Error` 的本地名(catch 收窄后的异常;库类型先起本地名)。
 */
export type CaughtError = Error

/**
 * 五条打分规则共同的返回:该规则的加分与理由。
 */
export type RuleScoreOut = {
  /**
   * 加减分。
   */
  score: number

  /**
   * 理由。
   */
  reasons: MatchReason[]
}

/**
 * NOC 规则的返回(多一面「全不沾边」旗 —— 档位封顶 low 用)。
 */
export type NocRuleOut = {
  /**
   * 加减分。
   */
  score: number

  /**
   * 理由。
   */
  reasons: MatchReason[]

  /**
   * 填了 NOC 却精确/小类/同族全未命中。
   */
  nocMiss: boolean
}

/**
 * `fetchCompanyWhere` 的入参。
 */
export type CompanyWhereIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * WHERE 条件(表别名 c)。
   */
  where: string

  /**
   * 绑定值(slug 或岗位号)。
   */
  param: WhereParam
}

/**
 * `lmiaNocsOf` 的入参。
 */
export type LmiaNocsIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * companies 主键。
   */
  companyId: number
}

/**
 * `lmiaNocsOf` 的返回;容缺空数组。
 */
export type LmiaNocsOut = Promise<LmiaNocRow[]>

/**
 * 拉一页 HTML 的返回;拉不到空串。
 */
export type HtmlOut = Promise<string>

/**
 * `checkedAt` / `loadMatchDims` 等异步取数的返回。
 */
export type CheckedAtOut = Promise<string>

/**
 * `loadMatchDims` 的返回。
 */
export type MatchDimsOut = Promise<MatchDims>

/**
 * count 微缓存的一格。
 */
export type CountSlot = {
  /**
   * 总数。
   */
  n: number

  /**
   * 灌入时刻。
   */
  ts: number
}

/**
 * 证言三连数。
 */
export type ProofNums = {
  /**
   * 在招总数。
   */
  total: number

  /**
   * 具名清单命中岗数。
   */
  named: number

  /**
   * 有外劳记录雇主数。
   */
  lmia: number
}

/**
 * 职位域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type JobsCache = {
  /**
   * 匹配维度包(1h TTL);null = 冷。
   */
  dims: {
    /**
     * 灌入时刻。
     */
    at: number

    /**
     * 维度包。
     */
    dims: MatchDims
  } | null

  /**
   * WHERE 签名 → 总数微缓存(30s;300 组防涨)。
   */
  counts: Map<string, CountSlot>

  /**
   * 最近核对时刻微缓存;null = 冷。
   */
  checked: {
    /**
     * 时刻(ISO)。
     */
    v: string

    /**
     * 灌入时刻。
     */
    ts: number
  } | null

  /**
   * 证言三连数缓存;null = 冷。
   */
  proof: {
    /**
     * 三连数。
     */
    v: ProofNums

    /**
     * 灌入时刻。
     */
    ts: number
  } | null

  /**
   * JD 懒抓单飞:applyUrl → 在飞的抓取。
   */
  jdInflight: Map<string, Promise<string>>

  /**
   * 热门职业榜缓存(limit → 榜;10 分钟)。⚠️ lib/quiz/quizTop.ts 还有一份同职缓存 ——
   * quiz 域重构批收拢到这儿(2026-08-22 记账)。
   */
  topNocs: Map<number, TopNocsSlot>

  /**
   * JD 懒抓负缓存:applyUrl → 失败时刻(10 分钟防连点)。
   */
  jdFailed: Map<string, number>

  /**
   * 投递邮箱正缓存:规范化 url → 邮箱(空串 = 确认无邮箱,同样缓存)。
   */
  applyMail: Map<string, string>

  /**
   * 投递抓取失败负缓存:规范化 url → 失败时刻(到期重试)。
   */
  applyFail: Map<string, number>
}

// =========================================================================
// 7. 展示形状(「怎么摆」,库里没有对应的一行;只被页面消费)
// =========================================================================

/**
 * 分层态(E3-05/E5-00,服务端 page.tsx 传入):gate 在服务端已生效,这里只做展示引导。
 */
export type Plan = {
  /**
   * 付费态。
   */
  isPro: boolean

  /**
   * 登录态。
   */
  loggedIn: boolean

  /**
   * 建档可用。
   */
  profileOk: boolean

  /**
   * 规范化档案;null=未建档。
   */
  profile: MatchProfile | null

  /**
   * 免费匹配额度。
   */
  freeMatchCap: number

  /**
   * 邮箱(#84 身份四件 SSR 直传,治头像闪);null=未登录。
   */
  email: string | null

  /**
   * 显示名;null=未设。
   */
  displayName: string | null

  /**
   * 头像;null=未设。
   */
  avatar: string | null

  /**
   * Pro 到期时刻;空串=非 Pro。
   */
  proUntil: string
}

/**
 * 主表列名全集。显示顺序/默认可见/表头文案在 Table.tsx,这里只定「有哪些列」——
 * 它同时是**字段名**:顾问弹框按字段开、字段来源按字段查,都拿它当键。
 */
export type ColKey = 'score' | 'match' | 'pnp' | 'ee' | 'aip' | 'pilot' | 'lmia' | 'eligibility' | 'broad' | 'mid' | 'fine' | 'teer' | 'empHours' | 'empTerm' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'wageMedHr' | 'wageMedYr' | 'vsMedian' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt' | 'actions'

/**
 * 弹框分组(E8-10 三合一后陆续拆出的九组)。
 */
export type FieldGroup = 'company' | 'immigration' | 'category' | 'location' | 'pnp' | 'ee' | 'aip' | 'pilot' | 'salary'

// =========================================================================
// 8. 职业竞争面(该职业各省在招;2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * `fetchOccCompetition` 的入参。
 */
export type OccCompetitionIn = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 档案里的职业码(5 位;不合形的当场滤掉)。
   */
  nocs: StrList
}

/**
 * 该职业一省的竞争面一行。
 * 🔴 职业级「几人抢一个」算不出来,本站不编 —— 只给三类实数与省级名额竞争比,
 * 不合成一个分数(合成就等于替用户拿主意,没有官方口径支持那种合成)。
 */
export type OccCompetitionRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 实时在招岗数(与「查岗位」落地页同一条谓词)。
   */
  openJobs: number

  /**
   * 近 30 天新增(stats_occupation 日快照);没算保 null。
   */
  new30d: number | null

  /**
   * 平均在招天数(本站库内该省该职业);null = 样本不足未算。
   */
  avgDaysOpen: number | null

  /**
   * 该省名额竞争(省级,与职业无关);官方缺位保 null。
   */
  ratio: number | null

  /**
   * 该省 AIP 指定雇主在招的本职业岗数(2026-08-15 Frank「aip 别四个省放一起了,分开来算」)。
   */
  aipJobs: number

  /**
   * 该省 RCIP 试点社区在招的本职业岗数(2026-08-15 Frank「rcip 也需要拆」;
   * LIKE 口径同列表页 pilot=RCIP)。
   */
  rcipJobs: number

  /**
   * FCIP 试点社区 ∩ 本职业(2026-08-15 FCIP 立成通道;与 rcipJobs 同口径,别混 ——
   * Sudbury/Timmins 两地双标,两个数会重叠:那是事实不是重复计数,
   * 两条 pilot 在同一个城市各有各的社区名单与名额)。
   */
  fcipJobs: number
}

/**
 * 竞争面行的复数。
 */
export type OccCompetitionRows = OccCompetitionRow[]

/**
 * `fetchOccCompetition` 的返回。
 */
export type OccCompetitionOut = Promise<OccCompetitionRows>

/**
 * 一行实时在招聚合(SQL.OCC_COMPETITION_BY_PROV 洗净后)。
 */
export type OccOpen = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 实时在招岗数。
   */
  openJobs: number

  /**
   * 近 30 天新增;没算保 null。
   */
  new30d: number | null

  /**
   * 平均在招天数;没算保 null。
   */
  avgDaysOpen: number | null
}

/**
 * 实时在招聚合行的复数。
 */
export type OccOpens = OccOpen[]

/**
 * 一行按省计数(AIP/RCIP/FCIP 三条 COUNT 共用)。
 */
export type ProvCount = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 数。
   */
  n: number
}

/**
 * 按省计数行的复数。
 */
export type ProvCounts = ProvCount[]

/**
 * difficulty json 里本域读的因子格(只要 key/value 两格;宽形状归 points)。
 */
export type OccDiffFactorJson = {
  /**
   * 因子键(名额竞争是 'comp')。
   */
  key: string | null

  /**
   * 因子值(comp 的是比值)。
   */
  value: number | string | null
}

/**
 * difficulty json 里本域读的那一格。
 */
export type OccDiffJson = {
  /**
   * 因子清单。
   */
  factors: OccDiffFactorJson[] | null
}

/**
 * difficulty 一格的原料:json 列驱动可能已解析成对象,经文本列绕行时是字符串。
 */
export type OccDiffRaw = OccDiffJson | string | null

/**
 * `OccDiffJson` 或没有。
 */
export type MaybeOccDiff = OccDiffJson | null

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY)。
 */
export type OccDiffDbRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 难度 json 原料。
   */
  difficulty: OccDiffRaw
}

/**
 * 难度行的复数。
 */
export type OccDiffDbRows = OccDiffDbRow[]

/**
 * 一行各省难度洗净后的事实(json 解析与 comp 因子提取都在 rows 做完,functions 拿到即有效)。
 */
export type OccDiffFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 名额竞争比(difficulty json 里 key='comp' 因子的值);官方缺位保 null。
   */
  ratio: MaybeNum
}

/**
 * 难度事实的复数。
 */
export type OccDiffFacts = OccDiffFact[]

/**
 * 省码 → 名额竞争比。
 */
export type RatioMap = Record<string, number>

/**
 * 省码 → 计数。
 */
export type CountMap = Record<string, number>

/**
 * 比值查表的入参。
 */
export type RatioOfIn = {
  /**
   * 省码 → 比值。
   */
  map: RatioMap

  /**
   * 省码。
   */
  key: string
}

/**
 * 计数查表的入参。
 */
export type CountOfIn = {
  /**
   * 省码 → 计数。
   */
  map: CountMap

  /**
   * 省码。
   */
  key: string
}

/**
 * 热门职业榜缓存的一格。
 */
export type TopNocsSlot = {
  /**
   * 灌入时刻。
   */
  at: number

  /**
   * 榜。
   */
  rows: TopNoc[]
}

// =========================================================================
// 9. 界面显示的入参(2026-08-22 「所有都按域来管理」自 i18n 迁回)
// =========================================================================

/**
 * 界面语言码(镜像 i18n 的 Lang;types 是叶子不 import,加语言时 i18n 装配处 tsc 会点名)。
 */
export type LangCode = 'zh' | 'en' | 'ko'

/**
 * 取词函数的最小面(i18n 的 TFn 结构兼容;显示函数只用「key → 词」这一格)。
 */
export type TransFn = (key: string) => string

/**
 * `drawStreamNote` 的入参。
 */
export type DrawStreamNoteIn = {
  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 界面语言。
   */
  lang: LangCode
}

/**
 * `streamDisplay` 的入参。
 */
export type StreamDisplayIn = {
  /**
   * 取词函数。
   */
  t: TransFn

  /**
   * 数据层的中文 label。
   */
  label: string
}

/**
 * `reqStreamDisplay` 的入参。
 */
export type ReqStreamDisplayIn = {
  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 界面语言(调用端拿 `t.lang` 时自行 `?? 'zh'` 兜缺省)。
   */
  lang: LangCode
}

/**
 * `eeDisplay` 的入参。
 */
export type EeDisplayIn = {
  /**
   * 取词函数。
   */
  t: TransFn

  /**
   * 数据层 label(可含「/」多段)。
   */
  label: string
}

/**
 * `eeKeyDisplay` 的入参。
 */
export type EeKeyDisplayIn = {
  /**
   * 取词函数。
   */
  t: TransFn

  /**
   * 数据层英文 cat_key。
   */
  key: string
}

/**
 * `dropProvPrefix` 的入参。
 */
export type DropProvPrefixIn = {
  /**
   * 通道名。
   */
  name: string

  /**
   * 省名(全称)。
   */
  prov: string
}

/**
 * 省情报卡(/api/jobs/province):info 与 difficulty 都是库列**透传**——
 * jsonb 驱动给对象、文本列绕行给字符串,消费端自己认(与 stats 的 StatDifficulty 同一口径)。
 */
export type ProvCard = {
  /**
   * provinces.info(IRCC 体量数,mart 挂列);没有是 null。
   */
  info: JsonCell

  /**
   * stats 表 broad='all' 行的 difficulty;没有是 null。
   */
  difficulty: JsonCell
}

/**
 * `loadProvinceCard` 的入参。
 */
export type ProvinceCardIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 省码(路由已验形)。
   */
  code: string
}

/**
 * `loadProvinceCard` 的返回(查无该省是 null)。
 */
export type ProvinceCardOut = Promise<ProvCard | null>

/**
 * 大类计数一行(市/区热门方向)。
 */
export type BroadCount = {
  /**
   * 大类名。
   */
  broad: string

  /**
   * 在招岗数。
   */
  n: number
}

/**
 * PGWP 可申院校一行(市情报卡的 dli.top)。
 */
export type DliTop = {
  /**
   * 院校名。
   */
  name: string

  /**
   * 公立与否。
   */
  isPublic: boolean
}

/**
 * 区主要雇主一行。
 */
export type DistrictEmployerRow = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 公司页 slug;没有是空串。
   */
  slug: string

  /**
   * 在招岗数。
   */
  n: number
}

/**
 * 市/区共用的聚合三件(在招/近 7 日/帖面中位年薪)。
 */
export type CityAgg = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 日新增。
   */
  new7d: number

  /**
   * 帖面中位年薪(取整);算不出是 null。
   */
  medSalary: MaybeNum
}

/**
 * 区级情报(district 参数传了才有)。
 */
export type DistrictCard = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 日新增。
   */
  new7d: number

  /**
   * 帖面中位年薪;算不出是 null。
   */
  medSalary: MaybeNum

  /**
   * 热门大分类。
   */
  topBroads: BroadCount[]

  /**
   * 主要雇主。
   */
  topEmployers: DistrictEmployerRow[]
}

/**
 * 市情报卡(/api/jobs/city;E8-12b 懒查询,弹框打开才拉)。
 */
export type CityCard = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 日新增。
   */
  new7d: number

  /**
   * 帖面中位年薪;算不出是 null。
   */
  medSalary: MaybeNum

  /**
   * 热门大分类。
   */
  topBroads: BroadCount[]

  /**
   * PGWP 可申院校:总数 + 前几名。
   */
  dli: {
    /**
     * 该市院校总数。
     */
    count: number

    /**
     * 前几名(公立优先)。
     */
    top: DliTop[]
  }

  /**
   * AIP 指定雇主数(location 含该市)。
   */
  aipEmployers: number

  /**
   * 区级情报;没传 district 是 null。
   */
  district: DistrictCard | null
}

/**
 * `loadCityCard` 的入参。
 */
export type CityCardIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 城市名(路由已验长)。
   */
  city: string

  /**
   * 省码(路由已验形)。
   */
  prov: string

  /**
   * 区名;空串 = 不带区级。
   */
  district: string
}

/**
 * `loadCityCard` 的返回。
 */
export type CityCardOut = Promise<CityCard>

/**
 * 筛选下拉的城市维度一行。
 */
export type CityDim = {
  /**
   * 城市名。
   */
  name: string

  /**
   * 省码。
   */
  province: string
}

/**
 * 筛选下拉的区维度一行。
 */
export type DistrictDim = {
  /**
   * 区名。
   */
  name: string

  /**
   * 所属市。
   */
  city: string

  /**
   * 省码。
   */
  province: string
}

/**
 * AIP 指定雇主维度一行。
 */
export type DesigDim = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 省码。
   */
  province: string

  /**
   * 名录上的地点原文。
   */
  location: string

  /**
   * 是否名录标注的科技岗雇主。
   */
  isTech: boolean
}

/**
 * NOC 描述维度一行。
 */
export type NocDescDim = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 英文职业名。
   */
  title: string

  /**
   * 中文职业名。
   */
  titleZh: string

  /**
   * 韩文职业名。
   */
  titleKo: string

  /**
   * 职责摘录。
   */
  duties: string

  /**
   * 要求摘录。
   */
  requirements: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * 大维度包(/api/jobs/dims;E10-01 P3 从旧 20k blob 拆出)。
 */
export type BigDims = {
  /**
   * 城市维度。
   */
  cities: CityDim[]

  /**
   * 区维度。
   */
  districts: DistrictDim[]

  /**
   * AIP 指定雇主维度。
   */
  designatedEmployers: DesigDim[]

  /**
   * NOC 描述维度。
   */
  nocDescriptions: NocDescDim[]
}

/**
 * `loadBigDims` 的入参。
 */
export type BigDimsIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db
}

/**
 * `loadBigDims` 的返回。
 */
export type BigDimsOut = Promise<BigDims>

/**
 * `fetchApplyEmail` 的返回:邮箱;空串 = 确认无;null = 抓取失败(有没有未知,负缓存到期重试)。
 */
export type ApplyMailOut = Promise<string | null>

/**
 * POST /api/jobs/company 的请求体形状(跨边界断言目标,逐格判后才用)。
 */
export type CompanyBody = {
  /**
   * 岗位 id;不是数就 400。
   */
  jobId: number | string | null
}

/**
 * 相似雇主清单（emptySimilar 兜底的返回；数组在签名位要本域名字）。
 */
export type SimilarList = SimilarEmployer[]
