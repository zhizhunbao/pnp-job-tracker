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
  ColKey, DesigEmp, EeOcc, FieldGroup, FieldSource, JobRow, NewsSlim, NocDesc, Plan, ProvInfo,
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
 * 取词函数(与 lib/i18n 的 TFn 同形 —— 宪法「types 自声明」)。
 */
export type AdvisorTFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 列名键(外域形状,见文件头):点开弹框的那一格是哪一列。
 */
export type AdvisorColKey = ColKey

/**
 * 分组名(外域形状):一次铺开一组事实的那个组。
 */
export type AdvisorGroup = FieldGroup

/**
 * 省提名清单里的一条职业(2026-09-28 本域自声明,照抄 pnp 桶的 PnpOcc 全格:整表由 pnp 桶懒取交过来,本域原样喂回 pnp 桶的
 * MeansForMe / aipBlockOf —— 亲手递给外域引擎的形状全格照抄,少一格就是 tsc 红)。
 */
export type AdvisorPnpOcc = {
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
   * 项目归属:PNP / AIP(空档在映射时落 PNP)。
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

  /**
   * 清单管哪几条子类(官方原文;'' = 全项目)。SK 主线不合格表是「OID/EE」,不管带 offer 的岗(2026-09-27)。
   */
  appliesTo: string
}

/**
 * 省提名职业清单(外域整表,整份喂给 MeansForMe;2026-09-28 起 PnpListSection 随省提名弹框自立,不再经本域)。
 */
export type AdvisorPnpOccs = AdvisorPnpOcc[]

/**
 * 一次抽选(2026-09-28 本域自声明,照抄 pnp 桶的 PnpDraw 全格,理由同 AdvisorPnpOcc)。
 */
export type AdvisorPnpDraw = {
  /**
   * 省码;FED=联邦轮次。
   */
  province: string

  /**
   * 行类别:draw=抽选,notice=通告(如改制公告)。
   */
  kind: string

  /**
   * 抽选日期(`YYYY-MM-DD`)。
   */
  drawDate: string

  /**
   * 通道英文名。
   */
  stream: string

  /**
   * 通道中文名;''=还没翻到(不出灰注,不是报错)。
   */
  streamZh: string

  /**
   * 分数线(省自评分制 SIRS/WEOI/MPNP EOI,非 CRS);null=该轮未公布。
   */
  score: number | null

  /**
   * 邀请数;null=未公布。
   */
  invitations: number | null

  /**
   * 官方通告原文(#153:通告行优先直接渲染它,缺了才退回旧模板)。
   */
  note: string

  /**
   * 展示标签(省抽选=通道名;联邦行=类别键)。
   */
  label: string

  /**
   * 官方页(数据层抓这一行的那一页;2026-09-26 起事实卡底部的官方链接读它)。
   * 同晚起三种抽选卡标题那一行右端的「来源」读它(每省一页:各通道的轮次都在同一页上)。
   */
  url: string

  /**
   * 同一组同一天几行各是哪一项选取(数据层短码 occ / top:N / franco / grad / wage:H:Y / points / path:a+b;
   * 认不出空串;2026-09-27 Frank「照改,加这一列」)。
   */
  selection: string

  /**
   * 这一轮的人数属于哪个项目(PNP / AIP / PNP+AIP;认不出空串;2026-09-29 抽选卡重排,整表透传给 pnp 桶,本域不读)。
   */
  program: string

  /**
   * 人数数的是什么(invitation / selection / application;2026-09-29 抽选卡重排,整表透传给 pnp 桶,本域不读)。
   */
  unit: string

  /**
   * 官方人数只写上限时的上限;确数行为 null(2026-09-29 抽选卡重排,整表透传给 pnp 桶,本域不读)。
   */
  invitationsBelow: number | null
}

/**
 * 各省抽选记录(外域整表,整份喂给 PnpDrawsBlock / EeCategorySection;2026-09-28 起 PnpListSection 随省提名弹框自立,不再经本域)。
 */
