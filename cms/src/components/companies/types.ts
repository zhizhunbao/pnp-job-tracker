/**
 * companies 域(公司详情页 + 公司弹框)的自足形状:公司档案与它的嵌套事实、
 * 各视图的 props 契约、派生函数与状态机器的入参。
 *
 * 2026-08-27 建域时,公司档案(CompanyDetail)与相似雇主(SimilarEmployer)还住在
 * lib/jobs 那边、本页只是原样透传,所以走了一行逐行特批的跨域 `import type`。
 * 2026-08-28 拆域批把公司本体(CompanyBody 一族)整体重写进本桶之后,那张牌撤了 ——
 * **形状的主人搬进来了**,读它每一格的代码都在本域,再从别的域取就是白背一条边。
 * 按宪法「types 自声明」逐格照抄本域真读的那些格(下游多一格不必跟着改,真读不到当场
 * tsc 红);页面门与弹框接口递进来的仍是 lib/jobs 那份,结构相同即兼容,接缝零断言。
 *
 * 唯一留下的特批是 `JobRow` / `Plan`:它们**不是本域的事实**,是弹框从职位板手里接过、
 * 原样喂给外域引擎(jobs/Jd 的 JdAdvisorSection、pnp 的 SponsorLeadCard、
 * 上层的 onOpenJob 回调)的整份行 —— 重抄一份当天就会脱节。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 原样透传给外域引擎的整份行,理由见文件头
import type { JobRow, Plan } from '@/lib/jobs'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄;译名跟语言走那一格要读它)。
 */
export type CompaniesLang = 'zh' | 'en' | 'ko'

/**
 * 无参无返的点击手柄(返回钮 / 折叠钮 / 展开钮的 onClick)。
 */
export type GoBackFn = () => void

/**
 * 职位板整行(外域形状,见文件头特批):弹框把它喂给 JD 顾问段与雇主线卡。
 */
export type CompanyJobFact = JobRow

/**
 * 付费态(外域形状,见文件头特批):AI 速读的额度闸按它走。
 */
export type CompanyPlan = Plan

/**
 * 「把这一行职位打开」的回调:弹框内点在招职位 = 叠开 JD 弹框;页面不传 = 纯链接。
 */
export type OpenJobFn = (job: CompanyJobFact) => void

/**
 * 按岗位号把已载入的整行喂回来(JD 弹框要整份 JobRow);没载入这一行时给 null。
 */
export type ResolveJobFn = (id: number) => CompanyJobFact | null

/**
 * 公司担保档·担保维的依据值。
 */
export type CoSponsorFact = {
  /**
   * 近两年获批总数。
   */
  total: number

  /**
   * 其中技能股;null = 列未回填(不是 0 —— 折 0 是替官方编数)。
   */
  skilled: number | null

  /**
   * 最近获批季度。
   */
  q: string

  /**
   * AIP(大西洋试点)指定雇主。
   */
  aip: boolean
}

/**
 * 公司担保档·担保维(档位 + 依据;数据层算好写库,前端只读)。
 */
export type CoSponsorDim = {
  /**
   * 该维档位。
   */
  g: number

  /**
   * 依据值;null = AIP 指定但无 LMIA 记录。
   */
  v: CoSponsorFact | null
}

/**
 * 公司担保档·活跃度维的依据值。
 */
export type CoActiveFact = {
  /**
   * 在招岗数。
   */
  open: number

  /**
   * 近 30 天新发。
   */
  new30: number
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
   * 依据值;null = 缺。
   */
  v: CoActiveFact | null
}

/**
 * 公司担保档·薪资维(v = 相对同职业中位的百分比,可正可负)。
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
 * 公司担保档·知名度维的依据值。
 */
export type CoFameFact = {
  /**
   * 维基条目;空串 = 无。
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
   * 依据值;null = 缺。
   */
  v: CoFameFact | null
}

/**
 * 公司担保档四维明细;整体 null = 无明细(雇主信号卡整块不渲)。
 */
