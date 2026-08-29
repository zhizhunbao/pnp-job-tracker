/**
 * advisor 域的形状:内嵌初判段的 props、它的状态档与流式取数的入参。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs 迁入。
 *
 * 🔴 跨域 `import type` 是**原样透传**的外域形状:整份职位行、分层态与七张维度表由调用方
 * (职位详情 / 公司弹框 / 本域弹框)交过来,本域把它们整份喂给外域引擎
 * (PnpListSection / EeCategorySection / MeansForMe / CompanyPanel)与接口、额度闸。
 * 重抄一份当天就会脱节 —— 宪法「亲手构造后喂外域引擎的形状全格照抄」的同一条:
 * 少声明一格,喂过去就是 tsc 红。真正只读几格的(维度表里的 name / province / noc 等)
 * 仍然读的是同一份整行,拆不出独立子集。
 * 2026-08-28 换装批把完整弹框那半重写进本域,透传清单随之从两条扩到十二条。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
// eslint-disable-next-line local/no-import-in-leaf -- 只 import type,理由见文件头(原样透传的外域整份行)
import type {
  ColKey, DesigEmp, EeOcc, FieldGroup, FieldSource, JobRow, NewsSlim, NocDesc, Plan, PnpDraw, PnpOcc, ProvInfo,
} from '@/lib/jobs'

/**
 * 界面语言(三字面量各域自抄)。
 */
export type AdvisorLang = 'zh' | 'en' | 'ko'

/**
 * 职位整行(外域形状,见文件头)。
 */
export type AdvisorJob = JobRow

/**
 * 分层态(外域形状,见文件头):额度闸按它走。
 */
export type AdvisorPlan = Plan

/**
 * 内嵌初判段的状态档。
 */
export type AdvisorStatus = 'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'

/**
 * 这一段生成的是哪一种:顾问初判(含移民路径)/ 纯 JD 速读 / 公司速读。
 */
export type AdvisorField = 'title' | 'jdRead' | 'coRead'

/**
 * JdAdvisorSection 的 props。
 */
export type JdAdvisorSectionIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * 段标题(可省 = 「AI 顾问」)。
   */
  title?: string

  /**
   * 生成哪一种(可省 = 顾问初判)。
   */
  field?: AdvisorField
}

/**
 * streamAdvisor 的入参。
 */
export type StreamAdvisorIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 生成哪一种。
   */
  field: AdvisorField

  /**
   * 中断信号(组件卸载时掐掉在途请求)。
   */
  signal: AbortSignal

  /**
   * 出一段字就回一次(打字机)。
   */
  onChunk: (acc: string) => void

  /**
   * 剩余免费次数回传。
   */
  onFreeLeft: (n: number) => void
}

/**
 * streamAdvisor 交回的结果。
 */
export type StreamAdvisorOut = {
  /**
   * 落定的状态档。
   */
  status: AdvisorStatus

  /**
   * 摘掉尾行建议问题之后的正文(状态不是 done 时是空串)。
   */
  body: string
}

/**
 * useAdvisorSection 的入参。
 */
export type AdvisorSectionIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 生成哪一种。
   */
  field: AdvisorField

  /**
   * 段标题;缺席 = 用「AI 顾问」。
   */
  title?: string

  /**
   * 分层态(429 锁行的引导按登录态分)。
   */
  plan: AdvisorPlan
}

/**
 * 取词函数(与 lib/i18n 的 TFn 同形 —— 宪法「types 自声明」)。
 */
export type AdvisorTFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 内嵌初判段交回的面板。
 */
export type AdvisorPanel = {
  /**
   * 取词函数(锁行组件要它)。
   */
  t: AdvisorTFn

  /**
   * 当前正文(流式期间是半截)。
   */
  text: string

  /**
   * 状态档。
   */
  status: AdvisorStatus

  /**
   * 段标题。
   */
  head: string

  /**
   * 剩余次数灰注;'' = 还没拿到。
   */
  leftText: string

  /**
   * 在途文案。
   */
  loadingText: string

  /**
   * 失败文案。
   */
  failText: string

  /**
   * 重试钮文案。
   */
  retryText: string

  /**
   * 429 锁行的正文。
   */
  limitMsg: string

  /**
   * 429 锁行的引导;'' = 不出(已登录)。
   */
  limitCta: string

  /**
   * 免费额度用完。
   */
  upgrade: boolean

  /**
   * 被防滥用闸挡下。
   */
  limited: boolean

  /**
   * 在途。
   */
  loading: boolean

  /**
   * 生成失败(可重试)。
   */
  failed: boolean

  /**
   * 有正文可渲(流式中或出完了)。
   */
  hasBody: boolean

  /**
   * 重试生成。
   */
  onRetry: () => void
}

/**
 * advisorKeyOf 的入参。
 */
export type AdvisorKeyIn = {
  /**
   * 生成哪一种。
   */
  field: string

  /**
   * 这一岗的号。
   */
  id: string | number
}

/**
 * drainStream 的入参。
 */
export type DrainStreamIn = {
  /**
   * 响应体。
   */
  body: ReadableStream<Uint8Array>

  /**
   * 每读到一段就回一次(打字机)。
   */
  onChunk: (acc: string) => void
}

/**
 * headOf 的入参。
 */
export type AdvisorHeadIn = {
  /**
   * 调用方给的标题;缺席 = 用兜底。
   */
  title: string | undefined

  /**
   * 兜底标题(「AI 顾问」)。
   */
  fallback: string
}

/**
 * leftTextOf 的入参。
 */
export type AdvisorLeftIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 剩余免费次数;null = 还没拿到。
   */
  freeLeft: number | null
}

/**
 * limitCtaOf 的入参。
 */
export type AdvisorCtaIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 登录态。
   */
  loggedIn: boolean
}

/**
 * 列名键(外域形状,见文件头):点开弹框的那一格是哪一列。
 */
export type AdvisorColKey = ColKey

/**
 * 分组名(外域形状):一次铺开一组事实的那个组。
 */
export type AdvisorGroup = FieldGroup

/**
 * 省提名职业清单(外域整表,整份喂给 PnpListSection 与 MeansForMe)。
 */
export type AdvisorPnpOccs = PnpOcc[]

/**
 * 各省抽选记录(外域整表,整份喂给 PnpDrawsBlock / PnpListSection / EeCategorySection)。
 */
export type AdvisorPnpDraws = PnpDraw[]

/**
 * 官方新闻(外域整表,整份喂给 NewsLatestBlock / PnpListSection)。
 */
export type AdvisorNewsList = NewsSlim[]

/**
 * 联邦快速通道类别(外域整表,整份喂给 EeCategorySection 与 MeansForMe)。
 */
export type AdvisorEeOccs = EeOcc[]

/**
 * AIP 指定雇主名录(外域整表:AIP 事实块与市级卡都按公司名/城市筛它)。
 */
export type AdvisorDesigEmps = DesigEmp[]

/**
 * NOC 官方职业描述(外域整表,整份喂给 PnpListSection / EeCategorySection / NocDutiesView)。
 */
