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
 * 整卡重取手柄(2026-09-21:官网那条活办完时,卡叫宿主把公司重取一次)。
 */
export type ReloadFn = () => void

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
 * 「把这一家公司打开」要带的两格(2026-09-19:相似雇主点了开公司弹框,不跳页)。
 */
export type CompanyPeek = {
  /**
   * 公司页 slug(弹框按它取数)。
   */
  slug: string

  /**
   * 公司名(弹框页眉;数据到手前就能显示)。
   */
  name: string
}

/**
 * 「把这一家公司打开」的回调:点相似雇主 = 开公司弹框(已在公司弹框里 = 同框换一家);不传 = 纯链接。
 */
export type OpenCompanyFn = (peek: CompanyPeek) => void

/**
 * 链接的点击手柄(普通左键拦下开弹框;带修饰键 / 非左键放行,链接照常走)。
 */
export type PeekClickFn = (e: React.MouseEvent) => void

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
   * 这一岗库里存好的中文译名(现版本;'' = 没有。2026-09-23 灰字统一成标题译名)。
   */
  titleZh: string

  /**
   * 这一岗库里存好的韩文译名(同上)。
   */
  titleKo: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码(2026-09-14 Frank「这个省不对啊」:基本信息卡的省与市同取自这一行,不再各取各的)。
   */
  province: string

  /**
   * 城市中文译名(cities 表人工核定);'' = 没核定。
   */
  cityZh: string

  /**
   * 城市韩文译名;'' = 没核定。
   */
  cityKo: string

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

  /**
   * 中文别名;'' = 没有(2026-09-14 Frank「相似雇主要加翻译」)。
   */
  aliasZh: string

  /**
   * 韩文别名;'' = 没有。
   */
  aliasKo: string

  /**
   * 主市(2026-09-22 Frank「公司所在城市,是不是也加一下灰字」;行右灰字第二行);'' = 没记。
   */
  city: string

  /**
   * 主省码;'' = 没记。
   */
  province: string
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
   * 公司官方招聘页;'' = 没有,「招聘页」一行不出(2026-09-16 Frank「公司的 ATS 链接要不要列出来」)。
   */
  careersUrl: string

  /**
   * 真总部一行字(街址、市、省码,英文原样);'' = 库里没有,「总部」行退回有出处的 AI 简介(2026-09-20)。
   */
  hq: string

  /**
   * 真总部的出处网址(官网那一页 / Wikidata 条目);'' = 没有,「总部」行不成链。
   */
  hqSource: string

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
   * 指定雇主项目清单(AIP / RCIP / FCIP);空数组 = 非指定(担保记录卡那一行不渲)。2026-09-13 晚 /fe 雇主页补。
   */
  designatedPrograms: string[]

  /**
   * 指定归属省清单(那一行的灰注);空数组 = 非指定。
   */
  designatedProvinces: string[]

  /**
   * 在招总数(职位板同一份口径,与雇主板同数)。
   */
  openCount: number

  /**
   * 在招岗(全量,新的在前)。
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

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO,页面门 SSR 取;'' = 还没拿到,不渲)。
   */
  updatedAt: string

  /**
   * 分层态(2026-09-19:页上点在招职位叠开职位描述弹框,弹框的额度闸与投递栏按它走)。
   */
  plan: CompanyPlan
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
   * 数据更新时刻(在招职位卡标题行右端那句);'' = 还没拿到,整行不出 ——
   * 弹框走客户端取数没有服务端心跳,传的就是空串。
   */
  updatedAt: string

  /**
   * 显示中文对照(#185:点了才在英文段下挂译文);可省 = 不显示。
   */
  showTrans?: boolean

  /**
   * 点在招职位的去处;可省 = 纯链接跳详情页。
   */
  onOpenJob?: OpenJobFn

  /**
   * 把已载入的整行喂回来;可省 = 弹框外的调用方没有这份行。
   */
  resolveJob?: ResolveJobFn

  /**
   * 点相似雇主的去处(2026-09-19);可省 = 纯链接跳公司页。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 链接新开页(弹框里按着 Ctrl 点出去别把弹框关掉);可省 = 同标签页。
   */
  newTab?: boolean

  /**
   * 担保卡后面的插槽(#287 批D:公司弹框挂判定卡入口;页面无 job 语境不传)。
   */
  afterSponsor?: React.ReactNode

  /**
   * 现场翻译在途的回报(弹框页眉开关显「翻译中…」);可省 = 不回报。
   */
  onTransBusy?: (busy: boolean) => void

  /**
   * 官网那条活办完时整卡重取(2026-09-21,递给基本信息卡);可省 = 不重取。
   */
  onSiteDone?: ReloadFn
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
   * 懒抓简介 / 对照在途时回报 true(公司弹框靠它「都翻译完了才全部显示」,2026-09-14);可省 = 不回报。
   * 2026-09-16 改:只回报**对照**在途(懒抓简介在途由简介位自己出「AI 调查中…」),公司弹框不再整框等它。
   */
  onBusy?: (busy: boolean) => void

  /**
   * 卡标题;可省 = 「基本信息」(职位页 / 职位弹框里的公司卡递「公司信息」:放在职位下面叫「基本信息」会被读成职位的,2026-09-21)。
   */
  head?: string

  /**
   * 公司名那格下面的别名(中 / 韩界面,只读库里存好的);可省 = 不出(公司弹框的别名在页眉副题)。
   */
  alias?: string

  /**
   * 点公司名的去处:开公司弹框(名字成公司页真链接,普通左键拦下开框);可省 = 公司名是纯文字。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 官网那条活办完时叫宿主整卡重取(2026-09-21 Frank「都修」:工人拿官网版换掉旧简介、补上官网 / 总部 / 中文名,
   * 卡不重取就一直停在旧的);可省 = 不重取。
   */
  onSiteDone?: ReloadFn
}