export type CoGradeDetail = {
  /**
   * 担保记录维;null = 缺。
   */
  sponsor: CoSponsorDim | null

  /**
   * 活跃度维;null = 缺。
   */
  active: CoActiveDim | null

  /**
   * 薪资维;null = 缺。
   */
  salary: CoSalaryDim | null

  /**
   * 知名度维;null = 缺。
   */
  fame: CoFameDim | null
} | null

/**
 * 公司 LMIA 获批职业一行(#286;列没建/没灌时整块空数组,那一段不渲)。
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
   * 官方英文名;缺时渲裸码。
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
 * 公司名下在招的一行(本域只读这几格;下游多几格不必跟着改)。
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
   * NOC 官方英文名。
   */
  nocTitle: string

  /**
   * NOC 中文名。
   */
  nocTitleZh: string

  /**
   * NOC 韩文名。
   */
  nocTitleKo: string

  /**
   * 薪资展示文本。
   */
  salaryText: string
}

/**
 * 相似雇主一行(同省同行业)。
 */
export type SimilarEmployer = {
  /**
   * slug(公司详情页地址拼它)。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 担保档;null = 未评。
   */
  sponsorGrade: number | null

  /**
   * 在招数。
   */
  openCount: number
}

/**
 * 公司档案(E8-09;零新抓取:companies 行 + 该司在招岗聚合;全事实层免费)。
 * 详情页与弹框吃**同一份**,所以两边口径永远一致。
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
   * 官网来路('searched' = 是我们搜出来的,不是名录给的,要加一句小注)。
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
   * 维基条目(有 = 挂知名章,可点跳转)。
   */
  wikiUrl: string

  /**
   * 担保档 1-5;null = 未评。**本域一格都不读**(担保档在四维明细里),
   * 之所以还声明:查无公司那条路径由页面门**亲手构造**一份空档案交进来,
   * 而对象字面量是要过多余属性检查的 —— 少声明一格,那边当场 tsc 红。
   */
  sponsorGrade: number | null

  /**
   * 技能股获批数;null = 列未回填。同上,本域不读,为页面门的空档案字面量留格。
   */
  lmiaSkilled: number | null

  /**
   * 担保档四维明细;null = 无。
   */
  scoreDetail: CoGradeDetail

  /**
   * K 调查简介(五节标记格式;存量是散文)。
   */
  aiBrief: string

  /**
   * K 调查查到的官网。
   */
  aiWebsite: string

  /**
   * K 调查的来源网页(#191「看来源」折叠列它们)。
   */
  aiSources: string[]

  /**
   * K 调查日期。
   */
  aiFetched: string

  /**
   * 名录厚简介(够长才算有,见 DESC_MIN_LEN)。
   */
  description: string

  /**
   * 地址;空串 = 库里只有省级,没有街号那种精确地址。
   */
  address: string

  /**
   * 省码。
   */
  province: string

  /**
   * LMIA 获批岗位数;null = 无记录列。
   */
  lmiaPositions: number | null

  /**
   * LMIA 份数;null = 无。
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
   * 获批职业拆分(近两年;容缺自激活)。
   */
  lmiaNocs: LmiaNocRow[]

  /**
   * 在招总数。
   */
  openCount: number

  /**
   * 在招岗(载入上限 50)。
   */
  jobs: CompanyJobRow[]
}

/**
 * 一股 LMIA 担保记录的展示形态(股别串洗净后的样子)。
 */
export type CompanyStream = {
  /**
   * 股别显示名(认得出的走文案表,认不出的渲原名)。
   */
  label: string

  /**
   * 份数(原串里就是文本,带千分位逗号照原样显示)。
   */
  count: string

  /**
   * 技能类股(High Wage / GTS / PR;match.ts 口径,前端只展示不判定)。
   */
  skilled: boolean
}

/**
 * 懒查回来的 K 调查简介(公司弹框首开自动调查,命中缓存秒回)。
 */
export type CompanyBriefFact = {
  /**
   * 简介正文。
   */
  brief: string

  /**
   * 查到的官网。
   */
  website: string

  /**
   * 来源网页。
   */
  sources: string[]

  /**
   * 检索日期。
   */
  fetched: string
}