export type AdvisorNocDescs = NocDesc[]

/**
 * 字段出处注册表(外域整表,弹框 props 上的透传格 —— 出处能力 E4-04 已后置到 /sources 解释页)。
 */
export type AdvisorFieldSources = FieldSource[]

/**
 * 省级 IRCC 体量事实(外域形状,整份来自 `/api/jobs/province`)。
 */
export type AdvisorProvInfo = ProvInfo

/**
 * 点一行在榜岗的回调(职位板把「换成看这一岗」的动作注进来)。
 */
export type OpenJobFn = (j: AdvisorJob) => void

/**
 * 顾问事实的取数包:铺一组事实要用到的那一岗与随之交过来的维度表。
 * 收成一个包是因为**每一件事实件都要同一份** —— 摊成十个 props 就是每层
 * 逐字抄一遍,加一张维度表要改十个文件。
 */
export type AdvisorFacts = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 省提名职业清单。
   */
  pnpOcc: AdvisorPnpOccs

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws

  /**
   * 官方新闻。
   */
  news: AdvisorNewsList

  /**
   * 用户自报语言档;null = 没填(清单里的语言门槛照旧列,只是不标「你够不够」)。
   */
  profileClb: number | null

  /**
   * 联邦快速通道类别。
   */
  eeOcc: AdvisorEeOccs

  /**
   * AIP 指定雇主名录。
   */
  desigEmp: AdvisorDesigEmps

  /**
   * NOC 官方职业描述。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 清单译名开关(2026-07-25 Frank「和上面的中文翻译按钮联动」)。
   */
  showZh: boolean
}

/**
 * 只按取数包渲的事实件的 props。
 */
export type AdvisorFactsIn = {
  /**
   * 取数包。
   */
  f: AdvisorFacts
}

/**
 * 按字段分叉的事实件的 props。
 */
export type FieldFactsIn = {
  /**
   * 点开的是哪一格(同一组里各字段看各的,07-06 用户拍板)。
   */
  field: string

  /**
   * 取数包。
   */
  f: AdvisorFacts
}

/**
 * 分组事实的 props。
 */
export type GroupFactsIn = {
  /**
   * 铺开哪一组。
   */
  group: string

  /**
   * 取数包。
   */
  f: AdvisorFacts
}

/**
 * FactsBox 的 props。
 */
export type FactsBoxIn = {
  /**
   * 一块事实里的各行。
   */
  children: React.ReactNode

  /**
   * 口径注(缺席 = 不出;有值时才渲那一行灰字)。
   */
  note?: React.ReactNode
}

/**
 * TitleFacts 的 props。
 */
export type TitleFactsIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * useJobText 的入参。
 */
export type JobTextIn = {
  /**
   * 这一岗(换岗即重取)。
   */
  job: AdvisorJob
}

/**
 * useJobText 交回的面板。
 */
export type JobTextPanel = {
  /**
   * JD 正文;null = 还在取,空串 = 取回来是空的。
   */
  text: string | null

  /**
   * 被 JD 宽松防滥用闸挡下(#201:429 偶发,JD 已免费,非付费墙)。
   */
  limited: boolean
}

/**
 * 一块事实里的一行「标签-值」(纯字符串值,行构造在 functions.ts 里做完)。
 */
export type KvFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 标签。
   */
  label: string

  /**
   * 值。
   */
  value: string
}

/**
 * KvRow 的 props(市/区体量卡那种定宽标签行)。
 */
export type KvRowIn = {
  /**
   * 标签。
   */
  label: string

  /**
   * 值。
   */
  value: string
}

/**
 * HlRow 的 props(点哪个字段哪一行亮的身份行)。
 */
export type HlRowIn = {
  /**
   * 标签。
   */
  label: string

  /**
   * 这一行是不是点进来的那一格。
   */
  on: boolean

  /**
   * 标签列窄档(地点卡 64,分类卡 88)。
   */
  narrow: boolean

  /**
   * 值(地点卡的值是地图链接,所以收 JSX 不收字符串)。
   */
  children: React.ReactNode
}

/**
 * 点了才生成的那类 AI 段的档:分类速读 / 省级解读 / 市区解读。
 * 与 AdvisorField(自动生成的那三档)分开:这三档**不点不烧**,#176 零成本默认不破。
 */
export type AdvisorReadField = 'occRead' | 'provRead' | 'cityRead'

/**
 * useAiRead 的入参。
 */
export type AiReadIn = {
  /**
   * 生成哪一种。
   */
  field: AdvisorReadField

  /**
   * 拿什么当主体:分类速读给 NOC 码,省级给省码,市区给「市|省|区」拼串
   * (2026-08-23 契约换 id 制:事实块由服务端用面板同一取数函数重建)。
   */
  id: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 点开时记的埋点名;空串 = 这一处不埋点。
   */
  trackName: string
}

/**
 * 点了才生成的那类 AI 段的状态档:比自动生成的那三档多一个「还没点过」
 * —— 不点不烧,#176 零成本默认不破。
 */
export type AdvisorReadStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'

/**
 * useAiRead 交回的面板。
 */
export type AiReadPanel = {
  /**
   * 折叠开关(#183 Frank「点完按钮怎么没了」:常驻开关,点开点收都是它,
   * 内容留在 state,收起再开不重烧)。
   */
  on: boolean

  /**
   * 状态档。
   */
  status: AdvisorReadStatus

  /**
   * 正文(已摘掉尾行建议问题)。
   */
  text: string

  /**
   * 开合。
   */
  onToggle: () => void
}

/**
 * makeRunAiRead 的入参。
 */
export type RunAiReadIn = {
  /**
   * 生成哪一种。
   */
  field: AdvisorReadField

  /**
   * 主体标识。
   */
  id: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 状态落格。
   */
  setStatus: (s: AdvisorStatus) => void

  /**
   * 正文落格。
   */
  setText: (s: string) => void
}

/**
 * AiReadCard 的 props。
 */
export type AiReadCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 登录态(锁行的引导按它分层)。
   */
  loggedIn: boolean

  /**
   * AI 段面板。
   */
  ai: AiReadPanel
}

/**
 * 职责/要求的译文(逐行对位:noc-translate 按行编号对位,行数恒等)。
 */
export type NocTrans = {
  /**
   * 主要职责译文。
   */
  duties: string

  /**
   * 任职要求译文。
   */
  requirements: string
}

/**
 * 翻译接口回来的原始形状(归一前:键可能不在,值可能是 null)。
 */
export type NocTransJson = {
  /**
   * 成不成。
   */
  ok?: boolean

  /**
   * 主要职责译文。
   */
  duties?: string | null

  /**
   * 任职要求译文。
   */
  requirements?: string | null
}

/**
 * 中文对照的状态档:没点过 / 在翻 / 翻砸了。
 */
export type TransStatus = 'idle' | 'loading' | 'error'

/**
 * useNocTrans 的入参。
 */
