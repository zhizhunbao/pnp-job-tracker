/**
 * advisor 域的形状:输出语言、岗位事实、各场景拼装函数的入参。
 * 本域只声明自己真正读的格(叶子不 import);「没有」一律显式 `| null`。
 * 老链 api/advisor 的 Job 是全可选形状 —— 2026-08-23 契约换 id 制后,事实由服务端
 * 现查组装成本形状再进拼装函数,前端整包上传的伪造洞随之关闭。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */

/**
 * 输出语言(前端 lang 参数收窄后)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 可空字符串(签名用的本域名字;「没有」显式 null)。
 */
export type MaybeStr = string | null

/**
 * 可空数字。
 */
export type MaybeNum = number | null

/**
 * 一组分段标题(HEADINGS 表的一门语言)。
 */
export type HeadingPair = {
  /**
   * 公司初判四段。
   */
  company: string

  /**
   * 职位初判三段。
   */
  title: string
}

/**
 * clipLinesOf 的入参(occRead 官方文本的截断口径)。
 */
export type ClipLinesIn = {
  /**
   * 原文(多行)。
   */
  text: string

  /**
   * 保留行数上限。
   */
  maxLines: number

  /**
   * 保留字符上限(行截完再截总长)。
   */
  maxLen: number
}

/**
 * 多轮追问的一条消息(user/assistant 交替;system 由服务端拼)。
 */
export type ChatMsg = {
  /**
   * 角色。
   */
  role: 'user' | 'assistant'

  /**
   * 文本内容。
   */
  content: string
}

/**
 * 追问消息列表。
 */
export type ChatMsgList = ChatMsg[]

/**
 * 字符串列表(证书、调查来源等)。
 */
export type StrList = string[]

/**
 * 岗位事实(拼装函数的唯一底料;每格与 DB 列/面板同源,服务端现查后填入)。
 */
export type AdvisorJob = {
  /**
   * 职位标题。
   */
  title: string | null

  /**
   * 公司名。
   */
  company: string | null

  /**
   * 公司简介(companies 富化,抓官网/AI 调查)。
   */
  companyDescription: string | null

  /**
   * 公司行业串。
   */
  companySectors: string | null

  /**
   * NOC 五位码。
   */
  noc: string | null

  /**
   * 本站大类名(ETL noc_buckets 算好存字段;别拿 NOC 首位现推 —— 常年是错的)。
   */
  broad: string | null

  /**
   * 省码(两字母;喂模型前要换全名 —— #168 实撞)。
   */
  province: string | null

  /**
   * 市名。
   */
  city: string | null

  /**
   * 区名。
   */
  district: string | null

  /**
   * 精确地址(含街号才有)。
   */
  address: string | null

  /**
   * 公司官网 URL。
   */
  officialUrl: string | null

  /**
   * 申请 URL(JD 正文按它取)。
   */
  applyUrl: string | null

  /**
   * 旧 0-100 分(仅事实行陈列,解读禁报总分)。
   */
  score: number | null

  /**
   * 通道档 1-5(#133 喂档名语义不喂数字)。
   */
  gradeChannel: number | null

  /**
   * 经验档文案。
   */
  accessibility: string | null

  /**
   * PNP 粗筛信号。
   */
  pnpEligible: boolean

  /**
   * 命中的省清单 stream 名。
   */
  pnpStream: string | null

  /**
   * 联邦 EE 类别。
   */
  eeCategory: string | null

  /**
   * AIP 指定雇主信号。
   */
  aip: boolean

  /**
   * 帖面薪资原文。
   */
  salary: string | null

  /**
   * 年化薪资。
   */
  salaryAnnual: number | null

  /**
   * 雇佣期限(permanent 等)。
   */
  employmentTerm: string | null

  /**
   * 工时形态(full-time 等)。
   */
  employmentHours: string | null

  /**
   * 证书/执照要求。
   */
  certificates: StrList

  /**
   * 学历要求。
   */
  education: string | null

  /**
   * 当地 NOC 中位时薪(ESDC;官方可空,禁折 0)。
   */
  wageMedHourly: number | null

  /**
   * 当地 NOC 中位年薪。
   */
  wageMedAnnual: number | null

  /**
   * 近两年 LMIA 获批岗位数(coRead 担保信号)。
   */
  lmiaPositions: number | null

  /**
   * 其中 skilled 股别数。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近出现的季度。
   */
  lmiaLastQuarter: string | null

  /**
   * 原始来源板。
   */
  source: string | null

  /**
   * 来源显示标签(JB→Job Bank)。
   */
  sourceLabel: string | null

  /**
   * 发布渠道(jobbank/ats/directory)。
   */
  origin: string | null

  /**
   * 发布日期(ISO 串)。
   */
  datePosted: string | null

  /**
   * 最近可见(ISO 串)。
   */
  lastSeen: string | null

  /**
   * 在招状态。
   */
  status: string | null

  /**
   * 官方职责原文(occRead 场景;NOC 级)。
   */
  duties: string | null

  /**
   * 官方任职要求原文(occRead 场景)。
   */
  requirements: string | null

  /**
   * 地点事实数字块(provRead/cityRead 场景;与面板同源)。
   */
  locationFacts: string | null
}