/**
 * 公司弹框一次取数的结果(与 /companies/[slug] 页面同一份数据)。
 */
export type CompanyPanelData = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]
}

/**
 * AI 检索声明行的位置档(三处同一套类,只有外边距按位置分三档)。
 */
export type CompanyAiNoteKind = 'brief' | 'lazy' | 'panel'

/**
 * CompaniesJsonLd(公司页结构化数据)的 props。
 */
export type CompaniesJsonLdIn = {
  /**
   * 已序列化好的 JSON-LD 串(拼装在 lib/jobs 的 companyJsonOf)。
   */
  json: string
}

/**
 * Company(公司详情页正文)的 props。
 */
export type CompanyIn = {
  /**
   * 公司档案(库里查好的整份)。
   */
  company: CompanyDetail

  /**
   * 同省同行业的相似雇主;可省 —— 查不到相似雇主的调用方不传这一项(体内默认空列)。
   */
  similar?: SimilarEmployer[]
}

/**
 * aliasOf 的入参:界面语言与两门译名。
 */
export type AliasOfIn = {
  /**
   * 当前界面语言。
   */
  lang: CompaniesLang

  /**
   * 中文译名;'' = 没收录。
   */
  aliasZh: string

  /**
   * 韩文译名;'' = 没收录。
   */
  aliasKo: string
}

/**
 * provFullOf 的入参:取词函数与省码。
 */
export type ProvFullOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码;'' = 库里没记这家公司的省(面包屑那一格就不出)。
   */
  code: string
}

/**
 * provHrefOf 的入参:省码。
 */
export type ProvHrefOfIn = {
  /**
   * 两位省码(拼进职位板筛选地址前先编码)。
   */
  code: string
}

/**
 * makeGoBack 的入参:无处可回时的落点。
 */
export type GoBackIn = {
  /**
   * 无历史可回时跳转的地址。
   */
  fallback: string
}

/**
 * CompanyBody(公司域唯一骨架)的 props。弹框与 /companies/[slug] 页面渲的是同一棵树。
 */
export type CompanyBodyIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 显示中文对照(#185:点了才在英文段下挂译文);可省 = 不显示。
   */
  showTrans?: boolean

  /**
   * 藏起「了解公司」章行;可省 = 出。弹框把它挂到按钮上面,所以身体里那份要藏。
   */
  hideTopInfo?: boolean

  /**
   * 点在招职位的去处;可省 = 纯链接跳详情页。
   */
  onOpenJob?: OpenJobFn

  /**
   * 把已载入的整行喂回来;可省 = 弹框外的调用方没有这份行。
   */
  resolveJob?: ResolveJobFn

  /**
   * 担保卡后面的插槽(#287 批D:公司弹框挂判定卡入口;页面无 job 语境不传)。
   */
  afterSponsor?: React.ReactNode
}

/**
 * CompanyTopInfo(了解公司章行)的 props。
 */
export type CompanyTopInfoIn = {
  /**
   * 公司档案(只读名字与维基条目两格)。
   */
  company: CompanyDetail

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CompanyBasicCard(基本信息卡)的 props。
 */
export type CompanyBasicCardIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 显示中文对照。
   */
  showTrans: boolean

  /**
   * 懒翻回来的译文;null = 还没翻/不用翻。
   */
  trans: string | null

  /**
   * 章行藏在身体外(弹框):此时政府章/知名章挂到卡标题旁。
   */
  hideTopInfo: boolean
}

/**
 * CompanyAiNote(AI 检索声明行)的 props。
 */
export type CompanyAiNoteIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 检索日期;'' = 不出日期。
   */
  fetched: string

  /**
   * 来源网页(非 http(s) 的会被滤掉)。
   */
  sources: string[]

  /**
   * 位置档(三处外边距不同)。
   */
  kind: CompanyAiNoteKind
}

/**
 * CompanyBriefCards(K 调查简介渲染)的 props。
 */