export type NocTransIn = {
  /**
   * 这一岗的 NOC 码。
   */
  noc: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * useNocTrans 交回的面板。
 */
export type NocTransPanel = {
  /**
   * 对照开着没有。
   */
  showTrans: boolean

  /**
   * 状态档。
   */
  status: TransStatus

  /**
   * 拿到的译文;null = 还没翻。
   */
  trans: NocTrans | null

  /**
   * 开合(第一次点才调翻译,之后前后端都不再跑)。
   */
  onToggle: () => void
}

/**
 * CategoryPanel 的 props。
 */
export type CategoryPanelIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * NOC 官方职业描述。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 点进来的那一格(该行高亮)。
   */
  srcField: string
}

/**
 * CategoryActs 的 props。
 */
export type CategoryActsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 界面语言(英文界面不出中文对照钮)。
   */
  lang: AdvisorLang

  /**
   * 中文对照面板。
   */
  trans: NocTransPanel

  /**
   * AI 速读面板。
   */
  ai: AiReadPanel
}

/**
 * 身份卡的一行(点击字段=该行高亮;NOC 与职业名同属 'noc' 字段,点 NOC 两行齐亮)。
 */
export type IdRowFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 这一行属于哪个字段。
   */
  field: string

  /**
   * 标签。
   */
  label: string

  /**
   * 值;空串 = 这一行不出。
   */
  value: string
}

/**
 * CategoryIdCard 的 props。
 */
export type CategoryIdCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 身份行。
   */
  rows: IdRowFact[]

  /**
   * 点进来的那一格。
   */
  srcField: string
}

/**
 * NocList 的 props(官方主要职责 / 任职要求,逐条一行)。
 */
export type NocListIn = {
  /**
   * 卡标题。
   */
  head: string

  /**
   * 抓取日期灰注;空串 = 不出(#191:全角括号退役 → 空格灰注)。
   */
  fetched: string

  /**
   * 英文原文逐条。
   */
  items: string[]

  /**
   * 译文逐条(与原文按行号对位);空数组 = 不出对照。
   */
  zhItems: string[]
}

/**
 * 地点面板的层级:入口语义=内容(Frank「点省看省,点市看市」+「点区看区」)。
 */
export type LocationLevel = 'province' | 'city' | 'district'

/**
 * 移民难度卡的一个因子(`/api/jobs/province` 的 difficulty.factors 逐项)。
 * 只声明本域真读的那几格 —— 2026-08-27 替掉原先的 `any[]`,
 * 每个因子只带自己那组数,取值前先按 key 挑出对应的那一条(diffFactorOf)。
 */
export type DiffFactor = {
  /**
   * 因子标识:comp(竞争比)/ quotaTrend(配额同比)/ activity(近 180 天邀请)/ scoreLevel(分数档)。
   */
  key: string

  /**
   * 因子主数值:各因子按自己的口径(竞争比、同比小数、邀请人数、分数档位)。
   */
  value: number

  /**
   * 竞争基数(comp 因子的分子:在池的人数)。
   */
  pool: number

  /**
   * 当年配额(comp 因子的分母)。
   */
  quota: number

  /**
   * 配额所属年份(comp 因子)。
   */
  quotaYear: number

  /**
   * 竞争基数的统计截止(comp 因子;官方没给这一格就缺席)。
   */
  asOf?: string

  /**
   * 近 180 天邀请人数(activity 因子)。
   */
  invitations: number

  /**
   * 最近一次抽选的分数线(scoreLevel 因子)。
   */
  latestScore: number

  /**
   * 分数线所属的量表名(scoreLevel 因子,如 SIRS/EOI)。
   */
  scale: string
}

/**
 * 省级难度(归一前:接口没算出来时两格都可能不在)。
 */
export type DiffJson = {
  /**
   * 难度档:easy / mid / tight。
   */
  tier?: string

  /**
   * 逐因子。
   */
  factors?: DiffFactor[]
}

/**
 * 省级面板的取数结果。
 */
export type ProvFact = {
  /**
   * 体量事实;null = 接口没给。
   */
  info: AdvisorProvInfo | null

  /**
   * 移民难度;null = 接口没给。
   */
  difficulty: DiffJson | null
}

/**
 * 市/区体量里的大类分布一项。
 */
export type TopBroadFact = {
  /**
   * 大类值。
   */
  broad: string

  /**
   * 岗数。
   */
  n: number
}

/**
 * 区级榜上的雇主一项。
 */
export type TopEmployerFact = {
  /**
   * 雇主名。
   */
  name: string

  /**
   * 公司页 slug;空串 = 没有页面(不做死链)。
   */
  slug: string

  /**
   * 岗数。
   */
  n: number
}

/**
 * 指定学习机构(DLI)一项。
 */
export type DliSchoolFact = {
  /**
   * 校名。
   */
  name: string

  /**
   * 是不是公立(公立与私立在学签/毕业工签上的待遇不同,所以标出来)。
   */
  isPublic: boolean
}

/**
 * 市级指定学习机构一块。
 */
export type DliFact = {
  /**
   * 一共多少所。
   */
  count: number

  /**
   * 列出来的前几所。
   */
  top: DliSchoolFact[]
}

/**
 * 区级体量(比市级多一张雇主榜)。
 */
export type DistrictStatsFact = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 天新增。
   */
  new7d: number

  /**
   * 年薪中位;null = 样本不够,不猜。
   */
  medSalary: number | null

  /**
   * 大类分布。
   */
  topBroads: TopBroadFact[]

  /**
   * 区内在招最多的雇主。
   */
  topEmployers: TopEmployerFact[]
}

/**
 * 市级面板的取数结果(`/api/jobs/city` 现算,本站口径)。
 */
export type CityFact = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 天新增。
   */
  new7d: number

  /**
   * 年薪中位;null = 样本不够,不猜。
   */
  medSalary: number | null

  /**
   * 大类分布。
   */
  topBroads: TopBroadFact[]

  /**
   * 指定学习机构。
   */
  dli: DliFact

  /**
   * 区级体量;null = 没点区进来,或这一岗没有区值。
   */
  district: DistrictStatsFact | null
}

/**
 * useLocationData 的入参。
 */
export type LocationDataIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 市名(自 parseLoc 洗出来的那一格)。
   */
  city: string

  /**
   * 区名;空串 = 这一岗没有区值。
   */
  district: string

  /**
   * 看的是哪一级。
   */
  level: LocationLevel
}

/**
 * useLocationData 交回的面板。
 */
export type LocationDataPanel = {
  /**
   * 省级取数;null = 不是省级或还没回来。
   */
  prov: ProvFact | null

  /**
   * 市/区级取数;null = 省级或还没回来。
   */
  cityInfo: CityFact | null
}

/**
 * LocationPanel 的 props。
 */
export type LocationPanelIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * 点进来的那一格。
   */
  srcField: string

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws

  /**
   * 官方新闻。
   */
  news: AdvisorNewsList

  /**
   * AIP 指定雇主名录(市级卡按 province + location 客户端筛,口径对齐后端)。
   */
  desigEmp: AdvisorDesigEmps
}