/**
 * CompanyNameCell(基本信息卡「公司名称」那一格,2026-09-21 自 CompanyBasicCard 提出)的 props。
 */
export type CompanyNameCellIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 名字下面的别名;可省 = 不出。
   */
  alias?: string

  /**
   * 点公司名的去处;可省 = 公司名是纯文字。
   */
  onOpenCompany?: OpenCompanyFn
}

/**
 * cardTitleOf 的入参。
 */
export type CardTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 调用方递的卡标题;'' = 用「基本信息」。
   */
  head: string
}

/**
 * JobMiniList(一组职位行,2026-09-21 相关职位卡用)里的一行:行件要的几格 + 库里存好的职位名译名。
 */
export type MiniJobFact = {
  /**
   * 岗位号。
   */
  id: number

  /**
   * 岗名。
   */
  title: string

  /**
   * 薪资展示文本。
   */
  salaryText: string

  /**
   * 城市。
   */
  city: string

  /**
   * 职位名中文译名;'' = 库里还没有。
   */
  titleZh: string

  /**
   * 职位名韩文译名;'' = 库里还没有。
   */
  titleKo: string
}

/**
 * JobMiniList 的 props。
 */
export type JobMiniListIn = {
  /**
   * 这一组的行。
   */
  rows: MiniJobFact[]

  /**
   * 界面语言(英文界面不出灰字)。
   */
  lang: CompaniesLang

  /**
   * 点一行:宿主叠开职位描述弹框(整行由行自己现取)。
   */
  onOpenJob: OpenJobFn
}

/**
 * miniSubOf 的入参。
 */
export type MiniSubIn = {
  /**
   * 这一行。
   */
  row: MiniJobFact

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 懒翻回来的职位名 → 译名。
   */
  map: Record<string, string>
}

/**
 * CompanyInfoCard(职位页 / 职位弹框里的公司信息卡,2026-09-21)的 props。
 */