export type AdvisorPnpDraws = AdvisorPnpDraw[]

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
 * 「把这一家公司打开」要带的两格(2026-09-19;与 companies 域的 CompanyPeek 同形,本域自抄)。
 */
export type CompanyPeek = {
  /**
   * 公司页 slug。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string
}

/**
 * 点相似雇主的回调(2026-09-19 Frank「这种里面的链接都改成弹框显示」:宿主把「开 / 换公司弹框」注进来)。
 */
export type OpenCompanyFn = (peek: CompanyPeek) => void

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
   * NOC 官方职业描述。
   */
  nocDesc: AdvisorNocDescs

  /**
   * 点进来的那一格(该行高亮)。
   */
  srcField: string
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
 * 刷新钮的点击。
 */
export type RefreshFn = () => void

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
   * 译名行右端的切换控件(公司组的中文对照开关;2026-09-16 Frank「公司的也对照改一下」);别的组不挂。
   */
  ctl: React.ReactNode
}

/**
 * WinActs 的 props(标题栏里的两颗窗口钮)。
 */
export type WinActsIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 重新翻译;null = 这个框没有(不出钮)。
   */
  onRefresh: RefreshFn | null

  /**
   * 落地页地址;空串 = 没有落地页(不出钮)。
   */
  pageHref: string
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

  /**
   * 译名行右端的切换控件(jobs 桶 JdSwitches;2026-09-16 Frank「放到一行」)。
   */
  ctl: React.ReactNode

  /**
   * 译名行下那行日期(jobs 桶 JobDates,与详情页 H1 下同一件;2026-09-26 立、09-27 撤、10-01 挂回)。
   */
  dates: React.ReactNode
}

/**
 * ActJd(职位描述弹框的内层:JD 身体状态机 + 浮层)的 props。
 */
export type ActJdIn = {
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
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 白卡机器(外层 ActModal 起,重译重挂时位置尺寸不丢;2026-09-28 并壳起是 modal 桶 useFrame 交回的面板 ——
   * 本域不读它的任何一格,原样递回 Modal,所以这里不透明化)。
   */
  frame: object

  /**
   * 标题译名;'' = 还没有。
   */
  sub: string

  /**
   * 外层弹框面板(剩余次数、重译代数与回调)。
   */
  a: ActModalPanel

  /**
   * 点正文下面相关职位卡里的一行:宿主往弹框栈上叠开那一岗(2026-09-21)。
   */
  onOpenJob: OpenJobFn

  /**
   * 点正文下面公司信息卡里的公司名:宿主往弹框栈上叠开公司弹框(2026-09-21)。
   */
  onOpenCompany: OpenCompanyFn
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
   * 同公司在榜岗(公司组用;E10-01 P3 现拉,不再靠父级全量列表)。
   */
  companyJobs: AdvisorJob[]

  /**
   * 点一行在榜岗(公司组的在招职位列表要它);可省 —— 调用方没给就不给点。
   */
  onOpenJob?: OpenJobFn

  /**
   * 点公司组里的相似雇主(2026-09-19);可省 = 纯链接。
   */
  onOpenCompany?: OpenCompanyFn

  /**
   * 取数包。
   */
  f: AdvisorFacts

  /**
   * 公司弹框把别名回传给页眉的口(2026-09-14)。
   */
  onCompanyAlias: (alias: string) => void

  /**
   * 公司弹框把「现场翻译在途」回传给页眉开关的口(2026-09-16)。
   */
  onCompanyTransBusy: (busy: boolean) => void

  /**
   * 重译代数(CompanyPanel 的 key,变了重挂重取)。
   */
  gen: number

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
   * 清单译名开着没有。
   */
  showZh: boolean

  /**
   * 同公司在榜岗。
   */
  companyJobs: AdvisorJob[]

  /**
   * 公司弹框页眉副题 = 公司中 / 韩别名(CompanyPanel 取到档案后回传;'' = 没有,2026-09-14)。
   */
  companyAlias: string

  /**
   * CompanyPanel 回传别名的口。
   */
  onCompanyAlias: (alias: string) => void

  /**
   * 公司简介现场翻译在途(页眉开关显「翻译中…」并禁用)。
   */
  transBusy: boolean

  /**
   * CompanyPanel 回传翻译在途的口。
   */
  onTransBusy: (busy: boolean) => void

  /**
   * 重译代数(2026-09-14 Frank「怎么把弹框给我关了」:点「重译」不再整页刷新,代数加一让弹框正文与页眉副题重挂重取)。
   */
  gen: number

  /**
   * 「重译」打完接口后的回调:代数加一。
   */
  onRetranslated: () => void
}

