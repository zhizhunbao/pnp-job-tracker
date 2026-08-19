// 职位域的**全部形状** —— 库里一行长什么样(JobRow、几张维度表的行、由它们聚合出来的两种视图),
// 外加页面「怎么摆」的三个(ColKey / FieldGroup / Plan)。
//
// 为什么全在这儿(2026-08-18 Frank「函数和类型都搬过来 lib」「frontend jobs 下面怎么还有 types.ts」):
// 数据形状是 `queries.ts` 的行映射**产出**的东西(fetchJobRows / mapPnpOcc / mapEeCat)——
// **类型跟着产出方走**,依赖方向才是单向的 app → lib;而形状一旦分两处,「去哪找」本身就成了一件要记的事,
// 所以页面那边一个类型文件都不留。
//
// **纯类型,零运行时**(同它的前身:更早以前 lib 反向 import 一个 `use client` 组件,只因类型定在那儿)。

import type { MatchProfile } from './match'

export type JobRow = {
  id: string | number
  match: 'high' | 'mid' | 'low' | 'na' | null   // 与我的匹配(E5-00,服务端算;null=未建档/免费限额外/未登录)
  gradeChannel?: number | null   // E12-08:移民通道档 1-5(2026-07-26 起不再展示,只供排序/筛选)
  sponsorGrade?: number | null   // E12-08:公司担保档 1-5(公司名旁药丸;null=无记录不评)
  title: string
  company: string
  companySlug: string   // E8-09:公司详情页 /companies/[slug] 直链(桌面弹框「打开完整页」、手机公司名跳页)
  companyDescription: string
  companySectors: string
  companyWebsiteSrc: string   // 官网来路:''=雇主自报/名录 · jd=帖内线索 · searched=自动检索(加小字,E8-04 D2)
  source: string
  sourceLabel: string
  origin: string
  country: string
  province: string
  city: string
  district: string
  address: string
  noc: string
  category: string
  teer: number | null
  broad: string
  mid: string
  fine: string
  accessibility: string
  score: number | null
  pnpEligible: boolean
  pnpStream: string
  eeCategory: string
  aip: boolean
  /** RCIP/FCIP 试点社区命中('RCIP'|'FCIP'|'RCIP+FCIP'|'');粗筛信号,试点须雇主先被社区指定 */
  pilot: string
  pilotCommunity: string
  /** 批B:雇主在其试点社区的官方指定名单上;false≠未指定(名单可能未公布),只做正向展示 */
  pilotEmployer: boolean
  /** 批C 尾巴:岗位 NOC × 社区在收清单('yes'|'no'|'');no 是官方清单为据的负判定,可写 */
  pilotOcc: string
  eligibilityFlag?: string   // GAP1③:''|'no_sponsorship'|'pr_required'(数据层 visa_flag 检测)
  eligibilityQuote?: string  // 命中原句(可核验出处)
  // 雇佣形态 + 入职要求(E6-06/E6-07A,详情页结构化标注 05b 解析;空=未标注,ATS 岗天然空)
  employmentTerm: string      // permanent/term/casual/seasonal/''
  employmentHours: string     // full/part/''
  certificates: string[]      // 证书/执照要求原文(标准化词表)
  education: string           // 学历要求原文
  // LMIA 外劳雇佣记录(E6-02,公司级,ESDC 近 8 季聚合):历史事实,非「能担保」判定
  lmiaPositions: number | null
  lmiaPositionsSkilled?: number | null   // B4-02:技能股(High Wage/GTS);null=列未回填
  lmiaLastQuarter: string
  lmiaStreams: string
  salary: string
  salaryAnnual: number | null
  salaryText: string
  wageMedHourly: number | null
  wageMedAnnual: number | null
  wageLowHourly: number | null
  wageLowAnnual: number | null
  wageHighHourly: number | null
  wageHighAnnual: number | null
  wageYear: string
  officialUrl: string
  applyUrl: string
  datePosted: string
  firstSeen: string
  lastSeen: string
  status: string
  closedAt: string
}

