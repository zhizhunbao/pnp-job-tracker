/**
 * advisor 域的形状:输出语言、岗位事实、各场景拼装函数的入参。
 * 本域只声明自己真正读的格(叶子不 import);「没有」一律显式 `| null`。
 * 老链 api/advisor 的 Job 是全可选形状 —— 2026-08-23 契约换 id 制后,事实由服务端
 * 现查组装成本形状再进拼装函数,前端整包上传的伪造洞随之关闭。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */
import type { AgentMessage, AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import type { Model, TSchema } from '@earendil-works/pi-ai'
import type { CityCard, JobRow, JsonCell, JsonObj, MatchJob, ProvCard } from '@/lib/jobs'
import type { WEB_FETCH_PARAMS } from './schemas'

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
 * pi 模型描述符(库类型起本地名,签名里不出现外部类型)。
 */
export type ModelOut = Model<'openai-completions'>

/**
 * 工具回执里给我们自己读的那格(不进模型上下文,只记账)。
 */
export type ToolNote = {
  /**
   * 这把工具回给模型的正文长度(0 = 失败句)。
   */
  n: number
}

/**
 * 一把 advisor 工具(pi 的 AgentTool 起本地名)。
 */
export type Tool<P extends TSchema> = AgentTool<P, ToolNote>

/**
 * 工具回执(pi 的 AgentToolResult 起本地名)。
 */
export type Reply = AgentToolResult<ToolNote>

/**
 * 交给模型的工具表(目前只有 web_fetch 一种;空数组 = 无工具场景)。
 */
export type ToolList = Tool<typeof WEB_FETCH_PARAMS>[]

/**
 * 循环产出的整串消息(pi 的 AgentMessage 起本地名)。
 */
export type TranscriptList = AgentMessage[]

/**
 * 循环里流动的一条消息(pi 的 AgentMessage 起本地名)。
 */
export type TranscriptMsg = AgentMessage

/**
 * pi 事件里我们读的两格(事件是 10 种的大联合,只声明自己认的形状)。
 */
export type EventIn = {
  /**
   * 事件种类;只认 message_update。
   */
  type: string

  /**
   * 那一刻的助手消息(累积形态),只有部分事件带它。
   */
  // eslint-disable-next-line local/no-optional -- pi 的事件形状:缺席字段由库定,不是我们的契约
  message?: TranscriptMsg
}

/**
 * 大类计数行里我们读的两格(jobs 域 BroadCount 的形状,本域自声明)。
 */
export type BroadCountCell = {
  /**
   * 大类名。
   */
  broad: string

  /**
   * 计数。
   */
  n: number
}

/**
 * 雇主计数行里我们读的两格。
 */
export type EmployerCountCell = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 在招数。
   */
  n: number
}

/**
 * 只读名字的一行(院校表)。
 */
export type NamedCell = {
  /**
   * 名字。
   */
  name: string
}

/**
 * `pushVolLine` 的入参(体量行:对象格在才出行)。
 */
export type VolLineIn = {
  /**
   * 输出行数组(原地追加)。
   */
  out: string[]

  /**
   * 对象格;null = 整行不出。
   */
  obj: MaybeObj

  /**
   * 行模板({n}/{year} 两槽)。
   */
  tpl: string
}

/**
 * 流式增量回调(chunk = 新增的一段正文)。
 */
export type DeltaFn = (chunk: string) => void

/**
 * 跑一趟 advisor 循环的入参。
 */
export type RunIn = {
  /**
   * system 全文。
   */
  system: string

  /**
   * 用户提示词(chat 场景已折入转写)。
   */
  prompt: string

  /**
   * 工具表;简单场景传空数组(≈一发,零额外开销)。
   */
  tools: ToolList

  /**
   * 生成长度档。
   */
  maxTokens: number

  /**
   * 增量回调;null = 不要流。
   */
  onDelta: DeltaFn | null
}

/**
 * `runAdvisor` 的返回:模型全文(闸前)。
 */
export type RunOut = Promise<string>

/**
 * `webFetchToolOf` 的入参。
 */
export type WebFetchToolIn = {
  /**
   * 定死的官网 URL(服务端选定,模型不可改)。
   */
  url: string
}

/**
 * POST /api/advisor 的请求体形状(跨边界断言目标,逐格判后才用)。
 * 老前端还会带整包 `job` —— 契约换 id 制后服务端**不读它**(信任边界:事实一律现查)。
 */