export type CompanyInfoCardIn = {
  /**
   * 这一岗的岗位号(按它取公司,与公司弹框同一个接口)。
   */
  jobId: number

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 点公司名:开公司弹框。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * useCompanyOfJob 的入参。
 */
export type CompanyOfJobHookIn = {
  /**
   * 这一岗的岗位号(换了岗位要重取)。
   */
  jobId: number
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

  /**
   * 「所在地」节的本地对照行;可省 = 照模型译文。
   */
  baseZh?: string
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

  /**
   * 「所在地」节没被改显时的对照行(2026-09-14 Frank「这个需要加逗号吧」:AI 那句是「市, 省」形就本地拼
   * 「市译名, 省译名」,不用模型把两个词粘成一串);'' = 照模型译文。
   */
  baseZh: string
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
 * CompanyPlace(基本信息卡「总部」「地址」行的值;2026-09-21 由 CompanyHq 改名,两行共用)的 props。
 */
export type CompanyPlaceIn = {
  /**
   * 一行地点字(总部拿不到是「—」)。
   */
  text: string

  /**
   * 点开的去处:Google 地图网址(2026-09-21 起;原为出处页);'' = 不成链。
   */
  href: string
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

  /**
   * 「所在地」节的本地对照行;可省 = 照模型译文。
   */
  baseZh?: string

  /**
   * 懒抓简介 / 对照在途时回报 true(公司弹框靠它「都翻译完了才全部显示」,2026-09-14);可省 = 不回报。
   * 2026-09-16 改:只回报**对照**在途(懒抓简介在途由简介位自己出「AI 调查中…」),公司弹框不再整框等它。
   */
  onBusy?: (busy: boolean) => void

  /**
   * 官网那条工种办到哪一步(2026-09-20;还在办时简介位出进度行、不联网现查);可省 = 不在这条工种里。
   */
  stage?: string

  /**
   * 队里排在这家前面的家数(排队中那一步显示位次;可省 = 0)。
   */
  ahead?: number

  /**
   * 公司档案里本来就有官网(进度行少一步「查找官网」);可省 = 没有。
   */
  hasSite?: boolean
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
   * 数据更新时刻(卡标题行右端那句「更新时间 …」);'' = 还没拿到,整行不出。
   */
  updatedAt: string

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

  /**
   * 中文对照开着(2026-09-16 Frank「在招职位 和 相似雇主 下面的也算中文翻译」:名下的对照行跟开关走)。
   */
  showTrans: boolean
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
   * 点开这一行(叠开职位描述弹框);可省 = 调用方压根不做这件事,纯链接跳详情页。
   * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:原 `onOpen`(只有已载入整行才给手柄)换成这一对 ——
   * 行还是真链接,普通左键拦下开弹框;没载入整行的点了现取(`/api/jobs/row`)。
   */
  onOpenJob?: OpenJobFn

  /**
   * 已载入的整行;可省 / null = 没有,点了现取。
   */
  row?: CompanyJobFact | null

  /**
   * 链接新开页;可省 = 同标签页。
   */
  newTab?: boolean
}

/**
 * `simShownOf` 的入参。
 */
export type SimShownIn = {
  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]

  /**
   * 展开态。
   */
  open: boolean
}

/**
 * CompanySimilarCard(相似雇主)的 props。
 */
export type CompanySimilarCardIn = {
  /**
   * 界面语言(别名按它取,2026-09-14)。
   */
  lang: CompaniesLang

  /**
   * 相似雇主。
   */
  similar: SimilarEmployer[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点一家的去处(2026-09-19);可省 = 纯链接。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 链接新开页。
   */
  newTab: boolean

  /**
   * 中文对照开着(2026-09-16 Frank「在招职位 和 相似雇主 下面的也算中文翻译」:名下的对照行跟开关走)。
   */
  showTrans: boolean
}

/**
 * CompanySimilarRow(相似雇主一行)的 props。
 */
export type CompanySimilarRowIn = {
  /**
   * 界面语言(别名按它取,2026-09-14)。
   */
  lang: CompaniesLang

  /**
   * 这一家。
   */
  employer: SimilarEmployer

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点这一家的去处(2026-09-19);可省 = 纯链接。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 链接新开页。
   */
  newTab: boolean

  /**
   * 中文对照开着(2026-09-16 Frank「在招职位 和 相似雇主 下面的也算中文翻译」:名下的对照行跟开关走)。
   */
  showTrans: boolean
}

/**
 * CompanyPanel(公司弹框)的 props。
 */
export type CompanyPanelIn = {
  /**
   * 当前这一行职位(弹框从它出发:按 jobId 取公司、AI 速读吃它、判定入口带它)。
   * null = 不是从职位进来的(2026-09-18 雇主板点雇主名),此时按 slug 取,底部的雇主线索卡不出(它要一条职位)。
   */
  job: CompanyJobFact | null

  /**
   * 公司页 slug;空串 = 按 job 的岗位号取。
   */
  slug: string

  /**
   * 已载入的职位行(点在招职位时按岗位号回查整行)。
   */
  jobs: CompanyJobFact[]

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 点在招职位的去处;可省 = 纯链接。
   */
  onOpenJob?: OpenJobFn

  /**
   * 点相似雇主的去处(2026-09-19);可省 = 纯链接。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 档案到手后把中 / 韩别名交给页眉副题(2026-09-14 Frank「参考一下职位描述的弹框 css」)。
   */
  onAlias: (alias: string) => void

  /**
   * 中文对照开着(2026-09-16 开关挪进弹框页眉,状态由弹框递进来)。
   */
  showTrans: boolean

  /**
   * 现场翻译在途的回报(页眉开关显「翻译中…」)。
   */
  onTransBusy: (busy: boolean) => void
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
   * 在招行(全量,新的在前)。
   */
  jobs: CompanyJobRow[]

  /**
   * 现在露几条(#198 首显 8;2026-09-20 起一批一批往上加,不再一次全铺)。
   */
  n: number
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
 * jobsToggleLabelOf 的入参。
 */
export type JobsToggleLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 折着没露的岗数。
   */
  hidden: number
}

/**
 * 数值态的落格(useState 的 setter,签名由 React 定死)。
 */
export type SetNumFn = (v: number) => void

/**
 * makeJobsMore 的入参:现在露几条与落格。
 */
export type JobsMoreIn = {
  /**
   * 现在露几条。
   */
  n: number

  /**
   * 落格。
   */
  set: SetNumFn
}

/**
 * makeJobsReset 的入参:落格。
 */
export type JobsResetIn = {
  /**
   * 落格。
   */
  set: SetNumFn
}

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
 * makeOpenJob 的入参:这一行与上层回调。
 */
export type OpenJobIn = {
  /**
   * 岗位号(没载入整行时按它现取;取不到就照链接去详情页)。
   */
  id: number

  /**
   * 这一行(已载入的整份);null = 没载入。
   */
  row: CompanyJobFact | null

  /**
   * 上层回调。
   */
  onOpenJob: OpenJobFn
}

/**
 * makeOpenCompany 的入参:这一家与上层回调。
 */
export type OpenCompanyIn = {
  /**
   * 这一家的 slug 与名。
   */
  peek: CompanyPeek

  /**
   * 上层回调。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * /api/jobs/row 的响应体:板上一行;非 200 记 null。
 */
export type JobRowJson = CompanyJobFact | null

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
 * makeLoadBrief 的入参:公司名、三个落格与放不放开现查。
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

  /**
   * 联网现查在途落格(2026-09-21:卡上「AI 调查中…」只跟它走)。
   */
  setLive: SetLoadingFn

  /**
   * 只查库不现查(官网那条工种还在办 / 还没报上去);false = 照旧(真人动作才现查)。
   */
  storedOnly: boolean
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

  /**
   * 现场翻译在途落格(页眉开关靠它显「翻译中…」)。
   */
  setBusy: (on: boolean) => void
}

/**
 * makeLoadPanel 的入参:岗位号与两个落格。
 */
export type LoadPanelIn = {
  /**
   * 岗位号(职位板的主键两种形态都出现过,原样进请求体 —— 接口按它查);null = 按 slug 取。
   */
  jobId: string | number | null

  /**
   * 公司页 slug;空串 = 按岗位号取。
   */
  slug: string

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
   * 界面语言;null = 不懒翻。
   */
  lang: CompaniesLang | null

  /**
   * 官网那条工种办到哪一步;'' = 还没报上去。
   */
  stage: string
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

  /**
   * 联网现查在途:「AI 调查中…」只在这时出(2026-09-21 开框那一拍只查库,原先也出这行,一闪就没;真调查的十几秒反倒什么都没有)。
   */
  live: boolean
}

/**
 * useCompanyTrans 交回的两样(2026-09-16 公司弹框不再等翻译;2026-09-17 pending 撤 —— 开关默认关,正文不再为「只查库」留白)。
 */
export type CompanyTransPanel = {
  /**
   * 译文;null = 还没翻 / 不用翻 / 没翻成。
   */
  trans: string | null

  /**
   * 现场翻译在途(正文已铺,译文后到)。
   */
  busy: boolean
}

/**
 * fetchCoTrans(拉一次简介译文)的入参。
 */
export type FetchCoTransIn = {
  /**
   * 公司名。
   */
  company: string

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 只查缓存与库不翻。
   */
  storedOnly: boolean
}

/**
 * zhShownOf(对照行跟开关走)的入参。
 */
export type ZhShownIn = {
  /**
   * 出不出。
   */
  show: boolean

  /**
   * 对照行文本。
   */
  text: string
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

  /**
   * 「所在地」节没被改显时的本地对照行;'' = 照模型译文(2026-09-14)。
   */
  baseZh: string

  /**
   * 懒抓简介 / 对照在途时回报 true(公司弹框靠它「都翻译完了才全部显示」,2026-09-14);可省 = 不回报。
   * 2026-09-16 改:只回报**对照**在途(懒抓简介在途由简介位自己出「AI 调查中…」),公司弹框不再整框等它。
   */
  onBusy?: (busy: boolean) => void

  /**
   * 官网那条工种办到哪一步(2026-09-20);可省 = 不在这条工种里。
   */
  stage?: string

  /**
   * 队里排在这家前面的家数(2026-09-22;可省 = 0)。
   */
  ahead?: number
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
   * 点击手柄(2026-09-19 拦普通左键开弹框);可省 = 纯链接。
   */
  onClick?: PeekClickFn

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
   * 界面语言(中 / 韩默认开对照,2026-09-14)。
   */
  lang: CompaniesLang

  /**
   * 当前这一行职位(换了职位要重取);null = 按 slug 取。
   */
  job: CompanyJobFact | null

  /**
   * 公司页 slug;空串 = 按 job 取。
   */
  slug: string
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
   * 重取一次(不清空、不出加载态,取回来直接换;2026-09-21 官网那条活办完时卡叫它)。
   */
  reload: ReloadFn
}

/**
 * makeLoadAlias 的入参。
 */
export type LoadAliasIn = {
  /**
   * 公司名。
   */
  name: string

  /**
   * 界面语言。
   */
  lang: CompaniesLang

  /**
   * 译名落格。
   */
  setAlias: SetTextFn

  /**
   * 请求收尾(成败都算)时报 true —— 页面靠它决定「全翻完了」再显示(2026-09-14)。
   */
  onSettled: (done: boolean) => void
}

/**
 * useCompanyPeek 的出参:公司页上叠开的两个弹框(2026-09-19)。
 */
export type CompanyPeekPanel = {
  /**
   * 弹框栈(2026-09-21:职位描述弹框与公司弹框一层层叠,只关最上面一层;原先的「那一岗」「那一家」两格并进这里)。
   */
  stack: PeekStackRef

  /**
   * 点在招职位:叠开职位描述弹框。
   */
  onOpenJob: OpenJobFn

  /**
   * 点相似雇主:叠开公司弹框(框里再点相似雇主同框换一家,由弹框栈的渲染件接手)。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * 弹框栈的职位层(2026-09-21;与 advisor 域的同名形状同形,本域自抄)。
 */
export type PeekJobLayer = {
  /**
   * 层的种类。
   */
  kind: 'job'

  /**
   * 这一岗(整行)。
   */
  job: CompanyJobFact
}

/**
 * 弹框栈的公司层。
 */
export type PeekCoLayer = {
  /**
   * 层的种类。
   */
  kind: 'company'

  /**
   * 这一家。
   */
  co: CompanyPeek
}

/**
 * 弹框栈的一层。
 */
export type PeekLayer = PeekJobLayer | PeekCoLayer

/**
 * 弹框栈(modal 域 useLayerStack 的出参;形状本域自抄):各层从下到上与三个手柄。
 */
export type PeekStackRef = {
  /**
   * 从下到上的各层。
   */
  layers: PeekLayer[]

  /**
   * 叠上一层。
   */
  push: (layer: PeekLayer) => void

  /**
   * 换掉最上面一层。
   */
  swapTop: (layer: PeekLayer) => void

  /**
   * 关掉最上面一层。
   */
  pop: () => void
}

/**
 * useCompanyAlias 的出参。
 */
export type CompanyAliasPanel = {
  /**
   * 别名;'' = 没有。
   */
  alias: string

  /**
   * 懒翻已收尾(库里有 / 翻完 / 翻不出 / 英文界面不翻)。
   */
  settled: boolean
}

/**
 * 懒翻公司名接口的响应(线格式)。
 */
export type AliasJson = {
  /**
   * 翻成功了没有。
   */
  ok?: boolean

  /**
   * 译名。
   */
  alias?: string | null
} | null

/**
 * useCompanyAlias 的入参。
 */
export type CompanyAliasHookIn = {
  /**
   * 公司名;'' = 还没拿到,不翻。
   */
  name: string

  /**
   * 界面语言(英文不翻)。
   */
  lang: CompaniesLang

  /**
   * 库里已有的别名;'' = 没有,才懒翻。
   */
  cached: string
}

/**
 * cityLocalOf 的入参。
 */
export type CityLocalIn = {
  /**
   * 在招岗一行。
   */
  j: CompanyJobRow

  /**
   * 界面语言。
   */
  lang: CompaniesLang
}

/**
 * baseZhOf 的入参。
 */
export type BaseZhIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(市译名按它取)。
   */
  lang: CompaniesLang

  /**
   * 公司档案(AI 简介与在招岗)。
   */
  company: CompanyDetail
}

/**
 * makeLoadDescTrans 的入参。
 */
export type LoadDescTransIn = {
  /**
   * 公司名。
   */
  name: string

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
 * useCompanyDescTrans 的入参。
 */
export type DescTransHookIn = {
  /**
   * 公司名;'' = 不翻。
   */
  name: string

  /**
   * 界面语言(英文不翻)。
   */
  lang: CompaniesLang

  /**
   * 有官网简介没;没有不翻。2026-09-17 早先一版曾把页眉开关并进来(关着不翻),同日 Frank「后台要自动翻译」改回:开关只管显不显。
   */
  has: boolean
}

/**
 * panelBodyOf 的入参。
 */
export type PanelBodyIn = {
  /**
   * 岗位号;null = 没有职位。
   */
  jobId: string | number | null

  /**
   * 公司页 slug;空串 = 按岗位号取。
   */
  slug: string
}

/**
 * `/api/jobs/company` 的请求体(两格恰有一格非空)。
 */
export type PanelBody = {
  /**
   * 岗位号。
   */
  jobId: string | number | null

  /**
   * 公司页 slug。
   */
  slug: string | null
}

/**
 * 官网那条工种在公司卡上的面板:办到哪一步 + 办完那一拍补上来的官网与总部(2026-09-20)。
 */
export type SitePanel = {
  /**
   * 办到哪一步;'' = 还没报上去 / 没有真人动作。
   */
  stage: string

  /**
   * 工人找到 / 纠对的官网;'' = 没有,用公司档案里的。
   */
  website: string

  /**
   * 工人整理出来的真总部一行字;'' = 没有,用公司档案里的。
   */
  hq: string

  /**
   * 真总部的出处网址;'' = 没有。
   */
  hqSource: string

  /**
   * 队里排在这家前面的家数(2026-09-22 Frank「排在第几位」;显示 第 ahead+1 位)。
   */
  ahead: number
}

/**
 * 进度接口回来的原始形状(归一前:线上可能少键)。
 */
export type SiteStageJson = {
  /**
   * 办到哪一步。
   */
  stage: string | null

  /**
   * 官网。
   */
  website: string | null

  /**
   * 真总部一行字。
   */
  hq: string | null

  /**
   * 真总部的出处网址。
   */
  hqSource: string | null

  /**
   * 队里排在这家前面的家数。
   */
  ahead?: number | null
}

/**
 * 面板的落格。
 */
export type SetSiteFn = (v: SitePanel) => void

/**
 * makeOpenSite 的入参。
 */
export type OpenSiteIn = {
  /**
   * 公司名。
   */
  name: string

  /**
   * 面板落格。
   */
  setSite: SetSiteFn

  /**
   * 从「在办」落到办完 / 查无那一拍调一次(2026-09-21:卡叫宿主整卡重取;原「wait:简介区空着才接着问」撤,一律问到办完)。
   */
  onDone: ReloadFn
}

/**
 * useCompanySite 的入参。
 */
export type CompanySiteHookIn = {
  /**
   * 公司名(换了公司要重报)。
   */
  name: string

  /**
   * 办完那一拍调一次(见 OpenSiteIn 同名格);换了函数不重报点开。
   */
  onDone: ReloadFn
}

/**
 * siteDoneOf 的入参:宿主给的重取手柄与卡上铺没铺着简介。
 */
export type SiteDoneIn = {
  /**
   * 宿主给的重取手柄。
   */
  fn: ReloadFn

  /**
   * 卡上已铺着简介(官网简介或缓存的 AI 简介);false = 简介区空着,走 CompanyAiSection 那一档。
   */
  settled: boolean
}

/**
 * sitePanelOf 的入参。
 */
export type SitePanelIn = {
  /**
   * 进度接口回来的原始形状;null = 没回来。
   */
  json: SiteStageJson | null

  /**
   * 强制记成「不再等」。
   */
  off: boolean
}

/**
 * 进度行的一步。
 */
export type SiteStep = {
  /**
   * 步骤键。
   */
  key: string

  /**
   * 词条键。
   */
  label: string

  /**
   * 步骤态:done / now / wait。
   */
  state: string
}

/**
 * siteStepsOf 的入参。
 */
export type SiteStepsIn = {
  /**
   * 办到哪一步(含卡上自己算的 trans)。
   */
  stage: string

  /**
   * 公司档案里本来就有官网(没有的多一步「查找官网」)。
   */
  hasSite: boolean

  /**
   * 界面语言(英文界面没有「翻译」一步)。
   */
  lang: CompaniesLang | null
}

/**
 * shownStageOf 的入参。
 */
export type ShownStageIn = {
  /**
   * 队列里办到哪一步。
   */
  stage: string

  /**
   * 简介到了没。
   */
  hasFact: boolean

  /**
   * 中 / 韩译文还在途。
   */
  transWait: boolean
}

/**
 * CompanySteps(进度行)的 props。
 */
export type CompanyStepsIn = {
  /**
   * 办到哪一步。
   */
  stage: string

  /**
   * 公司档案里本来就有官网。
   */
  hasSite: boolean

  /**
   * 界面语言。
   */
  lang: CompaniesLang | null

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 队里排在这家前面的家数(排队中那一步显示 第 ahead+1 位 + 已等计时,2026-09-22)。
   */
  ahead: number
}

/**
 * `queuedTextOf` 的入参。
 */
export type QueuedTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 队里排在这家前面的家数。
   */
  ahead: number

  /**
   * 已等秒数。
   */
  sec: number
}

/**
 * siteWebsiteOf / siteHqOf / siteHqHrefOf 的入参。
 */
export type SiteShownIn = {
  /**
   * 公司档案。
   */
  company: CompanyDetail

  /**
   * 官网那条工种的面板。
   */
  site: SitePanel

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
 * noSiteOf 的入参:官网行的字与探索进度。
 */
export type NoSiteIn = {
  /**
   * 官网行的字(siteWebsiteOf 算好的);'' = 没有。
   */
  website: string

  /**
   * 探索进度(队列表的 stage;'' = 还没问到)。
   */
  stage: string
}

/**
 * addrShownOf 的入参:库里的地址(2026-09-22 Frank「相同 也 都显示」:「总部」行那格随判重链一起撤了)。
 */
export type AddrShownIn = {
  /**
   * 库里的地址(公司表 address;职位页的卡在公司表没有时是这条岗的地址);'' = 没有。
   */
  addr: string
}