// E8-07:维度行类型 export 给详情页(SSR 取数按同一形状传入)
// program:PNP(省提名,默认)/ AIP(大西洋移民试点背书)—— 两条路分开判(E6-09;NB 两套官方清单)
export type PnpOcc = { province: string; stream: string; label: string; type: string; program?: string; noc: string; name: string; gtaRestricted: boolean; url: string; fetched: string }
// 省抽选事实(E6-04):score 是省自评分制(scale 标注),非 CRS —— 只作事实展示,不做资格/差分判定
// E12-09 的 ScoreFactor 类型已随打分功能迁到 jobs/pnpSelfScore.ts(职位板不再依赖它)
export type PnpDraw = { province: string; kind: string; drawDate: string; stream: string; streamZh?: string; score: number | null; scale: string; invitations: number | null; note: string; label: string; url: string; fetched: string }
export type EeOcc = { category: string; label: string; noc: string; teer: number | null; title: string; url: string; fetched: string; drawCrs: number | null; drawDate: string; drawSize: number | null }
export type DesigEmp = { name: string; province: string; location: string; isTech: boolean }
export type NocDesc = { noc: string; title: string; titleZh?: string; titleKo?: string; duties: string; requirements: string; fetched: string }
export type FieldSource = { field: string; kind: string; publisher: string; url: string; title: string; description: string; status: string; fetched: string; note: string }
// 官方移民新闻瘦行(E12-06):弹框「本省最新公告」行用,详情在 /news/[slug]
export type NewsSlim = { region: string; title: string; date: string; slug: string }

export type Dims = {
  provinces: { code: string; name: string }[]
  cities: { name: string; province: string }[]
  districts: { name: string; city: string; province: string }[]
  // 中/小分类的英韩名跟着维度表下发(2026-08-03 换官方分类那批):显示层不再自己攒翻译表
  nocCategories: { broad: string; mid: string; fine: string; teer: number | null; broadEn?: string; broadKo?: string; midEn?: string; midKo?: string; fineEn?: string; fineKo?: string }[]
  sources: { name: string }[]
  experienceLevels: { name: string }[]
  pnpOccupations: PnpOcc[]
  pnpDraws: PnpDraw[]
  eeCategories: EeOcc[]
  designatedEmployers: DesigEmp[]
  nocDescriptions: NocDesc[]
  fieldSources: FieldSource[]
  news: NewsSlim[]
}

// 一条省提名通道 + 它点名的职业(由 PnpOcc 行按 stream 聚合出来)
export type PnpStream = { stream: string; label: string; type: string; url: string; fetched: string; occupations: { noc: string; name: string; gtaRestricted: boolean }[] }
// 一个联邦 EE 类别 + 它涵盖的职业(由 EeOcc 行按 category 聚合出来)
export type EeCat = { key: string; label: string; drawCrs: number | null; drawDate: string; drawSize: number | null; occupations: { noc: string; teer: number | null; title: string }[] }

type CoGradeDim = { g: number; v: any } | null
export type CoGradeDetail = { sponsor?: CoGradeDim; active?: CoGradeDim; salary?: CoGradeDim; fame?: CoGradeDim } | null

// 省级 IRCC 体量事实(地点弹框):留学生/临时外劳/IMP 存量 + PNP 落地 + 提名配额
type ProvInfoNum = { n: number; year: string }
export type ProvInfo = { study?: ProvInfoNum; tfwp?: ProvInfoNum; imp?: ProvInfoNum; pnpPr?: ProvInfoNum; alloc?: { y2026?: number | null; y2025?: number | null } }

// ══ 展示形状 ══ 下面三个说的是「怎么摆」,库里没有对应的一行;它们只被页面消费。

// 分层态(E3-05/E5-00,服务端 page.tsx 传入):gate 在服务端已生效,这里只做展示引导
export type Plan = {
  isPro: boolean
  loggedIn: boolean
  profileOk: boolean
  profile: MatchProfile | null
  freeMatchCap: number
  // #84(Frank「刷新头像闪一下?」):身份四件 SSR 直传——原客户端事后拉 /api/users/me,
  // 拉回前 Avatar 名字为空兜底成紫「?」,每次刷新闪一下;SSR 本就认识用户,直接带下来零闪
  email?: string | null
  displayName?: string | null
  avatar?: string | null
  proUntil?: string
}


// 主表列名全集。列的显示顺序/默认可见/表头文案在 ./Table.tsx,这里只定「有哪些列」——
// 因为它同时是**字段名**:顾问弹框按字段开(openField)、字段来源按字段查,都拿它当键。
export type ColKey = 'score' | 'match' | 'pnp' | 'ee' | 'aip' | 'pilot' | 'lmia' | 'eligibility' | 'broad' | 'mid' | 'fine' | 'teer' | 'empHours' | 'empTerm' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'wageMedHr' | 'wageMedYr' | 'vsMedian' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt' | 'actions'

// E8-10 弹框三合一(2026-07-21 Frank 拍板「统一设计,统一改」):24 个字段收成 3 个弹框,
// 对应用户真正会问的三件事(这家靠谱吗 / 这活干什么给多少 / 这岗对我有没有用)。
// 后续 #176 拆出 category,E8-12 拆出 location,2026-07-25 五连拍再拆 pnp/ee/aip/pilot/salary。
export type FieldGroup = 'company' | 'immigration' | 'category' | 'location' | 'pnp' | 'ee' | 'aip' | 'pilot' | 'salary'