export type CompanyBriefCardsIn = {
  /**
   * 简介正文;'' = 整块不渲。
   */
  brief: string

  /**
   * 官网(简介卡底下那行小注);'' = 不出。
   */
  website: string

  /**
   * 检索日期。
   */
  fetched: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 译文(整段或按节标记);null = 不出中文对照。
   */
  trans: string | null

  /**
   * 扁平态(#186 公司弹框「先别用卡片」,无卡框);可省 = 卡壳态。
   */
  flat?: boolean

  /**
   * 来源网页(空表 = 没有「看来源」折叠钮)。
   */
  sources: string[]

  /**
   * 只出内容体(#197「合并」:标题/声明/外壳/官网由调用方处理);可省 = 出整卡。
   */
  bare?: boolean

  /**
   * 跳过「所在地」节(#199:DB 有精确地址时不重复);可省 = 不跳过。
   */
  skipBase?: boolean
}

/**
 * CompanyBriefBody(简介内容体)的 props。
 */
export type CompanyBriefBodyIn = {
  /**
   * 简介正文。
   */
  brief: string

  /**
   * 译文;null = 不出中文对照。
   */
  trans: string | null

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 扁平态。
   */
  flat: boolean

  /**
   * 跳过「所在地」节。
   */
  skipBase: boolean
}

/**
 * CompanyBriefSec(简介一节)的 props。
 */
export type CompanyBriefSecIn = {
  /**
   * 小标题文案键。
   */
  labelKey: string

  /**
   * 本节正文。
   */
  text: string

  /**
   * 本节译文;'' = 不出中文对照。
   */
  zh: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 扁平态。
   */
  flat: boolean
}

/**
 * CompanyZhLine(中文对照行)的 props。
 */
export type CompanyZhLineIn = {
  /**
   * 译文。
   */
  text: string

  /**
   * 散文态(整段译文保留原文换行);可省 = 节内短句。
   */
  prose?: boolean
}

/**
 * CompanySite(简介卡底的官网行)的 props。
 */
export type CompanySiteIn = {
  /**
   * 官网。
   */
  website: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 扁平态。
   */
  flat: boolean
}

/**
 * CompanyAiSection(懒查 K 调查简介)的 props。
 */
export type CompanyAiSectionIn = {
  /**
   * 公司名(按它查)。
   */
  company: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 显示中文对照;可省 = 不显示。
   */
  showTrans?: boolean

  /**
   * 界面语言;可省 = 不懒翻。
   */
  lang?: CompaniesLang

  /**
   * 扁平态;可省 = 卡壳态。
   */
  flat?: boolean

  /**
   * 只出内容体;可省 = 出整卡。
   */
  bare?: boolean

  /**
   * 跳过「所在地」节;可省 = 不跳过。
   */
  skipBase?: boolean
}

/**
 * CompanyGradesView(雇主信号四维)的 props。
 */
export type CompanyGradesViewIn = {
  /**
   * 四维明细;null = 整块不渲。
   */
  detail: CoGradeDetail

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 藏起担保维(#182:公司详情页把它让给独立的「担保记录」深块,不重复);可省 = 出。
   */
  hideSponsor?: boolean
}

/**
 * CompanyFactRow(四维网格里的一行:维名 | 档名 | 依据)的 props。
 */
export type CompanyFactRowIn = {
  /**
   * 维名。
   */
  label: string

  /**
   * 档名(带档色的粗体,或「无记录」灰句)。
   */
  tier: React.ReactNode

  /**
   * 依据句;可省 = 那一格空着。
   */
  evidence?: React.ReactNode
}

/**
 * CompanyGradeName(带档色的档名)的 props。
 */
export type CompanyGradeNameIn = {
  /**
   * 档位。
   */
  grade: number

  /**
   * 档名。
   */
  name: string
}

/**
 * CompanySponsorCard(担保记录深块)的 props。
 */
export type CompanySponsorCardIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(获批职业名跟着界面语走)。
   */
  lang: CompaniesLang
}

/**
 * CompanyStreamRow(担保股别一行)的 props。
 */