export type AdvisorWire = {
  /**
   * 场景名;不是字符串按 title 走(老链同口径)。
   */
  field: string | null

  /**
   * 标识:job 场景 = jobs 主键;occRead = NOC;provRead = 省码;cityRead = `市|省[|区]`。
   */
  id: string | null

  /**
   * 语言;非 en/ko 一律 zh(老链同口径)。
   */
  lang: string | null

  /**
   * 追问轮;缺省当一次性初判。
   */
  messages: ChatMsgList | null
}

/**
 * 服务端按场景查好的一包事实(routes 组装,进拼装函数)。
 */
export type FactsPack = {
  /**
   * 岗位事实(occ/loc 速读场景是空壳 + 对应格)。
   */
  job: AdvisorJob

  /**
   * 缓存键标识(company = 小写公司名;其余 = body.id)。
   */
  keyId: string
}

/**
 * `provFactsOf` 的入参。
 */
export type ProvFactsIn = {
  /**
   * 省码(已验形大写)。
   */
  code: string

  /**
   * 省情报卡(jobs 域 loadProvinceCard 的透传两格)。
   */
  card: ProvCardCell
}

/**
 * 省情报卡形状(jobs 域的名字起本地别名)。
 */
export type ProvCardCell = ProvCard

/**
 * 市情报卡形状(同上)。
 */
export type CityCardCell = CityCard

/**
 * 库 jsonb 透传格(值级收窄在本域 to* 段做)。
 */
export type Cell = JsonCell

/**
 * jsonb 对象格(jobs 域的名字起本地别名)。
 */
export type CellObj = JsonObj

/**
 * 可空对象格。
 */
export type MaybeObj = CellObj | null

/**
 * jsonb 数组格。
 */
export type CellList = Cell[]

/**
 * 按键取格的入参。
 */
export type CellAtIn = {
  /**
   * 对象格。
   */
  obj: CellObj

  /**
   * 键名。
   */
  key: string
}

/**
 * 按 key 字段找因子的入参(difficulty.factors 形状)。
 */
export type FactorIn = {
  /**
   * 因子数组。
   */
  list: CellList

  /**
   * 因子的 key 值(comp/quotaTrend/activity)。
   */
  key: string
}

/**
 * 工具回执的 Promise(库泛型起本地名)。
 */
export type ReplyOut = Promise<Reply>

/**
 * `lastTextOf` 的入参。
 */
export type LastTextIn = {
  /**
   * 循环产出的整串消息。
   */
  messages: TranscriptList

  /**
   * 这一趟是不是被超时掐断的(pi 被 abort 是正常返回不抛,只能在这认)。
   */
  aborted: boolean
}

/**
 * `makeOccJob` 的入参(occRead 场景的最小事实包)。
 */
export type OccJobIn = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方职责原文。
   */
  duties: string

  /**
   * 官方任职要求原文。
   */
  requirements: string
}

/**
 * `makeLocJob` 的入参(provRead/cityRead 场景的最小事实包)。
 */
export type LocJobIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 服务端重建的地点事实块。
   */
  facts: string
}

/**
 * `chatPromptOf` 的入参(多轮折转写)。
 */
export type ChatPromptIn = {
  /**
   * 追问轮(已过滤合法角色)。
   */
  messages: ChatMsgList
}

/**
 * `cityFactsOf` 的入参。
 */
export type CityFactsIn = {
  /**
   * 市名。
   */
  city: string

  /**
   * 省码(已验形大写)。
   */
  prov: string

  /**
   * 区名;空串 = 市级。
   */
  district: string

  /**
   * 市情报卡。
   */
  card: CityCardCell
}

/**
 * jobs 域的整行形状(起本地别名;toAdvisorJob 的输入)。
 */
export type JobRowCell = JobRow

/**
 * jobs 域 match() 的岗位输入形状(起本地别名;matchJobOf 的返回)。
 */
export type MatchJobCell = MatchJob

/**
 * 响应头键值对。
 */
export type HeaderMap = Record<string, string>

/**
 * `headersOf` 的入参。
 */
export type HeadersOfIn = {
  /**
   * freeGate 带出的头(X-Free-Left;可空对象)。
   */
  gate: HeaderMap

  /**
   * X-Cache 值(hit/miss)。
   */
  cache: string

  /**
   * X-JD 值;null = 不带这枚头(缓存命中响应老链就不带)。
   */
  jd: string | null
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