/**
 * AdvisorModal 的 props(门上冻结的契约,消费者六处按它传)。
 * 2026-09-26 /fe 首页 Frank:省提名清单与抽选两格撤出契约 —— 两张整表不再随首屏内联,弹框打开时自己懒取(usePnpData);
 * 眼下唯一的消费者是职位板的弹框层(BoardModals),同批改掉。
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

  /**
   * 点公司组里的相似雇主(2026-09-19);可省 = 纯链接。
   */
  onOpenCompany?: OpenCompanyFn
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

  /**
   * 点正文下面相关职位卡里的一行:宿主往弹框栈上叠开那一岗(2026-09-21)。
   */
  onOpenJob: OpenJobFn

  /**
   * 点正文下面公司信息卡里的公司名:宿主往弹框栈上叠开公司弹框(2026-09-21)。
   */
  onOpenCompany: OpenCompanyFn
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

  /**
   * 界面语言(职业名那一行按它取短名,2026-09-23)。
   */
  lang: AdvisorLang
}

/**
 * occNameOf 的入参(2026-09-23 职业分类改两级)。
 */
export type OccNameOfIn = {
  /**
   * 这一岗的 NOC 官方描述;null = 表里没有这一码(给空串)。
   */
  noc: AdvisorNocDesc | null

  /**
   * 界面语言。
   */
  lang: AdvisorLang
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
   * 岗位号(正文取数的键;2026-09-20 改键)。
   */
  id: string | number

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
 * 同公司在榜岗接口回来的原始形状(归一前;整体可能是 null)。
 */
export type CompanyJobsJson = {
  /**
   * 在榜岗;缺席 = 一个都没有。
   */
  rows?: AdvisorJob[]
} | null

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
 * kickerOf 的入参。
 */
export type KickerIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 分组。
   */
  group: string
}

/**
 * fieldPageOf 的入参。
 */
export type FieldPageIn = {
  /**
   * 铺的是哪一组。
   */
  group: AdvisorGroup

  /**
   * 这一岗的公司 slug(职位行的 companySlug;空 = 这家没有公司页)。
   */
  slug: string
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
   * 铺的是哪一组(公司组的副题是别名,其余组是标题译名;2026-09-14 前公司组不挂副题)。
   */
  group: string

  /**
   * 按岗懒翻回来的标题译名(jobtitle 桶 useTitleTrans;2026-09-28 起,原先是 NOC 译名);'' = 还没有。
   */
  trans: string

  /**
   * 公司别名(只 GROUP_COMPANY 用,2026-09-14 Frank「参考一下职位描述的弹框 css」:别名放页眉副题位)。
   */
  companyAlias: string
}

/**
 * transTitleOf 的入参。
 */
export type TransTitleIn = {
  /**
   * 铺的是哪一组。
   */
  group: string

  /**
   * 这一岗。
   */
  job: AdvisorJob
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

  /**
   * 重译代数(2026-09-14 Frank「怎么把弹框给我关了」:点「重译」不再整页刷新,代数加一让弹框正文与页眉副题重挂重取)。
   */
  gen: number

  /**
   * 「重译」打完接口后的回调:代数加一。
   */
  onRetranslated: () => void
}