/**
 * LocationActs 的 props。
 */
export type LocationActsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 省码(拼「打开完整页」的地址;空串 = 整条钮行不出)。
   */
  province: string

  /**
   * 中文对照开着没有。
   */
  showZh: boolean

  /**
   * 中文对照开合。
   */
  onToggleZh: () => void

  /**
   * AI 解读面板。
   */
  ai: AiReadPanel

  /**
   * 事实块回来了没有(没回来不给点 AI —— 它解读的就是这些数)。
   */
  factsReady: boolean
}

/**
 * 地点卡的一行(有值行的值文字=地图链接,与表格格同一规则)。
 */
export type LocRowFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 这一行属于哪个字段。
   */
  field: string

  /**
   * 标签。
   */
  label: string

  /**
   * 值;空串 = 这一行不出。
   */
  value: string

  /**
   * 值文字要不要做成地图链接(国家那行不做)。
   */
  map: boolean
}

/**
 * LocationCard 的 props。
 */
export type LocationCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 这一岗(拼地图查询词要整行)。
   */
  job: AdvisorJob

  /**
   * 点进来的那一格。
   */
  srcField: string
}

/**
 * 难度卡的一格(三列:标签 | 值 | 注)。
 */
export type DiffCellFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 标签。
   */
  label: string

  /**
   * 值。
   */
  value: string

  /**
   * 口径注;空串 = 这一格没注。
   */
  note: string
}

/**
 * DifficultyCard 的 props。
 */
export type DifficultyCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 难度档。
   */
  tier: string

  /**
   * 三列格(行构造在 functions 的 diffCellsOf 里做完)。
   */
  cells: DiffCellFact[]
}

/**
 * 体量卡的一行(三列:标签 | 数值 | 年份注;Frank 走查#6 改三列对齐)。
 */
export type VolRowFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 人话标签。
   */
  label: string

  /**
   * 标签后的代码灰注(Frank「TFWP/IMP 用户都不知道是什么」);空串 = 不出。
   */
  code: string

  /**
   * 数值。
   */
  value: string

  /**
   * 年份注。
   */
  note: string
}

/**
 * VolumeCard 的 props。
 */
export type VolumeCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 体量行。
   */
  rows: VolRowFact[]

  /**
   * 是不是魁北克(QC 独立体系说明是实义,保留;非 QC 的来源注 Frank 走查#4 已删)。
   */
  isQc: boolean
}

/**
 * AreaStatsCard 的 props(市级与区级同一张卡,只是标题与数据不同)。
 */
export type AreaStatsCardIn = {
  /**
   * 卡标题。
   */
  head: string

  /**
   * 标题后的灰注(市名或区名)。
   */
  tag: string

  /**
   * 体量行。
   */
  rows: KvFact[]
}

/**
 * DliCard 的 props。
 */
export type DliCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 指定学习机构。
   */
  dli: DliFact
}

/**
 * AipEmployersCard 的 props。
 */
export type AipEmployersCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 本市的指定雇主(Frank 走查#7:直接内联列出,不再「雇主名录 →」点过去)。
   */
  list: AdvisorDesigEmps
}

/**
 * DistrictEmployers 的 props。
 */
export type DistrictEmployersIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 区内在招最多的雇主。
   */
  employers: TopEmployerFact[]
}

/**
 * 取消标记:取数发出后组件可能已经拆卸,落格前先看它一眼。
 */
export type DeadFlag = {
  /**
   * 拆卸了没有。
   */
  dead: boolean
}

/**
 * effect 里调用的取数函数(带取消标记)。
 */
export type LoadFn = (flag: DeadFlag) => void

/**
 * 指针事件手柄(拖动起手 / 拉伸起手都是它)。
 */
export type PointerHandlerFn = (e: React.PointerEvent) => void

/**
 * 浮层的位置(左上角相对视口的像素)。
 */
export type PanelPos = {
  /**
   * 左。
   */
  x: number

  /**
   * 上。
   */
  y: number
}

/**
 * 浮层的尺寸。
 */
export type PanelSize = {
  /**
   * 宽。
   */
  w: number

  /**
   * 高。
   */
  h: number
}

/**
 * 存在 localStorage 里的浮层记忆(位置不记 —— 每次打开居中,免得窗口缩小后跑出屏外)。
 */
export type PrefFact = {
  /**
   * 上次退出时是不是全屏态。
   */
  full: boolean

  /**
   * 上次的宽;null = 没记过。
   */
  w: number | null

  /**
   * 上次的高;null = 没记过。
   */
  h: number | null
}

/**
 * savePref 的入参。
 */
export type SavePrefIn = {
  /**
   * 记忆键。
   */
  key: string

  /**
   * 这次要改的那几格(与已存的合并后写回;null 的格不动)。
   */
  patch: PrefPatch
}

/**
 * centerPosOf 的入参。
 */
export type CenterPosIn = {
  /**
   * 浮层宽。
   */
  w: number

  /**
   * 浮层高。
   */
  h: number
}

/**
 * makeDragStart 的入参。
 */
export type DragStartIn = {
  /**
   * 全屏态(全屏时不许拖)。
   */
  full: boolean

  /**
   * 当前位置。
   */
  pos: PanelPos

  /**
   * 位置落格。
   */
  setPos: (p: PanelPos) => void
}

/**
 * makeResizeStart 的入参。
 */
export type ResizeStartIn = {
  /**
   * 全屏态(全屏时不许拉)。
   */
  full: boolean

  /**
   * 记忆键(松手时把尺寸写回去)。
   */
  prefKey: string

  /**
   * 当前尺寸。
   */
  size: PanelSize

  /**
   * 当前位置。
   */
  pos: PanelPos

  /**
   * 尺寸镜像(松手那一刻要拿到最后一帧的尺寸,state 在闭包里是旧的)。
   */
  sizeRef: SizeRef

  /**
   * 尺寸落格。
   */
  setSize: (s: PanelSize) => void

  /**
   * 位置落格(西/北向拉伸要同时挪左上角)。
   */
  setPos: (p: PanelPos) => void

  /**
   * 拉哪个方向。
   */
  dir: string
}

/**
 * resizeNextOf 的入参:一帧拉伸的算式。
 */
export type ResizeNextIn = {
  /**
   * 拉哪个方向。
   */
  dir: string

  /**
   * 横向位移。
   */
  dx: number

  /**
   * 纵向位移。
   */
  dy: number

  /**
   * 起手时的尺寸。
   */
  size: PanelSize

  /**
   * 起手时的位置。
   */
  pos: PanelPos
}

/**
 * resizeNextOf 的出参:这一帧的尺寸与位置。
 */
export type ResizeNextOut = {
  /**
   * 这一帧的尺寸。
   */
  size: PanelSize

  /**
   * 这一帧的位置。
   */
  pos: PanelPos
}

/**
 * useFloatPanel 的入参。
 */