/**
 * 联网调查结果(#107 K 调查;形状本域自声明,不 import employers)。
 */
export type WebResearch = {
  /**
   * 调查简报文本。
   */
  brief: string | null

  /**
   * 来源 URL 列表。
   */
  sources: StrList
}

/**
 * 公司初判拼装的入参。
 */
export type CompanyPromptIn = {
  /**
   * 岗位事实(公司场景读 company/companyDescription/companySectors/officialUrl/地点格)。
   */
  job: AdvisorJob

  /**
   * 联网调查结果;没查到/没查为 null。
   */
  web: WebResearch | null

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 职业速读拼装的入参。
 */
export type OccReadPromptIn = {
  /**
   * 岗位事实(读 noc/broad/duties/requirements)。
   */
  job: AdvisorJob

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 地点速读的两个场景名。
 */
export type LocReadField = 'provRead' | 'cityRead'

/**
 * 地点速读拼装的入参。
 */
export type LocReadPromptIn = {
  /**
   * provRead(省)还是 cityRead(市/区)。
   */
  field: LocReadField

  /**
   * 岗位事实(读 locationFacts)。
   */
  job: AdvisorJob

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 职位帖速读拼装的入参。
 */
export type JdReadPromptIn = {
  /**
   * 岗位事实(读帖面基本盘)。
   */
  job: AdvisorJob

  /**
   * JD 原文(截断后);没抓到为空串。
   */
  jd: string

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 公司速读拼装的入参。
 */
export type CoReadPromptIn = {
  /**
   * 岗位事实(读公司格 + LMIA 担保格)。
   */
  job: AdvisorJob

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 字段解释拼装的入参(ASK 表驱动的其它字段)。
 */
export type FieldPromptIn = {
  /**
   * 字段名(前端的 field 参数)。
   */
  field: string

  /**
   * 岗位事实。
   */
  job: AdvisorJob

  /**
   * 档案事实附加块(Pro;无档案为空串)。
   */
  pf: string

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * 初判(title/immigration)拼装的入参。
 */
export type ImmigrationPromptIn = {
  /**
   * 岗位事实。
   */
  job: AdvisorJob

  /**
   * JD 原文(截断后);没抓到为空串。
   */
  jd: string

  /**
   * 输出语言。
   */
  lang: Lang
}

/**
 * buildPrompt 总分发的入参(老链六参收成一参;分支口径与老链逐字一致)。
 */
export type PromptIn = {
  /**
   * 字段名。
   */
  field: string

  /**
   * 岗位事实。
   */
  job: AdvisorJob

  /**
   * JD 原文(截断后);不需要的场景传空串。
   */
  jd: string

  /**
   * 输出语言。
   */
  lang: Lang

  /**
   * 档案事实附加块(Pro;无档案为空串)。
   */
  pf: string

  /**
   * 联网调查结果(company 场景;其余传 null)。
   */
  web: WebResearch | null
}

/**
 * 多轮追问 system 拼装的入参。
 */
export type ChatSystemIn = {
  /**
   * 岗位事实。
   */
  job: AdvisorJob

  /**
   * JD 摘录(截断后);没抓到为空串。
   */
  jd: string

  /**
   * 输出语言。
   */
  lang: Lang

  /**
   * 档案事实附加块(无档案为空串)。
   */
  pf: string
}

/**
 * 档案事实拼装的入参(匹配判定在 jobs 域算完,这里只收结果拼文本 ——
 * 行为不复制:match/normalizeProfile/reasonEn 都留在它们的主人那儿)。
 */
export type ProfileFactsIn = {
  /**
   * 自报 NOC 码列表。
   */
  nocCodes: StrList

  /**
   * 自报 CLB;未报为 null。
   */
  clb: number | null

  /**
   * 自报 CRS;未报为 null。
   */
  crs: number | null

  /**
   * 目标省码列表。
   */
  targetProvinces: StrList

  /**
   * PGWP 剩余月数;未报为 null。
   */
  pgwpMonthsLeft: number | null

  /**
   * 本岗匹配档(jobs.match 的 level)。
   */
  level: string

  /**
   * 本岗匹配分(jobs.match 的 score)。
   */
  score: number

  /**
   * 匹配依据行(已过 reasonEn 的英文句)。
   */
  reasons: StrList
}

/**
 * 缓存键拼装的入参。
 */
export type CacheKeyIn = {
  /**
   * 字段名。
   */
  field: string

  /**
   * 标识(公司场景 = 小写公司名;其余 = 职位 id)。
   */
  keyId: string

  /**
   * 输出语言。
   */
  lang: Lang

  /**
   * 带档案时的用户 id(按人隔离);无档案为 null。
   */
  userId: string | null
}