/**
 * jobRefreshOf 的入参。
 */
export type JobRefreshIn = {
  /**
   * 分层态(只对管理员出钮)。
   */
  plan: AdvisorPlan

  /**
   * 这一岗。
   */
  job: AdvisorJob

  /**
   * 接口打完后的回调(弹框代数加一)。
   */
  onDone: RefreshFn
}

/**
 * companyRefreshOf 的入参。
 */
export type CompanyRefreshIn = {
  /**
   * 分层态(只对管理员出钮)。
   */
  plan: AdvisorPlan

  /**
   * 弹框分组(只有公司组出钮)。
   */
  group: string

  /**
   * 这一岗(取公司名)。
   */
  job: AdvisorJob

  /**
   * 接口打完后的回调(弹框代数加一)。
   */
  onDone: RefreshFn
}

/**
 * pairLabelOf(页眉中文对照开关的字)的入参。
 */
export type PairLabelIn = {
  /**
   * 取词函数。
   */
  t: AdvisorTFn

  /**
   * 现场翻译在途。
   */
  busy: boolean
}

/**
 * CompanyModal(不带职位的公司弹框)的 props。
 */
export type CompanyModalIn = {
  /**
   * 公司页 slug(按它取数)。
   */
  slug: string

  /**
   * 公司名(页眉标题;数据到手前就能显示)。
   */
  name: string

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 点在招职位:宿主叠开职位描述弹框(2026-09-19)。
   */
  onOpenJob: OpenJobFn

  /**
   * 点相似雇主:宿主把本框换成那一家(同框换内容,不往上叠)。
   */
  onOpenCompany: OpenCompanyFn

  /**
   * 关弹框。
   */
  onClose: () => void
}

/**
 * useCompanyModal 交回的面板。
 */
export type CompanyModalPanel = {
  /**
   * 中 / 韩别名(CompanyPanel 拿到档案后回传;页眉译名行显示)。
   */
  alias: string

  /**
   * 现场翻译在途(开关显「翻译中…」)。
   */
  transBusy: boolean

  /**
   * 已载入的职位行(雇主板上没有,恒空;CompanyPanel 的 jobs 要一个稳定引用)。
   */
  jobs: AdvisorJob[]

  /**
   * 别名回传落格。
   */
  onAlias: (alias: string) => void

  /**
   * 翻译在途回传落格。
   */
  onTransBusy: (busy: boolean) => void
}

/**
 * 弹框栈的职位层(2026-09-21 Frank「点公司就弹公司的框?然后还能点回来」):职位描述弹框。
 */
export type PeekJobLayer = {
  /**
   * 层的种类。
   */
  kind: 'job'

  /**
   * 这一岗(整行)。
   */
  job: AdvisorJob
}

/**
 * 弹框栈的公司层:公司弹框。
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
 * 弹框栈(宿主起的 modal 域 useLayerStack;形状本域自抄):各层从下到上与三个手柄。
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
 * PeekStack(弹框栈的渲染件)的 props。
 */
export type PeekStackIn = {
  /**
   * 宿主起的弹框栈。
   */
  stack: PeekStackRef

  /**
   * 界面语言。
   */
  lang: AdvisorLang

  /**
   * 分层态(职位描述弹框的额度闸按它走)。
   */
  plan: AdvisorPlan

  /**
   * NOC 官方职业描述(职位描述弹框标题下的译名要它);宿主没有就递空表。
   */
  nocDesc: AdvisorNocDescs
}

/**
 * peekKeyOf 的入参。
 */
export type PeekKeyIn = {
  /**
   * 这一层。
   */
  layer: PeekLayer

  /**
   * 它在栈里的位置(从下往上数,0 起)。
   */
  at: number
}