export type CompanyStreamRowIn = {
  /**
   * 这一股。
   */
  stream: CompanyStream

  /**
   * 取词函数(技能类标签)。
   */
  t: TFn
}

/**
 * CompanySpNocs(获批职业拆分)的 props。
 */
export type CompanySpNocsIn = {
  /**
   * 获批职业行(近两年窗口,与上方获批数同口径)。
   */
  rows: LmiaNocRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * CompanyJobsCard(在招职位)的 props。
 */
export type CompanyJobsCardIn = {
  /**
   * 公司档案(读在招行与在招总数)。
   */
  company: CompanyDetail

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(岗名下的 NOC 译名跟着它走)。
   */
  lang: CompaniesLang

  /**
   * 点职位的去处;可省 = 纯链接。
   */
  onOpenJob?: OpenJobFn

  /**
   * 把已载入的整行喂回来;可省 = 没有。
   */
  resolveJob?: ResolveJobFn

  /**
   * 链接新开页(弹框里点出去别把弹框关掉)。
   */
  newTab: boolean
}

/**
 * JobMiniRow(卡片内职位行)的 props。
 */
export type JobMiniRowIn = {
  /**
   * 岗位号。
   */
  id: number

  /**
   * 岗名。
   */
  title: string

  /**
   * 岗名下的灰字小注;可省 = 不出。
   */
  sub?: string

  /**
   * 薪资文本;可省 = 不出。
   */
  salaryText?: string

  /**
   * 城市;可省 = 不出。
   */
  city?: string

  /**
   * 点开这一行(弹框内叠开 JD 弹框);可省 = 调用方压根不做这件事,
   * null = 做,但这一行没载入整份行,算不出手柄 —— 两种都退回纯链接跳详情页。
   */
  onOpen?: GoBackFn | null

  /**
   * 链接新开页;可省 = 同标签页。
   */
  newTab?: boolean
}

/**
 * CompanySimilarCard(相似雇主)的 props。
 */
export type CompanySimilarCardIn = {
  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 链接新开页。
   */
  newTab: boolean
}

/**
 * CompanySimilarRow(相似雇主一行)的 props。
 */
export type CompanySimilarRowIn = {
  /**
   * 这一家。
   */
  employer: SimilarEmployer

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 链接新开页。
   */
  newTab: boolean
}

/**
 * CompanyPanel(公司弹框)的 props。
 */
export type CompanyPanelIn = {
  /**
   * 当前这一行职位(弹框从它出发:按 jobId 取公司、AI 速读吃它、判定入口带它)。
   */
  job: CompanyJobFact

  /**
   * 已载入的职位行(点在招职位时按岗位号回查整行)。
   */
  jobs: CompanyJobFact[]

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 付费态(AI 速读的额度闸)。
   */
  plan: CompanyPlan

  /**
   * 点在招职位的去处;可省 = 纯链接。
   */
  onOpenJob?: OpenJobFn
}

/**
 * CompanyPanelActs(弹框顶部三钮条)的 props。
 */
export type CompanyPanelActsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有可对照的中文(#196:AI 简介可翻,或在招职位有译名可显);false = 不出这个钮。
   */
  canTrans: boolean

  /**
   * 中文对照开着。
   */
  showTrans: boolean

  /**
   * 切中文对照。
   */
  onToggleTrans: GoBackFn

  /**
   * AI 速读开着。
   */
  aiOn: boolean

  /**
   * 切 AI 速读。
   */
  onToggleAi: GoBackFn

  /**
   * 公司 slug;'' = 没有完整页可去,那个钮不出。
   */
  slug: string
}

/**
 * briefSecsOf 的入参:一段带五节标记的文本。
 */
export type BriefSecsIn = {
  /**
   * 简介原文或译文。
   */
  text: string
}

/**
 * chColorOf 的入参:担保档位。
 */
export type ChColorIn = {
  /**
   * 档位;null = 未评。
   */
  grade: number | null
}

/**
 * streamsOf 的入参:股别串与取词函数。
 */
export type StreamsIn = {
  /**
   * 股别展示串。
   */
  streams: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * streamLabelOf 的入参:一股的原名与取词函数。
 */
export type StreamLabelIn = {
  /**
   * 股别原名(英文,来自 LMIA 名录)。
   */
  name: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * isGovCompany 的入参:公司名。
 */
export type IsGovIn = {
  /**
   * 公司名。
   */
  name: string
}

/**
 * httpSourcesOf 的入参:来源网页原列。
 */
export type HttpSourcesIn = {
  /**
   * 来源网页(可能混着非链接的字串)。
   */
  sources: string[]
}

/**
 * 四维依据句的入参:那一维与取词函数。
 */
export type SponsorTextIn = {
  /**
   * 担保维。
   */
  dim: CoSponsorDim

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 活跃度依据句的入参。
 */
export type ActiveTextIn = {
  /**
   * 活跃度维。
   */
  dim: CoActiveDim

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 薪资依据句的入参。
 */
export type SalaryTextIn = {
  /**
   * 薪资维。
   */
  dim: CoSalaryDim

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 知名度依据句的入参。
 */
export type FameTextIn = {
  /**
   * 知名度维。
   */
  dim: CoFameDim

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * jobNocNameOf 的入参:在招一行与界面语言。
 */
export type JobNocNameIn = {
  /**
   * 在招一行。
   */
  job: CompanyJobRow

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * lmiaNocNameOf 的入参:获批职业一行与界面语言。
 */
export type LmiaNocNameIn = {
  /**
   * 获批职业一行。
   */
  row: LmiaNocRow

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * displayNameOf 的入参:界面语言与公司档案。
 */
export type DisplayNameIn = {
  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 公司档案。
   */
  company: CompanyDetail
}

/**
 * jobsShownOf 的入参:在招行与展开态。
 */
export type JobsShownIn = {
  /**
   * 在招行(载入上限 50)。
   */
  jobs: CompanyJobRow[]

  /**
   * 已展开(#198:首显 8,展开其余)。
   */
  all: boolean
}

/**
 * 两个布尔态的落格(useState 的 setter,签名由 React 定死)。
 */
export type SetBoolFn = (v: boolean) => void

/**
 * 文本态的落格。
 */
export type SetTextFn = (v: string | null) => void

/**
 * 懒查结果的落格。
 */
export type SetBriefFn = (v: CompanyBriefFact | null) => void

/**
 * 加载态的落格。
 */
export type SetLoadingFn = (v: boolean) => void

/**
 * 弹框取数结果的落格。
 */
export type SetPanelDataFn = (v: CompanyPanelData | null) => void

/**
 * makeToggle 的入参:现值与落格。
 */
export type ToggleIn = {
  /**
   * 当前开合。
   */
  on: boolean

  /**
   * 落格。
   */
  set: SetBoolFn
}

/**
 * makeShowAll 的入参:展开落格。
 */
export type ShowAllIn = {
  /**
   * 展开态落格。
   */
  set: SetBoolFn
}

/**
 * makeOpenJob 的入参:这一行与上层回调。
 */
export type OpenJobIn = {
  /**
   * 这一行(已载入的整份)。
   */
  job: CompanyJobFact

  /**
   * 上层回调。
   */
  onOpenJob: OpenJobFn
}

/**
 * makeResolveJob 的入参:已载入的职位行。
 */
export type ResolveJobIn = {
  /**
   * 已载入的职位行。
   */
  jobs: CompanyJobFact[]
}

/**
 * makeTvOpen 的入参:判定入口带的岗位号。
 */
export type TvOpenIn = {
  /**
   * 岗位号(职位板的主键两种形态都出现过,拼地址前统一转文本)。
   */
  jobId: string | number
}

/**
 * makeAiToggle 的入参:AI 速读的现值与落格(第一次打开要埋点)。
 */
export type AiToggleIn = {
  /**
   * 当前开合。
   */
  on: boolean

  /**
   * 落格。
   */
  set: SetBoolFn
}

/**
 * makeLoadBrief 的入参:公司名与两个落格。
 */
export type LoadBriefIn = {
  /**
   * 公司名。
   */
  company: string

  /**
   * 简介落格。
   */
  setFact: SetBriefFn

  /**
   * 加载态落格。
   */
  setLoading: SetLoadingFn
}

/**
 * makeLoadTrans 的入参:公司名、语言与译文落格。
 */
export type LoadTransIn = {
  /**
   * 公司名。
   */
  company: string

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 译文落格。
   */
  setTrans: SetTextFn
}

/**
 * makeLoadPanel 的入参:岗位号与两个落格。
 */
export type LoadPanelIn = {
  /**
   * 岗位号(职位板的主键两种形态都出现过,原样进请求体 —— 接口按它查)。
   */
  jobId: string | number

  /**
   * 取数结果落格。
   */
  setData: SetPanelDataFn

  /**
   * 加载态落格。
   */
  setLoading: SetLoadingFn
}

/**
 * 取消标记(effect 拆卸后不再落格 —— 落格会打在已卸载的组件上)。
 */
export type DeadFlag = {
  /**
   * 已拆卸。
   */
  dead: boolean
}

/**
 * useCompanyAi 的入参。
 */
export type CompanyAiHookIn = {
  /**
   * 公司名(换了公司要重查)。
   */
  company: string

  /**
   * 显示中文对照(打开才懒翻)。
   */
  showTrans: boolean

  /**
   * 界面语言;null = 不懒翻。
   */
  lang: CompaniesLang | null
}

/**
 * useCompanyAi 的面板。
 */
export type CompanyAiPanel = {
  /**
   * 还在查(渲「正在检索」占位)。
   */
  loading: boolean

  /**
   * 查到的简介;null = 查不到(整块消失,不留孤儿)。
   */
  fact: CompanyBriefFact | null

  /**
   * 懒翻回来的译文;null = 还没翻。
   */
  trans: string | null
}

/**
 * useCompanyTrans 的入参(缓存简介那条路径的懒翻)。
 */
export type CompanyTransHookIn = {
  /**
   * 公司名。
   */
  name: string

  /**
   * 缓存的 K 调查简介;'' = 没有,不翻。
   */
  aiBrief: string

  /**
   * 名录厚简介够长(那条路径不走懒翻)。
   */
  hasDesc: boolean

  /**
   * 显示中文对照。
   */
  showTrans: boolean

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * CompanyIntro(基本信息卡里的简介内容)的 props。
 */
export type CompanyIntroIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 显示中文对照。
   */
  showTrans: boolean

  /**
   * 懒翻回来的译文;null = 没有。
   */
  trans: string | null

  /**
   * 跳过「所在地」节(DB 有精确地址时)。
   */
  skipBase: boolean
}

/**
 * CompanyLink(本域链接)的 props:弹框里点出去要新开页,页面上同标签页 ——
 * 这一条分叉在三处出现(在招职位、去职位板、相似雇主),收成一件。
 */
export type CompanyLinkIn = {
  /**
   * 去处。
   */
  href: string

  /**
   * 新开页。
   */
  newTab: boolean

  /**
   * 类名。
   */
  className: string

  /**
   * 链接内容。
   */
  children: React.ReactNode
}

/**
 * secZhOf 的入参:译文分节表、节标记与本节原文。
 */
export type SecZhIn = {
  /**
   * 译文的分节表。
   */
  tSecs: Record<string, string>

  /**
   * 节标记。
   */
  mark: string

  /**
   * 本节原文(逐字相同就不挂译文)。
   */
  en: string
}

/**
 * 只吃一份公司档案的派生入参。
 */
export type CompanyOnlyIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail
}

/**
 * hasIdOf 的入参:公司档案与算好的地址。
 */
export type HasIdIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 地址(DB 精确地址,没有时是省名)。
   */
  addr: string
}

/**
 * canTransOf 的入参:取到的公司档案与界面语言。
 */
export type CanTransIn = {
  /**
   * 公司档案;null = 还没取到。
   */
  company: CompanyDetail | null

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * panelSlugOf 的入参:职位行上的 slug 与取到的公司档案。
 */
export type PanelSlugIn = {
  /**
   * 职位行上带的公司 slug;'' = 这一行没带。
   */
  jobSlug: string

  /**
   * 公司档案;null = 还没取到。
   */
  company: CompanyDetail | null
}

/**
 * pillClsOf 的入参:药丸钮开着没有。
 */
export type PillClsIn = {
  /**
   * 开着。
   */
  on: boolean
}

/**
 * secTextOf 的入参:分节表与节标记。
 */
export type SecTextIn = {
  /**
   * 分节表(标记 → 正文)。
   */
  secs: Record<string, string>

  /**
   * 节标记。
   */
  mark: string
}

/**
 * secKeyOf 的入参:节标记。
 */
export type SecKeyIn = {
  /**
   * 节标记。
   */
  mark: string
}

/**
 * 类名预算里的扁平态入参(#186 公司弹框「先别用卡片」那一档)。
 */
export type FlatIn = {
  /**
   * 扁平态。
   */
  flat: boolean
}

/**
 * aiNoteClsOf 的入参:声明行的位置档。
 */
export type AiNoteClsIn = {
  /**
   * 位置档。
   */
  kind: CompanyAiNoteKind
}

/**
 * zhLineClsOf 的入参:是不是散文态。
 */
export type ZhLineClsIn = {
  /**
   * 散文态(整段译文保留原文换行)。
   */
  prose: boolean
}

/**
 * 一股 LMIA 认出来的显示名与技能类标记(份数由调用方从原串里带)。
 */
export type StreamLabel = {
  /**
   * 显示名。
   */
  label: string

  /**
   * 技能类。
   */
  skilled: boolean
}

/**
 * topNocsOf / restNocsOf 的入参:获批职业行。
 */
export type NocRowsIn = {
  /**
   * 获批职业行。
   */
  rows: LmiaNocRow[]
}

/**
 * restPositionsOf 的入参:并成一行的余量。
 */
export type LmiaRestIn = {
  /**
   * 余下的行。
   */
  rest: LmiaNocRow[]
}

/**
 * effect 里调用的取数函数:带一个取消标记,拆卸后不再落格。
 */
export type LoadFn = (flag: DeadFlag) => void

/**
 * K 调查接口回来的原始形状(归一前:线上可能少键,所以每格都写 `| null`,
 * 判空基准 `== null` 一网兜住 null 与 undefined)。
 */
export type BriefJson = {
  /**
   * 简介正文;缺/空 = 没查到,整块不渲。
   */
  brief: string | null

  /**
   * 查到的官网。
   */
  website: string | null

  /**
   * 来源网页。
   */
  sources: string[] | null

  /**
   * 检索日期。
   */
  fetched: string | null
} | null

/**
 * 翻译接口回来的原始形状(归一前)。
 */
export type TransJson = {
  /**
   * 翻成功了没有;不是 true 就当没翻(原文照旧显示)。
   */
  ok: boolean

  /**
   * 译文。
   */
  text: string | null
} | null

/**
 * 弹框取数接口回来的原始形状(归一前:没有 company 那一格就当取不到)。
 */
export type PanelJson = {
  /**
   * 公司档案。
   */
  company: CompanyDetail | null

  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]
} | null

/**
 * useCompanyPanel 的入参。
 */
export type CompanyPanelHookIn = {
  /**
   * 当前这一行职位(换了职位要重取)。
   */
  job: CompanyJobFact
}

/**
 * useCompanyPanel 的面板。
 */
export type CompanyPanelState = {
  /**
   * 还在取(渲「加载中」)。
   */
  loading: boolean

  /**
   * 取到的公司与相似雇主;null = 取不到(渲「暂不可用」)。
   */
  data: CompanyPanelData | null

  /**
   * 中文对照开着。
   */
  showTrans: boolean

  /**
   * 切中文对照。
   */
  onToggleTrans: GoBackFn

  /**
   * AI 速读开着。
   */
  aiOn: boolean

  /**
   * 切 AI 速读(第一次打开埋点)。
   */
  onToggleAi: GoBackFn
}