export type FloatPanelHookIn = {
  /**
   * 记忆键(两个框各记各的:常用尺寸不同)。
   */
  prefKey: string

  /**
   * 默认宽。
   */
  defW: number

  /**
   * 默认高。
   */
  defH: number
}

/**
 * useFloatPanel 交回的浮层机器面板。
 */
export type FloatPanelOut = {
  /**
   * 窄屏(E8-03:强制全屏,禁拖拽/拉伸/全屏切换钮)。
   */
  narrow: boolean

  /**
   * 全屏态(记忆里的全屏 或 窄屏)。
   */
  full: boolean

  /**
   * 全屏/还原切换。
   */
  toggleFull: () => void

  /**
   * 浮层的运行时几何(全屏时是空对象 —— 那一档的样式全在类里)。
   */
  panelStyle: React.CSSProperties

  /**
   * 标题栏按下 = 拖动起手。
   */
  onHeadDown: PointerHandlerFn

  /**
   * 某一向手柄按下 = 拉伸起手。
   */
  onEdgeDown: (dir: string) => PointerHandlerFn
}

/**
 * ResizeHandles 的 props。
 */
export type ResizeHandlesIn = {
  /**
   * 按方向要手柄。
   */
  onEdgeDown: (dir: string) => PointerHandlerFn
}

/**
 * FloatPanel 的 props。
 */
export type FloatPanelIn = {
  /**
   * 浮层机器。
   */
  panel: FloatPanelOut

  /**
   * 页眉左块(灰色小标 + 大标题 + 副标)。
   */
  head: React.ReactNode

  /**
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 取词函数(全屏钮的两态提示)。
   */
  t: AdvisorTFn

  /**
   * 页眉紧凑档(职位描述弹框的页眉比顾问弹框矮 2px)。
   */
  tight: boolean

  /**
   * 正文走 JD 档(整栏读正文:字号大一档、底衬归零让投递栏贴底)。
   */
  jdBody: boolean

  /**
   * 窗口钮排要不要拦下拖动起手。⚠️ 两个弹框在这里**本来就不一致**:
   * 职位描述弹框拦(点全屏钮不会顺带拖走整框),顾问弹框不拦。
   * 换装批逐字保留这个差异,不顺手统一 —— 见桶里的行为疑点台账。
   */
  actsStopDrag: boolean

  /**
   * 正文。
   */
  children: React.ReactNode
}

/**
 * AdvisorHead 的 props(顾问弹框的页眉左块)。
 */
export type AdvisorHeadBlockIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 铺的是哪一组(灰色小标写它的人话名)。
   */
  group: string

  /**
   * 大标题。
   */
  title: string

  /**
   * 标题下的界面语译名;空串 = 不出(与英文标题相同也算不出)。
   */
  sub: string

  /**
   * 剩余免费次数;null = 还没拿到(拿到才出灰注)。
   */
  freeLeft: number | null
}

/**
 * ActHead 的 props(职位描述弹框的页眉左块)。
 */
export type ActHeadIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 岗位名。
   */
  title: string

  /**
   * 岗位名下的 NOC 官方职业名译名;空串 = 不出(#199 Frank「chiropractor 怎么没有翻译呢」)。
   */
  sub: string

  /**
   * 剩余免费次数;null = 还没拿到(第 5 轮 #16 额度可见化,JobBody 回传)。
   */
  freeLeft: number | null
}

/**
 * FieldActs 的 props(字段事实弹框顶部的三钮栏)。
 */
export type FieldActsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 界面语言(英文界面不出中文对照钮)。
   */
  lang: AdvisorLang

  /**
   * 中文对照开着没有。
   */
  showZh: boolean

  /**
   * 中文对照开合。
   */
  onToggleZh: () => void
}

/**
 * AdvisorAiCard 的 props(移民组的顾问长文卡)。
 */
export type AdvisorAiCardIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 登录态。
   */
  loggedIn: boolean

  /**
   * 状态档。
   */
  status: AdvisorStatus

  /**
   * 正文(失败态里装的是失败话术)。
   */
  text: string

  /**
   * 重试生成(2026-07-25 用户:解析失败要能重试)。
   */
  onRetry: () => void
}

/**
 * AdvisorGroupBody 的 props(按分组分叉的正文)。
 */
export type AdvisorGroupBodyIn = {
  /**
   * 铺的是哪一组。
   */
  group: string

  /**
   * 点进来的那一格。
   */
  field: string

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * 同公司在榜岗(公司组用;E10-01 P3 现拉,不再靠父级全量列表)。
   */
  companyJobs: AdvisorJob[]

  /**
   * 点一行在榜岗(公司组的在招职位列表要它);可省 —— 调用方没给就不给点。
   */
  onOpenJob?: OpenJobFn

  /**
   * 取数包。
   */
  f: AdvisorFacts
}

/**
 * useAdvisorModal 的入参。
 */
export type AdvisorModalHookIn = {
  /**
   * 铺的是哪一组(埋点记它;AI 长文只归移民组)。
   */
  group: string

  /**
   * 点进来的那一格(埋点参数)。
   */
  field: string

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * useAdvisorModal 交回的面板。
 */
export type AdvisorModalPanel = {
  /**
   * 顾问长文正文(流式期间是打字机吐到一半的那截)。
   */
  text: string

  /**
   * 状态档。
   */
  status: AdvisorStatus

  /**
   * 剩余免费次数;null = 还没拿到。
   */
  freeLeft: number | null

  /**
   * 这一组要不要渲 AI 长文卡(移民组 且 总开关开着)。
   */
  aiOn: boolean

  /**
   * 清单译名开着没有。
   */
  showZh: boolean

  /**
   * 清单译名开合(顺带记一次埋点)。
   */
  onToggleZh: () => void

  /**
   * 重试生成。
   */
  onRetry: () => void

  /**
   * 同公司在榜岗。
   */
  companyJobs: AdvisorJob[]
}

/**
 * AdvisorModal 的 props(门上冻结的契约,消费者六处按它传)。
 */
export type AdvisorModalIn = {
  /**
   * 铺哪一组(E8-10:入参从 24 值的 field 改为 3 值的 group)。
   */
  group: AdvisorGroup

  /**
   * 点进来的那一格(只用于「打开时锚到哪一节」与该行高亮,不再参与内容分支)。
   */
  field: AdvisorColKey

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 调用方指定的标题;缺席 = 用岗位名/公司名。
   */
  title?: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * 省提名职业清单。
   */
  pnpOcc: AdvisorPnpOccs

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws

  /**
   * 官方新闻。
   */
  news: AdvisorNewsList

  /**
   * 联邦快速通道类别。
   */
  eeOcc: AdvisorEeOccs

  /**
   * AIP 指定雇主名录。
   */
  desigEmp: AdvisorDesigEmps

  /**
   * NOC 官方职业描述。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 字段出处注册表(透传格:出处能力 E4-04 已后置到 /sources 解释页,本框不渲)。
   */
  fieldSources: AdvisorFieldSources

  /**
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 点一行在榜岗(公司组的在招职位列表要它);可省。
   */
  onOpenJob?: OpenJobFn
}

/**
 * ActModal 的 props(门上冻结的契约)。
 */
export type ActModalIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态。
   */
  plan: AdvisorPlan

  /**
   * NOC 官方职业描述(标题下挂译名要它)。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 关闭回调。
   */
  onClose: () => void
}

/**
 * 带语言标的取词函数(lib/noc 的 catName 与 lib/jobs 的 streamDisplay 要读 `t.lang`
 * 取分类名的显示列)。本域自己声明这一面 —— 不从 i18n 取形状,`makeT` 交回来的那只
 * 函数身上本来就有这一格。
 */
export type AdvisorTransFn = AdvisorTFn & {
  /**
   * 当前界面语言;缺席 = 按中文取列。
   */
  lang?: AdvisorLang
}

/**
 * NOC 官方职业描述的一行(外域形状,见文件头)。
 */
export type AdvisorNocDesc = NocDesc

/**
 * 只要一岗的函数入参。
 */
export type AdvisorJobIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob
}

/**
 * cardHeadOf 的入参。
 */
export type CardHeadIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 这张卡装的是哪个字段。
   */
  field: string
}

/**
 * modalTitleOf 的入参。
 */
export type ModalTitleIn = {
  /**
   * 铺的是哪一组(公司组的大标题是公司名,其余是岗位名)。
   */
  group: string

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 调用方指定的标题;缺席 = 不参与。
   */
  title?: string
}

/**
 * firstTextOf 的入参。
 */
export type FirstTextIn = {
  /**
   * 候选文本,按优先级排;取第一个非空的。
   */
  list: string[]
}

/**
 * nocOf 的入参。
 */
export type NocFindIn = {
  /**
   * NOC 官方职业描述表。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 要找的五位码。
   */
  noc: string
}

/**
 * nocZhOf 的入参。
 */
export type NocZhIn = {
  /**
   * NOC 官方职业描述表。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 这一岗的五位码。
   */
  noc: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 岗位名(与译名相同就不重复挂一遍)。
   */
  title: string
}

/**
 * originTextOf 的入参。
 */
export type OriginTextIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 数据层写的渠道值。
   */
  origin: string
}

/**
 * mapQueryOf 的入参。
 */
export type MapQueryIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 看到第几级(点省=省的地图,不带街址)。
   */
  depth: number
}

/**
 * provStreamsOf 的入参。
 */
export type ProvStreamsIn = {
  /**
   * 点开的是哪一格(只有点「省」才算)。
   */
  field: string

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 省提名职业清单。
   */
  pnpOcc: AdvisorPnpOccs
}

/**
 * aipMatchesOf 的入参。
 */
export type AipMatchIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * AIP 指定雇主名录。
   */
  desigEmp: AdvisorDesigEmps
}

/**
 * 省里点名不受理的一个职业(只声明本域真读的两格)。
 */
export type AipOccFact = {
  /**
   * 五位码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string
}

/**
 * aipBlockedNameOf 的入参。
 */
export type AipBlockedNameIn = {
  /**
   * 省里点名的职业清单。
   */
  occupations: AipOccFact[]

  /**
   * 这一岗的五位码。
   */
  noc: string
}

/**
 * LMIA 前瞻可行性的判词(E8-04:把「历史记录」升级为「今天这条路通不通」)。
 */
export type LmiaFeasibleFact = {
  /**
   * 判词的色档类名。
   */
  cls: string

  /**
   * 判词。
   */
  text: string
}

/**
 * lmiaFeasibleOf 的入参。
 */
export type LmiaFeasibleIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 这一岗。
   */
  job: AdvisorJob
}

/**
 * ESDC 三档工资表的一行(低/中/高 × 时薪 + 折算年薪)。
 */
export type EsdcRowFact = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 档名。
   */
  label: string

  /**
   * 时薪;缺这一格给「—」。
   */
  hr: string

  /**
   * 折算年薪(数据层 04d 折算,前端只显示不换算);缺这一格给「—」。
   */
  yr: string
}

/**
 * 收取词函数与一岗的函数入参(判词、行构造那类)。
 */
export type TFnJobIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 这一岗。
   */
  job: AdvisorJob
}

/**
 * catTextOf 的入参。
 */
export type CatTextIn = {
  /**
   * 取词函数(要读 `t.lang` 取显示列)。
   */
  t: AdvisorTransFn

  /**
   * 数据层写的分类值。
   */
  value: string
}

/**
 * 收带语言标的取词函数与一岗的行构造入参。
 */
export type TransJobIn = {
  /**
   * 取词函数(要读 `t.lang`)。
   */
  t: AdvisorTransFn

  /**
   * 这一岗。
   */
  job: AdvisorJob
}

/**
 * daysUpOf 的入参。
 */
export type DaysUpIn = {
  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 弹框打开的时刻(挂帖时长按它算 —— 弹框只在客户端开,无水合差异)。
   */
  openedAt: number
}

/**
 * idRowsOf 的入参。
 */
export type IdRowsIn = {
  /**
   * 取词函数(要读 `t.lang`)。
   */
  t: AdvisorTransFn

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 这一岗的 NOC 官方描述;null = 表里没有这一码。
   */
  noc: AdvisorNocDesc | null
}

/**
 * diffFactorOf 的入参。
 */
export type DiffFactorIn = {
  /**
   * 逐因子;缺席 = 接口没给。
   */
  factors?: DiffFactor[]

  /**
   * 要哪一个。
   */
  key: string
}

/**
 * diffCellsOf 的入参。
 */
export type DiffCellsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 省码。
   */
  province: string

  /**
   * 逐因子;缺席 = 接口没给。
   */
  factors?: DiffFactor[]

  /**
   * 各省抽选记录(判「改制后抽没抽过」要它)。
   */
  pnpDraws: AdvisorPnpDraws
}

/**
 * actNoteKeyOf 的入参。
 */
export type ActNoteIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws
}

/**
 * volRowsOf 的入参。
 */
export type VolRowsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 省级体量事实;null = 还没回来。
   */
  info: AdvisorProvInfo | null

  /**
   * 是不是魁北克(QC 不出配额与 PNP 落地两行:它走自己的体系)。
   */
  isQc: boolean
}

/**
 * 市/区体量的共有四格(市级与区级同一张卡)。
 */
export type AreaStatsFact = {
  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 天新增。
   */
  new7d: number

  /**
   * 年薪中位;null = 样本不够,不猜。
   */
  medSalary: number | null

  /**
   * 大类分布。
   */
  topBroads: TopBroadFact[]
}

/**
 * areaRowsOf 的入参。
 */
export type AreaRowsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 体量四格。
   */
  stats: AreaStatsFact
}

/**
 * aipListOf 的入参。
 */
export type AipListIn = {
  /**
   * AIP 指定雇主名录。
   */
  desigEmp: AdvisorDesigEmps

  /**
   * 这一岗(按 province + location 含 city 筛,口径对齐后端)。
   */
  job: AdvisorJob
}

/**
 * levelOf 的入参。
 */
export type LevelIn = {
  /**
   * 点进来的那一格。
   */
  srcField: string

  /**
   * 这一岗的区名;空串 = 区列点开但该岗无区值 → 退回市级,不出空面板。
   */
  district: string
}

/**
 * aiIdOf 的入参。
 */
export type AiIdIn = {
  /**
   * 看的是哪一级。
   */
  level: LocationLevel

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 市名。
   */
  city: string

  /**
   * 区名。
   */
  district: string
}

/**
 * zhItemsOf 的入参。
 */
export type ZhItemsIn = {
  /**
   * 对照开着没有。
   */
  show: boolean

  /**
   * 译文全文;空串 = 还没翻。
   */
  text: string
}

/**
 * 只按开合分档的类名预算入参。
 */
export type OnClsIn = {
  /**
   * 开着没有。
   */
  on: boolean
}

/**
 * headClsOf 的入参。
 */
export type HeadClsIn = {
  /**
   * 全屏态(全屏时标题栏不给拖动光标)。
   */
  full: boolean

  /**
   * 紧凑档。
   */
  tight: boolean
}

/**
 * kvKeyClsOf 的入参。
 */
export type NarrowClsIn = {
  /**
   * 标签列窄档。
   */
  narrow: boolean
}

/**
 * excerptHeadClsOf 的入参。
 */
export type GapClsIn = {
  /**
   * 上面有没有别的行(有才留上距)。
   */
  gap: boolean
}

/**
 * panelStyleOf 的入参。
 */
export type PanelStyleIn = {
  /**
   * 全屏态(全屏那一档的样式全在类里,返回空对象)。
   */
  full: boolean

  /**
   * 当前位置。
   */
  pos: PanelPos

  /**
   * 当前尺寸。
   */
  size: PanelSize
}

/**
 * 装字符串的镜像格(每帧要读到最新值,state 在闭包里是旧的)。
 */
export type TextRef = {
  /**
   * 当前值。
   */
  current: string
}

/**
 * 装尺寸的镜像格。
 */
export type SizeRef = {
  /**
   * 当前值。
   */
  current: PanelSize
}

/**
 * 装开关的镜像格。
 */
export type FlagRef = {
  /**
   * 当前值。
   */
  current: boolean
}

/**
 * makeLoadProv 的入参。
 */
export type LoadProvIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 落格。
   */
  setProv: (p: ProvFact) => void
}

/**
 * makeLoadCity 的入参。
 */
export type LoadCityIn = {
  /**
   * 市名。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 区名;空串 = 不带这个参数。
   */
  district: string

  /**
   * 看的是哪一级(区级才把区带上)。
   */
  level: LocationLevel

  /**
   * 落格。
   */
  setCityInfo: (c: CityFact) => void
}

/**
 * makeLoadCompanyJobs 的入参。
 */
export type LoadCompanyJobsIn = {
  /**
   * 公司名。
   */
  company: string

  /**
   * 落格。
   */
  setJobs: (rows: AdvisorJob[]) => void
}

/**
 * makeLoadJobText 的入参。
 */
export type LoadJobTextIn = {
  /**
   * 原帖链接。
   */
  applyUrl: string

  /**
   * 中断信号。
   */
  signal: AbortSignal

  /**
   * 正文落格。
   */
  setText: (s: string) => void

  /**
   * 限流落格。
   */
  setLimited: (v: boolean) => void
}

/**
 * makeLoadNocTrans 的入参。
 */
export type LoadNocTransIn = {
  /**
   * 这一岗的五位码。
   */
  noc: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 译文落格。
   */
  setTrans: (v: NocTrans) => void

  /**
   * 对照开合落格。
   */
  setShow: (v: boolean) => void

  /**
   * 状态落格。
   */
  setStatus: (s: TransStatus) => void
}

/**
 * makeRunLongAdvisor 的入参。
 */
export type RunLongIn = {
  /**
   * 铺的是哪一组(后端按分组取提示词)。
   */
  group: string

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 中断信号。
   */
  signal: AbortSignal

  /**
   * 取数失败时写进正文的话术(取词函数会每渲一次换一只新函数,进不了 effect 依赖 ——
   * 所以收的是已经取好的**词**,不是取词函数)。
   */
  unavailText: string

  /**
   * 掉线时写进正文的话术。
   */
  offlineText: string

  /**
   * 剩余次数落格。
   */
  setFreeLeft: (n: number) => void

  /**
   * 状态落格。
   */
  setStatus: (s: AdvisorStatus) => void

  /**
   * 正文落格(失败态直接写话术,不走打字机)。
   */
  setText: (s: string) => void

  /**
   * 打字机的待吐队列(网络块先进这里,不直接上屏)。
   */
  pending: TextRef

  /**
   * 流读完了的信号(吐完 pending 后打字机自己切 done)。
   */
  done: FlagRef
}

/**
 * tickTypewriter 的入参。
 */
export type TypewriterIn = {
  /**
   * 待吐队列。
   */
  pending: TextRef

  /**
   * 流读完了的信号。
   */
  done: FlagRef

  /**
   * 已吐正文的镜像(完成时和 pending 拼回完整回复摘建议)。
   */
  mirror: TextRef

  /**
   * 正文落格。
   */
  setText: (s: string) => void

  /**
   * 状态落格。
   */
  setStatus: (s: AdvisorStatus) => void

  /**
   * 建议问题落格。
   */
  setSug: (s: string) => void

  /**
   * 雇主名(摘建议时换成指代词,见 extractSug)。
   */
  company: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * AIP 指定雇主名录的一行(外域形状,见文件头)。
 */
export type AdvisorDesigEmp = DesigEmp

/**
 * aipMatchTextOf 的入参。
 */
export type AipMatchTextIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 名录里的一行。
   */
  emp: AdvisorDesigEmp
}

/**
 * 两年的提名配额(只声明本域真读的两格)。
 */
export type AllocFact = {
  /**
   * 2026 配额;null = 未公布。
   */
  y2026: number | null

  /**
   * 2025 配额;null = 未公布。
   */
  y2025: number | null
}

/**
 * allocRowOf 的入参。
 */
export type AllocRowIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 两年的配额。
   */
  alloc: AllocFact
}

/**
 * panelBodyClsOf 的入参。
 */
export type JdBodyClsIn = {
  /**
   * 走不走 JD 档。
   */
  jd: boolean
}

/**
 * 浮层记忆存进 localStorage 的原始形状(归一前:键可能不在,存的也可能不是这个形状)。
 */
export type PrefJson = {
  /**
   * 上次是不是全屏态。
   */
  full?: boolean

  /**
   * 上次的宽。
   */
  w?: number

  /**
   * 上次的高。
   */
  h?: number
}

/**
 * 写记忆时的补丁:null = 这一格不动(只改这次真动过的那几格)。
 */
export type PrefPatch = {
  /**
   * 全屏态;null = 不动。
   */
  full: boolean | null

  /**
   * 宽;null = 不动。
   */
  w: number | null

  /**
   * 高;null = 不动。
   */
  h: number | null
}

/**
 * 省级取数接口回来的原始形状(归一前;整体可能是 null —— 非 2xx 时不解析)。
 */
export type ProvJson = {
  /**
   * 成不成。
   */
  ok?: boolean

  /**
   * 体量事实。
   */
  info: AdvisorProvInfo | null

  /**
   * 移民难度。
   */
  difficulty: DiffJson | null
} | null

/**
 * 市/区级取数接口回来的原始形状(归一前;整体可能是 null)。
 */
export type CityJson = {
  /**
   * 成不成。
   */
  ok?: boolean

  /**
   * 在招岗数。
   */
  openJobs: number

  /**
   * 近 7 天新增。
   */
  new7d: number

  /**
   * 年薪中位。
   */
  medSalary: number | null

  /**
   * 大类分布。
   */
  topBroads: TopBroadFact[]

  /**
   * 指定学习机构。
   */
  dli: DliFact

  /**
   * 区级体量。
   */
  district: DistrictStatsFact | null
} | null

/**
 * 同公司在榜岗接口回来的原始形状(归一前;整体可能是 null)。
 */
export type CompanyJobsJson = {
  /**
   * 在榜岗;缺席 = 一个都没有。
   */
  rows?: AdvisorJob[]
} | null

/**
 * useAdvisorLong 的入参。
 */
export type AdvisorLongIn = {
  /**
   * 铺的是哪一组(AI 长文只归移民组:分步方案。公司弹框撤 AI 段 = #167⑨,
   * CompanyAiSection 结构化卡是唯一 AI 内容;分类弹框纯官方事实,零生成零额度 #176)。
   */
  group: string

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * useAdvisorLong 交回的面板。
 */
export type AdvisorLongPanel = {
  /**
   * 正文(流式期间是打字机吐到一半的那截)。
   */
  text: string

  /**
   * 状态档。
   */
  status: AdvisorStatus

  /**
   * 剩余免费次数;null = 还没拿到。
   */
  freeLeft: number | null

  /**
   * 这一组要不要渲 AI 长文卡(移民组 且 总开关开着)。
   */
  aiOn: boolean

  /**
   * 重试生成(2026-07-25 用户:解析失败要能重试)。
   */
  onRetry: () => void
}

/**
 * 直判药丸的色档(本域自抄一份三字面量 —— 与 pnp 域的 VerdictPill 同形)。
 */
export type AdvisorTone = 'ok' | 'warn' | 'fail' | 'na'

/**
 * 一枚直判药丸。
 */
export type AdvisorPillFact = {
  /**
   * 色档。
   */
  tone: AdvisorTone

  /**
   * 药丸里的话。
   */
  text: string
}

/**
 * aipPillOf 的入参。
 */
export type AipPillIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 三态直判(命中 / 在大西洋省但未命中 / 不适用)。
   */
  verdict: string

  /**
   * 省里点名不受理没有。
   */
  blocked: boolean
}

/**
 * pilotPillOf 的入参。
 */
export type PilotPillIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 在不在试点社区。
   */
  on: boolean
}

/**
 * transLabelOf 的入参。
 */
export type TransLabelIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 翻译状态档。
   */
  status: TransStatus

  /**
   * 对照开着没有。
   */
  show: boolean
}

/**
 * transPillClsOf 的入参。
 */
export type TransPillIn = {
  /**
   * 翻译状态档(在翻时钮压暗)。
   */
  status: TransStatus

  /**
   * 对照开着没有。
   */
  show: boolean
}

/**
 * zhLabelOf 的入参。
 */
export type ZhLabelIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 对照开着没有。
   */
  show: boolean
}

/**
 * fullTitleOf 的入参。
 */
export type FullTitleIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 全屏态。
   */
  full: boolean
}

/**
 * panelClsOf 的入参。
 */
export type PanelClsIn = {
  /**
   * 全屏态。
   */
  full: boolean
}

/**
 * makeActsDown 的入参。
 */
export type ActsDownIn = {
  /**
   * 要不要拦下拖动起手(见 FloatPanelIn 的 actsStopDrag:两个弹框在这里本来就不一致)。
   */
  stop: boolean
}

/**
 * makeToggle 的入参。
 */
export type ToggleIn = {
  /**
   * 当前开合。
   */
  on: boolean

  /**
   * 落格。
   */
  set: (v: boolean) => void
}

/**
 * locNoteOf 的入参。
 */
export type LocNoteIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 点开的是哪一格。
   */
  field: string

  /**
   * 这一岗。
   */
  job: AdvisorJob
}

/**
 * hasDrawsOf 的入参。
 */
export type HasDrawsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws

  /**
   * 是不是魁北克(QC 走自己的体系,不列 PNP 抽选)。
   */
  isQc: boolean
}

/**
 * hasNewsOf 的入参。
 */
export type HasNewsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 官方新闻。
   */
  news: AdvisorNewsList
}

/**
 * factsReadyOf 的入参。
 */
export type FactsReadyIn = {
  /**
   * 看的是哪一级。
   */
  level: LocationLevel

  /**
   * 省级取数。
   */
  prov: ProvFact | null

  /**
   * 市/区级取数。
   */
  cityInfo: CityFact | null
}

/**
 * planClbOf 的入参。
 */
export type PlanClbIn = {
  /**
   * 分层态(自报档案挂在它里面)。
   */
  plan: AdvisorPlan
}

/**
 * headSubOf 的入参。
 */
export type HeadSubIn = {
  /**
   * 铺的是哪一组(公司组不挂译名 —— 公司名没有译名)。
   */
  group: string

  /**
   * NOC 官方职业描述表。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 界面语言。
   */
  lang: AdvisorLang
}

/**
 * ProvinceCards 的 props。
 */
export type ProvinceCardsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 界面语言(抽选块与新闻块自己取词)。
   */
  lang: AdvisorLang

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 省级取数;null = 还没回来(几张卡都不出,不留孤儿标题)。
   */
  prov: ProvFact | null

  /**
   * 各省抽选记录。
   */
  pnpDraws: AdvisorPnpDraws

  /**
   * 官方新闻。
   */
  news: AdvisorNewsList
}

/**
 * CityCards 的 props。
 */
export type CityCardsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 市名(卡标题后的灰注)。
   */
  city: string

  /**
   * 市级取数;null = 还没回来。
   */
  cityInfo: CityFact | null

  /**
   * AIP 指定雇主名录。
   */
  desigEmp: AdvisorDesigEmps
}

/**
 * DistrictCards 的 props。
 */
export type DistrictCardsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 区名(卡标题后的灰注)。
   */
  district: string

  /**
   * 市级取数(区级体量挂在它里面);null = 还没回来。
   */
  cityInfo: CityFact | null
}

/**
 * useActModal 交回的面板。
 */
export type ActModalPanel = {
  /**
   * 剩余免费次数;null = 还没拿到(JobBody 回传)。
   */
  freeLeft: number | null

  /**
   * 剩余次数落格。
   */
  onFreeLeft: (n: number) => void
}
