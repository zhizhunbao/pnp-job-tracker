/**
 * 判定域的形状 —— 通道结论、雇主判定、三合一卡、案例事实档,以及底表的取数形状。
 *
 * 🔴 **本文件只放类型,一个运行时值都不许有。**
 *
 * 🔵 `Evidence` 与 `Availability` **在本域自己声明**,不从对话域借 ——
 * 判定域比对话域活得久,借过来就是「幸存的依赖将死的」(宪法「新建域 / 替换域」)。
 * 两处的字段今天逐字相同,但它们回答的是不同的问题:那边是「一条事实的出处」,
 * 这边是「一条判定理由的出处」,同形不同源,各自声明才不会被对方的改动牵着走。
 *
 * 🔵 **底表与档案的形状也是本域自己声明的**(第 0 段),不从 `lib/rules` / `lib/score` /
 * `lib/pathways` / `lib/gateManifest` 取(2026-08-20 Frank:「直接就新建,然后自己依赖自己直接用,
 * 所有的域都这么做」)。于是本文件**一个跨域 import 都没有**。
 * 只声明本域**真正读的那几格** —— 引擎那头多一个字段,不必跟着改一次;真读不到会当场 tsc 红。
 * 跨域的重复与边界,等所有域都重构完再一起谈。
 *
 * @author Frank
 * @time 2026-08-20 01:40:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- 鉴权层「人」的形状归 quota(会话契约),与本文件借 db/jobs 形状同一特批形态
import type { SessionUser as QuotaSession } from '../quota'
import type { Db } from '../db'
// eslint-disable-next-line local/no-import-in-leaf -- 职业竞争面行的形状归 jobs 域（特批牌形态）
import type { OccCompetitionRow } from '../jobs'
// eslint-disable-next-line local/no-import-in-leaf -- 试点名额聚合的形状归 pathways 域（特批牌形态）
import type { PilotQuotaAgg } from '../pathways'
// eslint-disable-next-line local/no-import-in-leaf -- 排序行的最小形状归 plan 域（jobsOf 回调的参型由它定；特批牌形态）
import type { RankableRow } from '../plan'


// =========================================================================
// 0. 判定域自己的底表与档案形状
// =========================================================================

/**
 * 一行门槛条文管谁 —— 申请人还是雇主。
 *
 * **两个搞混,句子本身就是假的**(「你要开满一年」vs「雇主要开满一年」)。
 */
export type SubjectKind = 'applicant' | 'employer'

/**
 * 本站问得到的学历档。
 */
export type EduBand =   | 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

/**
 * MPNP EOI 的学历档。
 */
export type MbEduBand =   | 'masterOrDoctorate' | 'twoPrograms2yPlus' | 'oneProgram3yPlus' | 'oneProgram2y'
  | 'oneYearProgram' | 'tradeCert' | 'none'

/**
 * 一道闸的名字。
 */
export type GateName = 'offer' | 'statusInCanada' | 'credentialCanada' | 'fieldMatch' | 'french'

/**
 * 「境内身份」这道闸底下问哪一样(2026-08-15 拆闸)。
 */
export type AskKind = 'workPermit' | 'pgwp' | 'provResidence' | 'provEmployment'

/**
 * 一行门槛条文 —— 判定域读得最多的一张表(`pnp_requirements`)。
 */
export type ReqRow = {
  /**
   * 两位省码;联邦那条是 `FED`。
   */
  province: string

  /**
   * 官方项目名(联邦三子通道靠它分流)。
   */
  program: string

  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 这条管谁。
   */
  subject: SubjectKind

  /**
   * 量哪一样:language / experience / residence / empYears …
   */
  factor: string

  /**
   * 比较口径:`>=` / `<=` / `in` / `none`(none = 官方明说这档不要求)。
   */
  op: string

  /**
   * 官方阈值;没有数的行是 null。
   */
  value: number | null

  /**
   * 官方原文里那个值的写法(联邦页的 quote 优先取它)。
   */
  valueText: string

  /**
   * 阈值的单位:months / years / hours …
   */
  unit: string

  /**
   * 管哪几档 TEER(`"2,3,4,5"`);空 = 不分 TEER。
   */
  appliesTeer: string

  /**
   * NOC 码前缀白名单(ON 技工低档语言门槛);空 = 不分职业。
   */
  appliesNoc: string

  /**
   * NOC 码前缀排除表(官方原文的 excluding Sub-Major Group …)。
   */
  excludesNoc: string

  /**
   * 管哪个行政区(metro-vancouver / gta …);空 = 全省。
   */
  appliesArea: string

  /**
   * 非地域的适用条件(`grad-other-province` 这种)。空 = 对谁都适用。
   * 与 `appliesArea` 分开是因为那一列存的是**官方枚举的行政区**,混一个非地理值进去,
   * 按区域挑行的收入表迟早挑到不该挑的行。
   */
  appliesCondition: string

  /**
   * 最低收入表专用的家庭人数档。
   */
  familySize: number | null

  /**
   * 阈值的**口径**(不是绝对数时说清按什么算):
   * `occMedian` = 该职业该地区的官方中位工资;
   * `employerTenure` = 量「在**这家**雇主连续全职干了多久」,**不是**同职业总经验。
   */
  basis: string

  /**
   * 官方原文。
   */
  label: string

  /**
   * 官方节号。
   */
  section: string

  /**
   * 这条条文的生效日。
   */
  effective: string

  /**
   * 官网 URL。
   */
  url: string

  /**
   * 抓取时那一页的 URL(与 url 可能不同)。
   */
  pageUrl: string

  /**
   * 抓取日。
   */
  fetched: string
}

/**
 * 一行官方分值行(`pnp_score_factors`)。
 */
export type ScoreRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 这套打分制自报的名字(NL 那张自报是 EE Skilled Worker 的)。
   */
  system: string

  /**
   * 哪一个因素:education / language / age / wage / area …
   */
  factor: string

  /**
   * 行的种类:`row` = 必答档位、`bonus` = 加分项、`rule` = 纯规则。
   */
  kind: string

  /**
   * 同一因素里的第几行 —— 用户直选的档位就是按它认行。
   */
  seq: number

  /**
   * 官方档位标签(CLB 档、年数档都从它解析)。
   */
  label: string

  /**
   * 这一档多少分;官方 n/a 时 null,**不折成 0**。
   */
  points: number | null

  /**
   * 与上一行互斥(官方表里的「或」)。
   */
  xorPrev: boolean

  /**
   * 纯规则行的参数,官方写成 JSON 串。
   */
  rule: string

  /**
   * 这一个因素的封顶分。
   */
  factorMax: number | null

  /**
   * 因素所属的组(官方表自己分的组)。
   */
  factorGroup: string

  /**
   * 该组的封顶分。
   */
  groupMax: number | null

  /**
   * 这套制度的及格线;官方没说则 null。
   */
  passMark: number | null

  /**
   * 这套制度的满分;官方没说则 null。
   */
  maxTotal: number | null

  /**
   * 官方指南的生效日。
   */
  guideEffective: string

  /**
   * 抓取日。
   */
  fetched: string

  /**
   * 官网 URL。
   */
  url: string
}

/**
 * EE 官方分值表的一行(`ee_points_grid`)。
 */
export type EeRow = {
  /**
   * 哪一张表:CRS / FSW67。
   */
  grid: string

  /**
   * 官方节号。
   */
  section: string

  /**
   * 节的标题。
   */
  sectionLabel: string

  /**
   * 行的种类。
   */
  kind: string

  /**
   * 官方表号。
   */
  tableNo: number | null

  /**
   * 表头(「首项官方语言」那一段就是靠它认出来的)。
   */
  heading: string

  /**
   * 哪一个因素。
   */
  factor: string

  /**
   * 官方档位文字(CLB 档从它解析)。
   */
  criterion: string

  /**
   * 列标题(有无配偶两列)。
   */
  columnLabel: string

  /**
   * 这一格多少分;官方 n/a 时 null,不折成 0。
   */
  points: number | null

  /**
   * 官方那一格的原文(n/a 也照抄)。
   */
  pointsText: string

  /**
   * 表内行序。
   */
  seq: number | null

  /**
   * 官网 URL。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string
}

/**
 * 喂给判定引擎(`evaluateRequirements`)的那份档案。
 */
export type EngineProfile = {
  /**
   * NOC 码;没答就 null(2026-08-21 四禁:缺席显式写)—— 判「这个职业算不算官方列的技工」用(ON 语言分档)。
   */
  noc: string | null

  /**
   * TEER。
   */
  teer: number | null

  /**
   * 四项里的最低档(站内 clb 口径)。
   */
  clb: number | null

  /**
   * 加拿大经验月数。
   */
  canadianExpMonths: number | null

  /**
   * 同职业总经验(含海外)—— 官方 experience 要的就是这个口径。
   */
  totalExpMonths: number | null

  /**
   * 家庭人数;题库还没问 → 多数为 null,按「1 人档」做下界推理。
   */
  familySize: number | null

  /**
   * 该职业在该省的中位年薪(岗位自带的事实,不问用户)。
   */
  annualIncome: number | null

  /**
   * 上面那个数是不是「职业中位」—— 措辞要说清这不是他本人的工资。
   */
  incomeIsOccMedian: boolean

  /**
   * 行政区;不知道就 null。
   */
  area: string | null
}

/**
 * 判定引擎给出的出处。
 */
export type EngineEvidence = {
  /**
   * 官方原文 / 清单名。
   */
  label: string

  /**
   * 官网 URL。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string

  /**
   * 官方节号。
   */
  section: string

  /**
   * 生效日。
   */
  effective: string
}

/**
 * 判定引擎吐出来的一条结论 —— **本域只声明自己读的那几格**。
 *
 * 引擎那头还带着 `basis` / `needLow` / `tiers` 等字段,判定域不消费,就不写进来:
 * 写进来等于替它维护一份形状,而它多一格我们就得跟着改一次。
 */
export type EngineResult = {
  /**
   * 这条结论说的是哪一个因素。
   */
  factor: string

  /**
   * 三态:达标 / 不达标 / 判不了。
   */
  verdict: ItemVerdict

  /**
   * 官方阈值;这一档不要求时 null。
   */
  need: number | null

  /**
   * 差多少(不达标才有)。
   */
  short: number | null

  /**
   * 出处 —— 摆句子时 quote 取它的 label。
   */
  evidence: EngineEvidence
}

/**
 * 喂给省分值表(`scoreProvince`)的那份档案。
 */
export type GridProfile = {
  /**
   * 学历档。
   */
  edu: EduBand

  /**
   * 近 5 年内同职业全职年数(0-5)。
   */
  expRecent: number

  /**
   * 再往前(6-10 年前)的年数(0-5)。
   */
  expOlder: number

  /**
   * 首考语言 CLB(0 = 没有成绩)。
   */
  clb1: number

  /**
   * 第二官方语言 CLB(0 = 没有)。
   */
  clb2: number

  /**
   * 年龄。
   */
  age: number
}

/**
 * 喂给 CRS 估分器(`estimateCrs`)的那份档案。
 */
export type CrsProfile = {
  /**
   * 年龄。
   */
  age: number | null

  /**
   * 配偶是否随行申请;null/false 都走 without-spouse 表。
   */
  married: boolean | null

  /**
   * 四项最低(首官方语言)。
   */
  clb: number | null

  /**
   * 学历档。
   */
  edu: EduBand | null

  /**
   * 学制年数。
   */
  eduYears: number | null

  /**
   * 有无加拿大学历。
   */
  canadaStudy: boolean | null

  /**
   * 加拿大经验月数。
   */
  expCanadaMonths: number | null

  /**
   * 境外经验月数。
   */
  expForeignMonths: number | null
}

/**
 * MPNP EOI 的适应性加分项。
 */
export type MbAdapt = {
  /**
   * 曼省持续就业 6 月 + 长期 offer,或战略计划 ITA(二选一即满分,不叠加)。
   */
  demand: boolean

  /**
   * 曼省有直系亲属(+200)。
   */
  closeRelative: boolean

  /**
   * 曾在曼省 authorized 工作 6 月以上(+100)。
   */
  priorMbWork6moPlus: boolean

  /**
   * 在曼省完成的学制年数档(2 = 完成 2 年以上 / 1 = 完成 1 年 / 0 = 无)。
   */
  mbEduYears: 0 | 1 | 2

  /**
   * 曼省有好友或远亲(+50)。
   */
  closeFriendOrDistantRelative: boolean

  /**
   * 移民目的地在温尼伯以外(+50)。
   */
  regionalOutsideWinnipeg: boolean
}

/**
 * 喂给 MPNP EOI 估分器(`estimateMbEoi`)的那份档案。
 */
export type MbEoiProfile = {
  /**
   * 语言(四项同档)。
   *
   * 分值域那边还认「四项各给一档」的形状,但**判定域从来只喂单一数** ——
   * 本域只声明自己真正用的那一格(宪法「形状由本域自己声明,只声明真读的那几格」)。
   */
  clb: number

  /**
   * 第二官方语言总体 CLB≥5(一次性 +25,不按项乘)。
   */
  secondLangClb5Plus: boolean

  /**
   * 年龄。
   */
  age: number

  /**
   * 同职业曼省(或官方认可)工作月数。
   */
  workMonthsSameOcc: number

  /**
   * 该职业已获省内发证/监管机构全面认可(work 加分 +100)。
   */
  employerLicenseRecognized: boolean

  /**
   * MPNP 认的学历档。
   */
  edu: MbEduBand

  /**
   * 适应性加分项。
   */
  adapt: MbAdapt

  /**
   * 有外省工作经历(−100)。
   */
  riskForeignWork: boolean

  /**
   * 有外省学习经历(−100)。
   */
  riskForeignStudy: boolean
}

/**
 * 「不在清单就不合格」的明文(PE 的 OID 子通道)。
 */
export type ListRequired = {
  /**
   * 去哪个省的清单里找。
   */
  province: string

  /**
   * 清单名要对上的那条通道。
   */
  streamRe: RegExp
}

/**
 * 省外院校毕业生的**额外在职门槛**(2026-08-15 #317)。
 */
export type OutOfProvinceGrad = {
  /**
   * 要先在本省全职干满几个月。
   */
  months: number

  /**
   * 官方原句 —— 三样齐全(原句 + url + 生效日)才准声明。
   */
  quote: string

  /**
   * 官网 URL。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string

  /**
   * 生效日;官方没写则 null。
   */
  effective: string | null
}

/**
 * 一条通道的声明 —— **本域只声明自己读的那几格**。
 *
 * 13 条通道的知识住在 `lib/pathways`(一条通道一个文件,Frank「每个通道一个策略文件吧?」),
 * 那边还带着 gates / ui / note 等字段,判定域不读,就不写进来。
 */
export type PathwaySpec = {
  /**
   * 通道 key —— 闸的声明与例外条款都按它查。
   */
  key: string

  /**
   * 判定结果里报的省(联邦线是 `FED`)。
   */
  province: string

  /**
   * 官方通道名(判定卡与句子里报它)。
   */
  stream: string

  /**
   * 去哪个省的门槛表里挑行。
   */
  reqProvince: string

  /**
   * 联邦三子通道各自的项目名;非联邦不填。
   */
  reqPrograms: string[] | null

  /**
   * 门槛行的通道名要对上的正则。用**子串**不用字面相等:mart 里的通道名带 em dash,
   * 写死全串等于把编码问题埋进代码。
   */
  reqStream: RegExp | null

  /**
   * 抽选行的通道名。
   */
  drawStream: string | null

  /**
   * 抽选行没有子通道字段时,准不准退回「全省最近一轮有分线的抽选」。
   * 只对 MB 开:MPNP 是单池单分制;BC 逐通道设线,退回全省线就是拿医疗线量木匠。
   */
  drawFallbackProvinceWide: boolean

  /**
   * 有没有专用估分器;没有则走官方分值表。
   */
  scorer: 'CRS' | 'MB' | null

  /**
   * 门槛认不认境外经验。
   */
  countsForeign: boolean

  /**
   * 「不在清单就不合格」的明文;多数通道没有。
   */
  listRequired: ListRequired | null

  /**
   * 省外院校毕业生那一档;多数通道没有。
   */
  outOfProvinceGrad: OutOfProvinceGrad | null
}

// =========================================================================
// 0. 事实的出处与四态(本域自己的一份)
// =========================================================================

/**
 * 一条判定理由的出处。**没有出处的结论不许见客。**
 */
export type Evidence = {
  /**
   * 官方页面地址。
   */
  url: string


  /**
   * 本站抓取日(**不是「今天」**)—— 用户判断新鲜度靠它。
   */
  fetched: string


  /**
   * 官方原文 / 清单名。
   */
  label?: string


  /**
   * 官方节号。
   */
  section?: string


  /**
   * 官方生效日。
   */
  effective?: string
}

/**
 * 这条信息为什么没有值 —— **四态,一步都不许合并**。
 *
 * `not-published` 和 `not-collected` 在用户那里意思相反:前者是**官方的问题**,
 * 后者是**我们的问题**。合并成「没有数据」= 拿假前提教用户防中介。
 */
export type Availability = 'ok' | 'not-published' | 'not-collected' | 'not-applicable'

// =========================================================================
// 0b. 取数的形状
// =========================================================================

/**
 * 库里一格的值域:文本 / 数字 / 布尔 / 空。
 *
 * 写成这个联合而不是 `unknown`:列的值域本来就是确定的,写 `unknown` 等于把
 * 「取值前先收窄」推给每一个调用点,而那正是 `strOf` / `numOf` 存在的理由。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行。键是 snake_case 的列名,值是库标量 —— **不用 `unknown`**:
 * 列的值域是确定的(文本/数字/布尔/空),写 `unknown` 等于把「取值前先收窄」推给每个调用点。
 */
export type Row = Record<string, Cell>


// =========================================================================
// 1. 判定核:档案、理由、通道结论
// =========================================================================

/**
 * 判定要的那份档案。**每一项都可为 null,null = 没答,不是默认值** —— 缺一个槽就判不了那道闸,替他填一个等于替他编答案。
 */
export type VerdictProfile = {
  /**
   * 年龄。CRS 与各省年龄档按它挑行;**不猜**,没答就是 null。
   */
  age: number | null

  /**
   * 配偶是否随行申请(CRS 单身/已婚两套表)
   */
  married: boolean | null

  /**
   * 四项最低(站内口径,同 RuleProfile.clb)
   */
  clb: number | null

  /**
   * 沿用 pnpSelfScore 阶梯
   */
  edu: EduBand | null

  /**
   * 学制年数(2 年制 → PGWP 3 年)
   */
  eduYears: number | null

  /**
   * 有无加拿大学历
   */
  canadaStudy: boolean | null
  /**
   * 在哪个省读的书,两位省码。有的通道只认本省学历。
   */
  studyProvince: string | null
  /**
   * 五位职业码。拿不到就判不了职业相关的闸 —— **绝不猜**。
   */
  noc: string | null
  /**
   * 这个职业的 TEER。分 TEER 的条款靠它挑行;不知道就一条都挑不出来,那是实话。
   */
  teer: number | null

  /**
   * 同职业加拿大受雇经验(自雇不计的口径由通道规则判)
   */
  expCanadaMonths: number | null
  /**
   * 海外同职业经验月数。**与加拿大经验分开存** —— 多数通道只认加拿大的,合并会把海外申请人的路凭空判开。
   */
  expForeignMonths: number | null

  /**
   * 海外经验是否全为自雇(C01:开商店=自雇→多通道记 0)
   */
  foreignExpSelfEmployed: boolean | null

  /**
   * pgwp / study / worker / other
   */
  status: string | null

  /**
   * 现居省(问卷「你现在人在哪个省」;'TERR'=三个领地)
   */
  province: string | null
  // ── 门槛清单三类闸的答案(2026-08-12,设计 §3.2)。null = 没答 → 该闸 unknown → 判不了,
  //    **不许**当成「没有障碍」——那正是「没有行 ⇒ 没有闸 ⇒ open」的同一个病。
  /**
   * 手上有没有 job offer
   */
  hasOffer: boolean | null

  /**
   * 人是否已在加拿大境内(由「你现在的情况」推出)
   */
  inCanada: boolean | null
  /**
   * 加拿大学历的专业与目标职业对不对口(2026-08-15 新题)。null = 没答 → 该闸判不了,
   *  **不许**当成对口 —— NL 国际毕业生官方要求岗位与所学专业相关,猜一个等于替他编答案。
   */
  fieldMatch: boolean | null
  /**
   * 法语是否达到 FCIP 要的 NCLC 5 四项(2026-08-15 新题)。**不许**拿 clb 折算 ——
   *  那是英语的尺子,换算过去就是替他编一个法语成绩。null = 没答 → 判不了。
   */
  frenchOk: boolean | null
  /**
   * 持的许可(2026-08-15 statusInCanada 拆闸):study=学签 / pgwp / work=其他工签 / none=访客或已过期。
   *  null = 没答 → 工签/PGWP 类闸落「判不了」,不拿 inCanada 冒充有工签(学签在读被 AB 放行的那个病)。
   */
  /**
   * 持的是哪种许可。`none` = 访客或已过期;null = 没答,该闸判不了。
   */
  permit: 'study' | 'pgwp' | 'work' | 'none' | null
  /**
   * 用户在分值卡上答过的**条件值**(近 5 年经验 / 6-10 年经验 / 第二语言 CLB…)。
   *  档案只问了总经验、只问了第一语言 —— 拆分与第二语言**不许由档案推**(那是编数);
   *  但用户自己答了就该用。**只收他真答过的项**(调用方按 extraAnswered 过滤)。
   */
  /**
   * 打分制要的那半档案(与判定档案字段不同,所以单独一格)。
   */
  scoreProfile?: Partial<GridProfile>
  /**
   * 用户在分值卡上**直选的官方档位**,键 `省:因素` → 该档 seq(2026-08-16)。
   *  没有它,凡是「必答档位喂不出档案」的省(BC 的工作地区、ON 的年收入…)一律整省不接 ——
   *  可用户明明在页面上答了,只是从没上行过。
   */
  /**
   * 用户在打分表上逐项选的档(因素键 → 选中的分)。
   */
  scoreRows?: Record<string, number>

  /**
   * 时薪(加元/小时):BC SIRS 按整元计分(floor-15),满分 55,占 200 分里的大头
   */
  wage?: number | null

  /**
   * BC 工作地区档(0=大温 / 1=Squamish 等 / 2=其余):官方 area 行的下标
   */
  areaI?: number | null
  /**
   * 用户在分值卡上勾中的加分项,键 `省:因素:批`(2026-08-16 Frank「把加分项做成正式答案字段」)。
   *  先前这一侧恒空 ⇒ 带加分项的省估分永远是「全 0 下界」⇒ 恒落「取决于加分项」。
   *  没勾的仍按 0 —— value 因此**仍是下界**,「够得着」照旧是不会翻案的硬结论。
   */
  /**
   * 打分表上的勾选项(因素键 → 勾没勾)。
   */
  scoreTicks?: Record<string, boolean>
}

/**
 * 一条判定理由。**`excluded` 必带官方原句** —— 结论可以是我们的,依据必须是官方的。
 */
export type VerdictReason = {
  /**
   * 这条理由是哪一类:被排除 / 差一截 / 已满足 / 判不了。
   * **`needs-info` 与 `excluded` 不许混** —— 前者他一步能补,后者是官方明说不行。
   */
  kind: 'excluded' | 'gap' | 'met' | 'needs-info'

  /**
   * 中文成句。**留着不动**:lib/chat/facts 拿它喂模型(zhOnly),多处测试也钉着这些措辞。
   */
  text: string
  /**
       措辞层(2026-08-11):`pv.*` i18n 键 + 参数,显示端 `t(key, params)` 自己拼。
      为什么不直接把 text 翻三份:这些句子是**按数据拼出来的**(门槛几个月、差几档、清单叫什么),
      翻译必须发生在有参数的地方。形态照 `tripleVerdict.ts` 那套现成的,不新发明。
      官方原句 `quote` **永不翻** —— 那是引用,翻了就不是原句。
      */
  key?: string

  /**
   * 填进那句三语文案的变量(门槛几个月、差几档、清单叫什么)。
   */
  params?: Record<string, string | number>

  /**
   * 官方原句(excluded 必带)
   */
  quote?: string

  /**
   * 出处。**没有出处的判定不许见客** —— 有 `quote` 就必须有它。
   */
  /**
   * 出处。**没有出处的判定不许见客。**
   */
  evidence?: Evidence
}

/**
 * 一条通道的判定结论。顺序即通道注册表原序,**本层不重排** —— 编个次序出来等于替用户拿主意。
 */
export type PathwayVerdict = {
  /**
   * 'FED-EE' / 'ON-workforce' / 'MB-swm' / 'SK-offer' / 'AIP' / ...
   */
  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string

  /**
   * 'FED' 或省码
   */
  province: string

  /**
   * 官方通道名
   */
  stream: string

  /**
   * #308(2026-08-15 深夜改名):原值 'viable' 人人误读成「能走」—— 它只表示「没有判不了的项」,
   *  差一道闸也是它(靠 blockedBy 区分)。改 'viable'(仍需看 blockedBy/tier 才知道差什么)
   */
  verdict: 'excluded' | 'viable' | 'needs-info'

  /**
   * offer 后等多久:0=Day0 / 1=3-6月 / 2=12月 / 3=24月;excluded=null
   */
  tier: 0 | 1 | 2 | 3 | null

  /**
   * tier 的**起算点**(2026-08-15 #319)。`now` = 从今天起算;`after-study` = 毕业拿到工签之后才开始算。
   * 在读学生(学签)不许全职上班 —— 他的「再攒 12 个月经验」一天都还没开始,写成从今天起算是假话。
   * 引擎判据:处境=在读 且 该通道的 tier 来自**经验/在职**门槛(居住门槛不算:搬过去当天就在计时)。
   * excluded / tier=0 一律 `now`(没有等待期就没有起算点问题)。
   * 消费端契约:随行下发,措辞层自己决定怎么说(「毕业后再 12 个月」vs「12 个月」)。
   */
  tierBasis: 'now' | 'after-study'

  /**
   * 这段等待要的是**全职**经验吗(取自选中门槛行的官方原文,不手写);居住类等待不带此标
   */
  tierFullTime?: boolean
  /**
   * 被**攒时间补不了**的门槛卡住(语言差档 / 自雇经历不计 / 门槛清单里明确不满足的那类闸)。
   *  不是 excluded —— 考一次试、找一份 offer 就能过,但**现在**走不了。先前这类缺口只生成一条理由、
   *  不进 gaps,于是 tier=0 + verdict=open,CLB 4 的厨师也能把联邦 EE 顶到方案第一位
   *  (2026-08-11 Frank 两次实拍点名)。排序与标签都要看它。
   *  2026-08-12 扩:offer / statusInCanada / credentialCanada 三类闸来自 gateManifest。
   */
  blockedBy?: 'language' | 'selfEmployed' | GateName

  /**
   * 判不了时**缺的是哪几个档案槽**(clb / expCanadaMonths / province / noc / 三类闸的键)。
   * 只装「他一步能补的」—— 条文缺(我们的窟窿)走 availability='not-collected',两者不许混
   * (2026-08-12 三值折叠的同一条规矩)。判定卡的结论句「判不了:还缺 X」点名就取这里。
   */
  missingSlots?: string[]
  /**
   * 逐条理由。**每条 excluded 必带官方原句** —— 结论可以是我们的,依据必须是官方的。
   */
  reasons: VerdictReason[]

  /**
   * 这条通道的打分结果(有打分制的省才有)。
   */
  score?: PathwayScore
  /**
   * 这一格的信息状态。**四态不许合并。**
   */
  availability: Availability
}

// =========================================================================
// 1b. mart 行类型(按 data/mart/*.json 的实况字段声明,不多不少)
// =========================================================================

/**
 * data/mart/pnp_occupations.json(630 行)。type: 'ineligible' | 'indemand';appliesTo 空=该省全通道。
 */
export type OccupationRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 官方清单名(如 'SINP Occupations In-Demand / Express Entry')
   */
  stream: string

  /**
   * 本站中文短名(**不是官方原文**,永不进 quote)
   */
  label: string

  /**
   * 所属项目(一个省可能有多个项目各自带清单)。
   */
  program: string

  /**
   * 这一行是收录还是排除:`ineligible` = 明确排除,其余为收录。
   * **收录与排除同时存在是正常的** —— 不同通道各有各的清单。
   */
  type: string

  /**
   * 官方清单页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * '' | 'OID/EE' | 'Employment Offer'
   */
  appliesTo: string

  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方 NOC 职业名
   */
  name: string

  /**
   * 这一条在大多伦多区内是否受限(ON 专有)。
   */
  gtaRestricted: boolean
}

/**
 * data/mart/pnp_draws.json(145 行)。pnpSelfScore.DrawRow 的超集(结构兼容,可直接喂 streamMatches)。
 */
export type VerdictDrawRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 本站给这一轮抽选起的中文短名。**不是官方原文**,永不进引文。
   */
  label: string

  /**
   * 分数用的是哪把尺(各省的打分系统不同名);官方没说就是 null。
   */
  scale: string | null

  /**
   * 官方抽选页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 这一轮的种类(定向 / 全类别 / 专项)。各省叫法不同,原样带出。
   */
  kind: string

  /**
   * 抽选日期,`YYYY-MM-DD`。库里可能带时分秒,取前十位。
   */
  drawDate: string

  /**
   * 这一轮抽的哪条通道。
   */
  stream: string

  /**
   * 分数线。**官方没公布分数的轮次是 null,不折成 0** —— 那会让「没公布」看起来像「0 分就能进」。
   */
  score: number | null

  /**
   * 发了多少份邀请。同上,没公布就是 null。
   */
  invitations: number | null

  /**
   * 官方在这一轮上挂的备注。
   */
  note: string
}

/**
 * data/mart/designated_employers.json(3476 行)。
 * ⚠️ 数据缺口(2026-08-06 实测):mart 行**不带 url / fetched**(raw/pnp/nl-employers.json 里有,
 * 09_build_mart 没带出来)。所以「NL 有 N 家指定雇主申报过该 NOC」这条 supporting fact 目前挂不上 evidence ——
 * 本文件如实不挂,并在句子里点明出处是本站名录;url/fetched 一旦补进 mart,这里自动开始挂(可选字段)。
 */
export type DesignatedEmployerRow = {
  /**
   * 雇主名,官方名录上的原样。匹配前会先规范化(去掉 o/a、d/b/a 这类别名段)。
   */
  name: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 官方名录上写的地点。
   */
  location: string

  /**
   * 是不是科技类通道的名录(有的省把科技单列)。
   */
  isTech: boolean

  /**
   * 这一行来自哪份名录。同一个省可能有多份。
   */
  source: string

  /**
   * 逗号分隔的 NOC 码。
   */
  nocs: string

  /**
   * 官方名录页地址。有的名录只有 PDF,没有稳定地址,所以可选。
   */
  /**
   * 官方页地址。
   */
  url?: string

  /**
   * 本站抓取日。
   */
  fetched?: string
}

/**
 * 判定层的六张底表。一次拉全,判定核不碰库。
 */
export type VerdictData = {
  /**
   * 各省门槛条文。判定按 TEER 与 NOC 前缀挑最具体的那条。
   */
  requirements: ReqRow[]

  /**
   * 各省清单收录与排除。
   */
  occupations: OccupationRow[]

  /**
   * 历轮抽选记录。
   */
  draws: VerdictDrawRow[]

  /**
   * 各省打分系统的因素表。
   */
  scoreFactors: ScoreRow[]

  /**
   * EE 的两套官方分表(CRS 与 FSW67)。
   */
  eeGrid: EeRow[]

  /**
   * 指定雇主名录。**这一份是 NL 专用**(判定拿它当「NL 名录里有几家申报过这个 NOC」的分母),
   * 别拿它当全省名录用 —— 扩成四省会把那个分母一起改掉。
   */
  designatedEmployers: DesignatedEmployerRow[]
}

// =========================================================================
// 1c. 杠杆(PathwayVerdict 形状是定稿,不往里塞字段)
// =========================================================================

/**
 * 一根「杠杆」:改一件事能换来什么。**只说查得到的**,不预测。
 */
export type VerdictLever = {
  /**
   * 'teer-downgrade' | 'clb-boost'
   */
  key: string

  /**
   * 中文成句。**留着不动**:多处测试钉着这些措辞。
   */
  text: string

  /**
   * 受影响的通道 key(teer-downgrade:接 TEER 5 岗后判定会掉档的通道)
   */
  affected?: string[]

  /**
   * 查表得出的分数增量(clb-boost)
   */
  gains?: LeverGain[]

  /**
   * 拉这根杠杆的依据。同 `PathwayVerdict.reasons`,官方原句照带。
   */
  reasons?: VerdictReason[]
}


/**
 * data/mart/pnp_occupations.json(630 行)。type: 'ineligible' | 'indemand';appliesTo 空=该省全通道。
 */

/**
 * data/mart/pnp_draws.json(145 行)。pnpSelfScore.DrawRow 的超集(结构兼容,可直接喂 streamMatches)。
 */

/**
 * data/mart/designated_employers.json(3476 行)。
 * ⚠️ 数据缺口(2026-08-06 实测):mart 行**不带 url / fetched**(raw/pnp/nl-employers.json 里有,
 * 09_build_mart 没带出来)。所以「NL 有 N 家指定雇主申报过该 NOC」这条 supporting fact 目前挂不上 evidence ——
 * 本文件如实不挂,并在句子里点明出处是本站名录;url/fetched 一旦补进 mart,这里自动开始挂(可选字段)。
 */



/**
 * 一道闸的评估中间态:挑了哪几行、最终按哪行判、差多少。
 */
export type GateEval = {
  /**
   * 参与判定的门槛行(可能两行:ON 的 6 月 + 毕业生 3 月)
   */
  rows: ReqRow[]

  /**
   * 最终按哪一行判(最具体的那行)
   */
  picked: ReqRow | null

  /**
   * 官方要求的月数;挑不到行时是 null。
   */
  need: number | null

  /**
   * 他手上有的月数;没答就是 null。
   */
  have: number | null

  /**
   * null = 判不了
   */
  gap: number | null

  /**
   * 这道闸量的是不是「同雇主连续在职时长」(MB SWM),而不是同职业总经验。
   * **口径不同,句子就不同** —— 拿总经验那套话讲它,句子本身就是假的。
   */
  tenure: boolean

  /**
   * 条件判不了的行(缺槽)
   */
  unknownCond: ReqRow[]
  /**
   * 挑不到行的原因是**他没答职业**(库里有按 TEER 分档的行,只是不知道他哪一档)——
   *  这与「库里根本没有这条通道的经验门槛行」是两件事:前者他一步能补,后者是我们的窟窿。
   *  混成一件事,PE 这种只有一条 `applies_teer=0,1,2,3` 的省就会对没答题的人恒报「本站未收录」。
   */
  teerUnknown: boolean
}

/**
 * 一份岗对一条通道的粗筛结果(信号,**不是资格认定**)。
 */
export type JobPathwayRow = {
  /**
   * 这条通道的稳定标识。
   */
  key: string

  /**
   * `FED` 或两位省码。
   */
  province: string

  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 经验门槛月数(无条件档里最低的一档;op='none'=0)。null 仅当 availability≠ok
   */
  months: number | null

  /**
   * true = 门槛量的是「同雇主连续在职时长」(MB SWM),不是同职业总经验 —— 口径必须标出
   */
  tenure: boolean

  /**
   * 官方在需/定向清单点名本职业(信号,不是资格认定)
   */
  listedIn: boolean

  /**
   * 清单型硬伤:排除清单命中,或明文要求在清单而本职业不在(PE OID)
   */
  excludedByList: boolean

  /**
   * 这条通道的信息状态。**一条门槛行都没有 = 本站未收录**,不是「官方没有门槛」。
   */
  availability: Availability
}

// =========================================================================
// 2. 雇主侧判定
// =========================================================================

/**
 * 雇主侧的事实(公司行 + 名录命中行)。多数字段查不到是常态。
 */
export type EmployerFacts = {
  /**
   * 成立年份。**多数雇主查不到**(08-10 实测三路皆无源,已结案)—— 查不到就是 null,判定落 unknown。
   */
  foundedYear: number | null

  /**
   * 在册状态:现时仅透传展示,判定不吃它(§1 红线只列年限/雇员数/营业额三项)
   */
  registryStatus: string | null
  /**
   * 雇员数估计。同上,多数查不到 —— **估计值不许当官方数用**,措辞层要说清它是估的。
   */
  staffEst: number | null

  /**
   * 估算来源(懒查 AI / Wikidata),只用于标注证据性质,不进判定
   */
  staffEstSrc: string | null

  /**
   * 'public' = 公共部门,直接整体旁路,不与私企同一套门槛硬判
   */
  sector: string | null
}

/**
 * 这条依据的来源:官方 / 估计 / 查不到。**估计的不许当官方说。**
 */
export type EvidenceKind = 'official' | 'estimate' | 'missing'

/**
 * 单项判定。`unknown` = 判不了,不是不满足。
 */
export type ItemVerdict = 'pass' | 'fail' | 'unknown'

/**
 * 雇主判定量哪一样。
 */
export type EmployerVerdictFactor = 'years' | 'staff'

/**
 * 雇主判定里的一项(成立年数 / 雇员数 / 营业额)。
 */
export type EmployerVerdictItem = {
  /**
   * 这一项量的是雇主的什么:成立年数 / 雇员数 / 营业额。
   */
  factor: EmployerVerdictFactor | 'revenue'
  /**
   * 这一项的判定。`unknown` = 判不了,**不是「不满足」**。
   */
  verdict: ItemVerdict

  /**
   * 官方门槛(来自 pnp_requirements,恒 official,已换算成统一单位)
   */
  need: number | null

  /**
   * 公司侧的值
   */
  have: number | null

  /**
   * verdict='fail' 才有:差多少(need - have)
   */
  short: number | null
  /**
   * 阈值的单位,官方原样。
   */
  unit: string

  /**
   * 公司侧这个值的证据性质;have=null 时恒 'missing'
   */
  evidence: EvidenceKind
}

/**
 * 雇主侧的判定。`unknown` **不是「不满足」**,是我们查不到。
 */
export type EmployerVerdict = {
  /**
   * 整体判定。`public` = 上市公司这类公开信息足够、不必逐项核。
   * `unknown` **不是「不满足」** —— 是我们查不到。
   */
  state: 'met' | 'short' | 'unknown' | 'public'

  /**
   * 参与整体判定的项(年限/雇员数),只含该省真收录了门槛的
   */
  items: EmployerVerdictItem[]

  /**
   * 营业额:恒旁证,不进 state(§1 红线②)
   */
  revenue: EmployerVerdictItem | null

  /**
   * state='short' 时点名哪几项没达标
   */
  failed: EmployerVerdictFactor[]

  /**
   * state='unknown' 时点名判不了的是哪几项(空=该省压根没收录雇主侧门槛)
   */
  missing: EmployerVerdictFactor[]
}

// =========================================================================
// 3. 名录匹配
// =========================================================================

/**
 * 名录匹配的结果:命中几家、是哪一家。
 */
export type DesignationMatch<T> = {
  /**
   * 唯一命中的那一行;**null = 没认出(count=0)或多配(count≥2,不点名法人)**
   */
  row: T | null

  /**
   * 完全匹配的法人数:0 / 1 / N
   */
  count: number

  /**
   * 命中行的名录名(AIP…);count=0 或多配行 source 不一致 → ''
   */
  source: string
}

// =========================================================================
// 4. 三合一判定卡
// =========================================================================

/**
 * 一份 offer 的事实(jobs 行,08_score 口径;调用方按 API 侧现成读法喂进来,本层不查库)
 */
export type TripleJob = {
  /**
   * 岗位在本站的主键。
   */
  id: number

  /**
   * 岗位标题,雇主写的原样。
   */
  title: string

  /**
   * 五位职业码。**未分类的岗是 null** —— 不硬塞一个码,塞错了后面每条判定都在答另一个人的问题。
   */
  noc: string | null

  /**
   * 官方 NOC 职业名(noc_descriptions.title)——「代码不裸奔」,params 里跟着 noc 一起走
   */
  nocName: string | null

  /**
   * 这个职业的 TEER。门槛按它挑行;没分类就是 null。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 城市。大渥太华的社区统一归 Ottawa,区另存(见 `lib/location`)。
   */
  city: string

  /**
   * 08_score 口径的粗筛信号(≠ 资格认定)
   */
  pnpEligible: boolean

  /**
   * 命中的本站具名清单短名(pnp_occupations.label,如「NS 紧缺空缺」);'' = 没命中具名清单
   */
  pnpStream: string

  /**
   * 命中的 EE 类别定向抽选(如医疗、技工);没命中是空串。
   */
  eeCategory: string

  /**
   * 08_score 口径:这份岗在大西洋四省且职业不在排除清单。**不代表雇主被指定**(那是 designation)
   */
  aip: boolean

  /**
   * 雇佣期限(长期 / 定期)。官方门槛里有「必须是长期全职」这类条款,判定要读它。
   */
  employmentTerm: string

  /**
   * 工时(全职 / 兼职)。同上。
   */
  employmentHours: string
}

/**
 * 雇主事实(companies 行 + 名录命中行)
 */
export type TripleCompany = {
  /**
   * 公司在本站的主键。
   */
  id: number

  /**
   * 公司名,岗位上写的原样。名录匹配前会先规范化。
   */
  name: string

  /**
   * employerVerdict 的入参形状,原样复用
   */
  facts: EmployerFacts

  /**
   * designated_employers 名录里**唯一**命中的行(口径=designationMatch 的完全匹配,见该文件抬头)。
   * **null = 没认出 或 多配**,两种情形由 designationMatches 区分:
   *   0 → 本站没在名录里认出这家(认不出 ≠ 官方没指定)→ 判定落 unknown,不写「未被指定」
   *   ≥2 → 同名/同链法人多家(连锁加盟:20 家 `… o/a Tim Hortons` 全是合法完全匹配),
   *        「哪一家是你这份岗的雇主」不可证 → 只报家数不点名(tv.emp.designatedMulti)
   */
  designation: DesignatedEmployerRow | null

  /**
   * 名录里完全匹配到的法人数(0 / 1 / N);designation 为 null 时靠它区分「没认出」与「多配」
   */
  designationMatches: number

  /**
   * 多配时仍说得清是哪个名录(AIP…);没认出或多配行 source 不一致 → ''
   */
  designationSource: string

  /**
   * companies.lmia_nocs(#286,近两年窗口的获批职业拆分);null = 该列未回填
   */
  lmiaNocs: Record<string, number> | null
}

/**
 * 档案:pathVerdict 的 VerdictProfile + 判定卡多要的三个槽(时间窗 / 换省对照 / AIP 资金档)
 */
export type TripleProfile = VerdictProfile & {
  /**
   * 当前工签/学签剩余月数(PGWP 倒数);null = 未答
   */
  permitMonthsLeft: number | null

  /**
   * 档案填的目标省(换省对照行);[] = 未答
   */
  targetProvinces: string[]

  /**
   * 随行家庭人数(AIP 资金档 / BC 最低收入表);null = 未答
   */
  familySize: number | null
}

/**
 * 三道闸:职业 / 雇主 / 人。
 */
export type TripleGate = 'occupation' | 'employer' | 'person'

/**
 * design §5:三关事实 free,比路结论+差值+下一步 paid
 */
type TripleTier = 'free' | 'paid'

/**
 * pass=达标 / gap=差某项 / excluded=硬伤 / unknown=判不了(缺槽或库缺行) / info=摆事实不判定
 */
type TripleState = 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'

/**
 * 判定卡上的一行。
 */
export type TripleRow = {
  /**
   * 这一行属于三道闸的哪一道:职业 / 雇主 / 人。
   */
  gate: TripleGate

  /**
   * 免费层还是付费层。免费层给事实与结论,付费层给「怎么办」。
   */
  tier: TripleTier

  /**
   * i18n 键(批D 配三语文案);本层不写死任何 UI 句子
   */
  key: string
  /**
   * 填进三语文案的变量。**只放值,不放句子** —— 句子在 `lib/i18n`。
   */
  params: Record<string, string | number | boolean | string[] | undefined>

  /**
   * 这一行的判定态。`info` 是纯陈述(既不是通过也不是卡住)。
   */
  state: TripleState

  /**
   * 英文调试串(金标可读用),**不是** UI 文案
   */
  label: string

  /**
   * 判不了时点名缺哪个档案槽(TripleProfile 的字段名)
   */
  followups?: string[]

  /**
   * 官方原句:只来自数据行,永不手写
   */
  quote?: string
  /**
   * 出处。**没有出处的判定不许见客。**
   */
  evidence?: Evidence
}

/**
 * 比路一行:为什么这条线在比路里 + pathVerdict 给它的裁决
 */
export type TripleCompareRole = 'current' | 'aip' | 'target'

/**
 * 通道对照表的一行。
 */
export type TripleCompareRow = {
  /**
   * 这条通道的稳定标识。
   */
  key: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 通道名。
   */
  stream: string

  /**
   * 这一行在对照表里的身份:他现在这份岗 / AIP 那条 / 目标那条。
   */
  role: TripleCompareRole

  /**
   * 判定结论,原样取自 `pathVerdict`,本层不重判。
   */
  verdict: PathwayVerdict['verdict']

  /**
   * 「offer 到手后还要攒多久」的档位,同上不重算。
   */
  tier: PathwayVerdict['tier']

  /**
   * 这条通道的信息状态。四态不许合并。
   */
  availability: Availability

  /**
   * pathVerdict 返回序里的名次(排序语义原样复用,本层不重排)
   */
  rank: number

  /**
   * tier 最小的可判通道(并列时多条同时为 true —— 并列就说并列,不替用户挑)
   */
  fastest: boolean
}

/**
 * 一句可复述的结论(设计 PR评估页三步重设计-20260812.md §2「跨步规矩 B3」)。
 *
 * 🔴 **由确定性层拼,不新增判定、不让 LLM 合成**(工具层红线)。原料只有两样,都是这张卡已经算出来的:
 *    ① 职业关的官方排除清单命中(硬伤);② `pathVerdict` 对**这份岗所在省**那几条通道的裁决。
 *    「差哪一项」的次序共用 pathVerdict 的 `blockCost`(offer 最好拆 → … → 加拿大学历最难),
 *    不另立一把尺子 —— 裁决、排序、结论句三处同源。
 * 🔴 免费/付费口径**没有变**:这几条通道的裁决在同一页的「你的初步方案」上本来就是免费的,
 *    这里只是把「这份岗所在省那条」摘出来说成一句人话。逐项差值(差几分/差几个月)仍在付费位。
 */
type TripleConclusionKind = 'ok' | 'blocked' | 'needs-info' | 'excluded' | 'not-collected'

/**
 * 一句可复述的结论。
 */
export type TripleConclusion = {
  /**
   * 结论的种类。`not-collected` 是**我们的缺口**,不是「走不通」。
   */
  kind: TripleConclusionKind

  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string

  /**
   * 填进三语文案的变量。
   */
  params: Record<string, string | number | boolean | string[] | undefined>

  /**
   * 结论锚在哪条通道(能走的那条 / 被卡住的那条);not-collected 时为空
   */
  pathway?: string

  /**
   * blocked 时:最难拆的那道闸(offer / statusInCanada / credentialCanada / language / selfEmployed)
   */
  gate?: string

  /**
   * 英文调试串,**不是** UI 文案
   */
  label: string
}

/**
 * 一整张三合一判定卡。
 */
export type TripleCard = {
  /**
   * 这张卡是给哪份岗算的。
   */
  jobId: number

  /**
   * 一句可复述的结论(见 TripleConclusion)
   */
  conclusion: TripleConclusion

  /**
   * 五位职业码;未分类的岗是 null。
   */
  noc: string | null

  /**
   * 官方职业名 —— **代码不裸奔**,码走到哪儿人话跟到哪儿。
   */
  nocName: string | null

  /**
   * 这个职业的 TEER。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 三道闸逐行的判定。顺序即呈现序,本层定死,前端不重排。
   */
  rows: TripleRow[]

  /**
   * 通道对照表(他现在这条 / AIP / 目标)。
   */
  compare: TripleCompareRow[]

  /**
   * 原件输出照带,批D 要渲染细项(reasons / items)时不必二次查库
   */
  employer: EmployerVerdict

  /**
   * 各通道的判定原件。同上照带,免得渲染细项时二次查库。
   */
  pathways: PathwayVerdict[]

  /**
   * 全卡去重后的缺槽点名
   */
  followups: string[]

  /**
   * 整张卡的信息状态。**四态不许合并** —— `not-collected` 是我们的缺口,不是「走不通」。
   */
  availability: Availability
}

/**
 * 一条通道**本站收录的门槛行**覆盖了哪几档 TEER(按 pnp_requirements.appliesTeer 聚合)。
 * 🔴 这是**收录范围的下界**,不是官方受理范围的全集 —— 所以它只有一个用途:
 *    否掉粗筛的对错符号(「我们有行的那条通道并不收这一档」),**永不**拿来下「你不行」的结论。
 *    (开放世界的表做封闭世界推理,正是 2026-08-12 判定口径根治要根治的那个病。)
 */
export type TeerScope = {
  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 这条通道认哪几档 TEER。
   */
  teers: number[]

  /**
   * 得出这个档位的那一行门槛条文 —— 出处跟着走,不另起。
   */
  row: ReqRow
}

/**
 * 该省的**具名(定向)清单**:一张清单一条,带它绑的官方通道名与清单里的职业数。
 */
export type NamedList = {
  /**
   * 本站中文短名。**不是官方原文**,永不进引文。
   */
  label: string

  /**
   * 官方清单名。
   */
  stream: string

  /**
   * 这份清单上有多少个职业。
   */
  count: number

  /**
   * 官方清单页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string
}

// =========================================================================
// 5. 三合一接线
// =========================================================================

/**
 * 下行行:免费行给全,付费行对非 Pro 只留 gate/tier/key
 */
export type TripleWireRow = {
  /**
   * 这一行属于三道闸的哪一道。接线层发出去时已经是字符串。
   */
  gate: string
  /**
   * 免费层还是付费层。
   */
  tier: string
  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string
  /**
   * 这一行对当前用户锁着(付费层给未订阅的人)。**锁着也要让他看见有这一行** ——
   * 藏起来他就不知道自己少了什么。
   */
  locked?: true
  /**
   * 判定态。锁着的行不下发它。
   */
  state?: string
  /**
   * 填进三语文案的变量。
   */
  params?: Record<string, string | number | boolean | string[] | undefined>
  /**
   * 官方原句。**只来自数据行,永不手写。**
   */
  quote?: string
  /**
   * 出处。发给前端时只留这三格 —— 节号与生效日前端用不上。
   */
  evidence?: TripleWireEvidence
  /**
   * 判不了时点名缺哪几个档案槽。只装「他一步能补的」。
   */
  followups?: string[]
}

/**
 * 发给前端的整张卡。
 */
export type TripleWire = {
  /**
   * 恒为 true。写成字面量类型,好让调用方靠它和错误体做联合窄化。
   */
  ok: true

  /**
   * 这张卡是给哪份岗算的。
   */
  jobId: number

  /**
   * 五位职业码;未分类的岗是 null。
   */
  noc: string | null

  /**
   * 官方职业名(英文)。
   */
  nocName: string | null

  /**
   * NOC 职业名的中译(`noc_descriptions.title_zh`)。
   *
   * #326:zh 界面「职位名」瓦片的主文案用它,帖面英文原名降成灰注 ——
   * 帖面标题没有逐帖译文,而职业官方名是库里现成的三语,能用人话就别让代码裸奔。
   */
  nocTitleZh: string | null

  /**
   * 同上的韩译。
   */
  nocTitleKo: string | null

  /**
   * 这个职业的 TEER。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 一句可复述的结论,原样取自判定卡。
   */
  conclusion: TripleCard['conclusion']

  /**
   * 整张卡的信息状态。接线层发出去时已经是字符串。
   */
  availability: string

  /**
   * 这次请求登没登录。**匿名一个字都不存**,但要据此决定给不给建档入口。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。付费层的行只对它开。
   */
  pro: boolean

  /**
   * 档案填没填过。没填时判定多半落 needs-info,前端据此引导去答题。
   */
  hasProfile: boolean

  /**
   * 逐行的判定,已经按登录态与付费态裁过。
   */
  rows: TripleWireRow[]
}

// 引擎答案(toEngineAnswers 的形状)。匿名用户没有服务端档案,把本地答案带上来即可 ——
// **付费闸与它无关**:锁不锁看的是登录用户是不是 Pro,答案只决定「判得出来还是判不了」。
/**
 * 前端回传的答案。**不可信**,进判定前一律收窄。
 */
export type ClientAnswers = Record<string, Cell | Cell[]> | null

// =========================================================================
// 6. 案例事实档
// =========================================================================

/**
 * 一个案例的事实档。
 */
export type CaseAnswer = {
  /**
   * 他点名问的那条通道(中介推的那个省)—— 摆在最前面
   */
  asked: PathwayVerdict | null

  /**
   * 其余通道按「offer 到手后还需积累多久」分档,由易到难
   */
  tiers: CaseTier[]

  /**
   * 现在走不通的(判定核给 excluded,必带官方原句)
   */
  excluded: PathwayVerdict[]

  /**
   * 第一步:这个职业「提供带训 / 不要经验」的在招岗按省分布
   */
  trainable: TrainableRow[]
  /**
   * 全部省加起来多少个。**0 也要给出来** —— 「一个都没有」本身就是答案。
   */
  trainableTotal: number
  /**
       各省该职业的在招岗数(n=全部,t=其中标了带训)。2026-08-11 Frank:
      「每个省的推荐不单要看时长条件,还有竞争程度和工作机会」——
      **工作机会先落地**:这个数全国同一口径、来自本站自己的库、天天更新,同档内拿它排序。
      竞争程度暂不进排序:各省公布口径不同(AB 给池子+名额、BC 只给分数段、SK/MB/ON 只给名额),
      硬凑一个跨省可比的「几人抢一个」= 编数(见 STATUS 记账②,池子公不公布还没查证)。
      */
  openings: Record<string, OpeningCount>
  /**
       每个省官方公布的运营数字(名额/提名/拒签/池子)—— 只按时长排序会假设各省一样挤,
      而这几个数正是「挤不挤」。各省公布的口径不同,**不硬凑成一个统一比值**,谁公布什么就摆什么。
      */
  ops: Record<string, OpsFacts>
}

/**
 * 官方运营数据(池子、名额、年初至今)。**官方不公布的一律留空,不猜。**
 */
export type OpsFacts = {
  /**
   * 本年名额
   */
  allocation?: number

  /**
   * 已提名(年内至今)
   */
  nominated?: number

  /**
   * 已拒签(年内至今)
   */
  refused?: number

  /**
   * 已发邀请
   */
  invited?: number

  /**
   * 已收到申请
   */
  received?: number

  /**
   * 池子里有多少人(AB 实时 / BC 分数段 / MB 年报年度快照)
   */
  poolTotal?: number
  /**
       池子那个数的期次。**AB 是实时的、MB 是年报里的年末快照**——不标期次就会被读成一样新鲜,
      而两者差着一年。有期次就用带期次的那句文案(2026-08-11 接 MB 年报 §10 时补)。
      */
  poolPeriod?: string
  /**
       期间**按指标各记各的**:名额是全年(2026),提名/拒签是年内至今(2026 Jan-Jun)——
      共用一个 period 会把上半年的数标成全年的(2026-08-11 实撞)
      */
  allocPeriod?: string
  /**
   * 年初至今那个数的统计期,官方原样。
   */
  ytdPeriod?: string
  /**
   * 官方页地址。
   */
  url?: string
}

// =========================================================================
// 7. 案例清单
// =========================================================================

/**
 * 案例清单里的一条。
 */
export type CaseEntry = {
  /**
   * 案例的稳定标识,进 URL。
   */
  id: string

  /**
   * 处境页 slug —— **这里是 slug 的唯一来源**:服务端按它建出页白名单,
   * 决策页按它决定给不给「完整案例」钮。填了但事实层没跟上 = 死链,
   * 所以两边共用这一个字段,不各写一份。
   *
   * 空串 = 还没做处境页,只在清单里露一行。
   */
  page: string
}

// =========================================================================
// 8. 上面几处从内联拆出来的形状(内联对象挂不上注释,拆出来才说得清)
// =========================================================================

/**
 * 案例事实档里的一档:同一个「offer 后还要攒多久」的通道归一堆。
 */
export type CaseTier = {
  /**
   * 档位:0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月。
   */
  tier: 0 | 1 | 2 | 3

  /**
   * 这一档里的通道,顺序即判定核的返回序,本层不重排。
   */
  rows: PathwayVerdict[]
}

/**
 * 「提供带训 / 不要经验」的在招岗按省一行。
 */
export type TrainableRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 这个省有多少个。**0 也要给出来** —— 「这个省一个都没有」本身就是答案。
   */
  n: number
}

/**
 * 一个省的在招计数。
 */
export type OpeningCount = {
  /**
   * 在招总数。
   */
  n: number

  /**
   * 其中「提供带训 / 不要经验」的那部分。
   */
  t: number
}

/**
 * 拉一根杠杆能换来的分数增量(clb-boost 那类)。
 */
export type LeverGain = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 哪一套打分制 —— 各省的尺不同,拿别人的尺量就是错的。
   */
  system: string

  /**
   * 现在这一档的分。
   */
  from: number

  /**
   * 拉完杠杆那一档的分。
   */
  to: number

  /**
   * 差额。**查表得出,不是算出来的** —— 官方分表里两档相减。
   */
  delta: number

  /**
   * 出处:分表那一页。
   */
  evidence: Evidence
}

/**
 * 一条通道的打分结果(有打分制的省才有)。
 */
export type PathwayScore = {
  /**
   * 哪一套打分制 —— 各省的尺不同,名字要跟着分走。
   */
  system: string

  /**
   * 按他的档案查表得出的分。
   */
  value: number

  /**
   * 这套制度的满分;官方没说就是 null。
   */
  ceiling: number | null

  /**
   * 拿来对照的那条线(最近一轮抽选的分数线);没有可对照的轮次就是 null。
   */
  refLine: number | null

  /**
   * 那条线是哪一轮 —— **不报「你差几分」而报「和哪一轮比」**,因为下一轮的线不可预测。
   */
  refLabel: string

  /**
   * 出处:那一轮的抽选页。
   */
  evidence: Evidence

  /**
   * 对照的那一轮属于哪条通道(BC 按通道分别设线;拿别的通道的线比就是错的对照)。
   * 没有可对照的轮次就是 null。
   */
  refStream?: string | null

  /**
   * 这一分是**下界**:加分项按不勾算(用户没勾过),真上界看 ceiling。
   *
   * 2026-08-20 补声明:老 `lib/verdict` 是靠对象展开把它塞进来的,类型上从来没有这一格,
   * 于是 `/api/ruling/profile` 只能拿 `as { partial?: boolean }` 把它读出来。
   */
  partial?: true
}

/**
 * 发给前端的那份出处。**比内部的 `Evidence` 少两格** —— 节号与生效日前端用不上,
 * 少发一格就少一格被误用的机会。
 */
export type TripleWireEvidence = {
  /**
   * 官方页地址。
   */
  url?: string

  /**
   * 本站抓取日。
   */
  fetched?: string

  /**
   * 官方原文 / 清单名。
   */
  label?: string
}

/**
 * `pathLevers` 的场景参数 —— 「问哪一档」,不是官方数字。
 */
export type PathLeverOpts = {
  /**
   * 语言目标档(默认 8:雅思一次提两档是最常见的可行目标)。
   *
   * **分值仍全部查表** —— 这里只决定「拿哪一档去问」,一分都不在这儿编。
   */
  clbTarget?: number

  /**
   * 「换一个 TEER 更低的 NOC」这根杠杆要试的那个 NOC;不试就不传。
   */
  teerDowngradeNoc?: string
}

/**
 * 一行门槛条文配上它算出来的门槛月数(联邦三子通道并列时靠它挑最低的那条)。
 */
export type ReqMonths = {
  /**
   * 那一行门槛条文。
   */
  r: ReqRow

  /**
   * 这一行要求的月数(算不出来的行在上游已被滤掉)。
   */
  m: number
}

/**
 * 一个还没补上的缺口:差多少个月、以及**它是哪一类**。
 *
 * 类别决定起算点:经验 / 在职类要等到「毕业拿到工签之后」才开始走(tierBasis,#319),
 * 居住类不用 —— 搬过去当天就在计时。只记一个 max 数字时这个区别就丢了。
 */
export type TierGap = {
  /**
   * 这个缺口还差多少个月。
   */
  months: number

  /**
   * 缺的是经验 / 在职,还是居住。
   */
  kind: 'work' | 'residence'
}

/**
 * 一道闸「问哪一样东西」—— `lib/gateManifest` 那头的形状,本域只用得着这一格。
 */
export type GateAsks = {
  /**
   * 这道闸问的是哪一样(如 workPermit);null = 不细分。
   */
  asks: string | null
}

/**
 * 一行官方分值行配上从它标签里解析出来的 CLB 门槛(ON 语言杠杆按它挑档)。
 */
export type FactorThreshold = {
  /**
   * 那一行官方分值行。
   */
  f: ScoreRow

  /**
   * 从它的标签里解析出来的 CLB 门槛(解析不出的行在上游已被滤掉)。
   */
  th: number
}

/**
 * 一条通道的裁决 + 排序要用的三个数(名次在入表时算好,比较器只比数)。
 */
export type RankedVerdict = {
  /**
   * 那条通道的裁决。
   */
  v: PathwayVerdict

  /**
   * 它在注册表里的原序 —— 前面全打平时按它排,保证稳定。
   */
  i: number

  /**
   * 最难拆的那道障碍(见 `RANK`)。
   */
  obstacle: number

  /**
   * offer 到手后还要等几档;判不了的记 9(沉底)。
   */
  tier: number
}

/**
 * 一行职业级事实 + 排序要用的三个数。
 */
export type RankedJobRow = {
  /**
   * 那一行职业级事实。
   */
  row: JobPathwayRow

  /**
   * 它在注册表里的原序。
   */
  i: number

  /**
   * 档:清单排除 2 / 门槛未收录 1 / 可判的 0。
   */
  rank: number

  /**
   * 门槛月数;门槛未收录的记 99(沉底)。
   */
  months: number
}

/**
 * 一个因素**不走官方档位匹配**、直接定死的得分。
 *
 * 岗位维度(BC 时薪)与用户在分值卡上直选的档位走这条,scoreProvince 拿它当 override。
 */
export type PickedFactor = {
  /**
   * 这一项记多少分。
   */
  pts: number

  /**
   * 记分的依据:官方档位标签,或时薪这类规则算出来的值。
   */
  matched: string

  /**
   * 分从哪来 —— 这条恒为岗位维度。
   */
  source: 'job'
}

/**
 * 「纯规则」因素的参数(BC 时薪:每整元 1 分),官方把它写成 JSON 串放在分值行里。
 */
export type WageRule = {
  /**
   * 低于这个时薪一分不给。
   */
  floorAt?: number

  /**
   * 高于这个时薪不再往上加。
   */
  capAt?: number
}

/**
 * 覆盖官方档位匹配的一格分(offer 这类由档案 / 勾选直接定下来的)。
 */
export type ScoreOverride = {
  /**
   * 这一项记多少分。
   */
  pts: number

  /**
   * 记分的依据(官方档位标签)。
   */
  matched: string

  /**
   * 分从哪来:档案推出来的 / 岗位维度 / 用户自己勾的。
   */
  source: 'profile' | 'job' | 'tick'
}

/**
 * `worstGap` 的入参。
 */
export type WorstGapIn = {
  /**
   * 这条通道攒下的全部缺口。
   */
  gaps: TierGap[]
}

/**
 * `worstGap` 的返回:最大的那个;一个缺口都没有则 null。
 */
export type WorstGapOut = TierGap | null

/**
 * `foldTriState` 的入参。
 */
export type FoldTriStateIn = {
  /**
   * 有没有硬伤(清单判死 或 分数鸿沟)。
   */
  excluded: boolean

  /**
   * 经验闸的评估 —— 挑没挑出行、缺口算不算得出。
   */
  gate: GateEval

  /**
   * 缺的槽,有一个就判不了。
   */
  missingSlots: string[]

  /**
   * 门槛清单里有判不了的闸。
   */
  manifestUnknown: boolean
}

/**
 * `foldTriState` 的返回:三态之一。
 */
export type FoldTriStateOut = PathwayVerdict['verdict']

/**
 * `availabilityOf` 的入参。
 */
export type AvailabilityOfIn = {
  /**
   * 有没有硬伤 —— 有硬伤时**不改** availability。
   */
  excluded: boolean

  /**
   * 经验闸的评估;`teerUnknown` 说明行是有的、缺的是他那一格答案。
   */
  gate: GateEval

  /**
   * 门槛清单里有条文缺的闸。
   */
  manifestNoSource: boolean
}

/**
 * `tierBasisOf` 的入参。
 */
export type TierBasisOfIn = {
  /**
   * 判定档案 —— 看处境与许可。
   */
  p: VerdictProfile

  /**
   * 有没有硬伤。
   */
  excluded: boolean

  /**
   * 下发的 tier;库缺行被抹成 null 的那种不谈起算点。
   */
  outTier: PathwayVerdict['tier']

  /**
   * 最大的那个缺口 —— 只有经验/在职类才吃这条。
   */
  worst: TierGap | null
}

/**
 * `tierBasisOf` 的返回:从今天算,还是毕业拿到工签之后算。
 */
export type TierBasisOfOut = PathwayVerdict['tierBasis']

/**
 * `tierFullTimeOf` 的入参。
 */
export type TierFullTimeOfIn = {
  /**
   * 最大的那个缺口。
   */
  worst: TierGap | null

  /**
   * 经验闸的评估 —— 判据取它挑中那一行的官方原文。
   */
  gate: GateEval
}

/**
 * `harderBlock` 的入参。
 */
export type HarderBlockIn = {
  /**
   * 新来的那道闸。
   */
  gate: GateName

  /**
   * 目前记着的那道;还没记上则 undefined。
   */
  blockedBy: PathwayVerdict['blockedBy']
}

/**
 * `harderBlock` 的返回:更难拆的那一道。
 */
export type HarderBlockOut = PathwayVerdict['blockedBy']

/**
 * `localExperienceHolds` 的入参。
 */
export type LocalExperienceHoldsIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 本省省码 —— 条件里的「本省」指的就是它。
   */
  province: string
}

/**
 * `localExperienceHolds` 的返回:成立 / 不成立;没答现居省则 null。
 */
export type LocalExperienceHoldsOut = boolean | null

/**
 * `recentGraduateHolds` 的入参。
 */
export type RecentGraduateHoldsIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 本省省码 —— 条件里的「本省」指的就是它。
   */
  province: string
}

/**
 * `recentGraduateHolds` 的返回:成立 / 不成立;缺学习省或学制年数则 null。
 */
export type RecentGraduateHoldsOut = boolean | null

/**
 * `otherProvinceGraduateHolds` 的入参。
 */
export type OtherProvinceGraduateHoldsIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 本省省码 —— 条件里的「本省」指的就是它。
   */
  province: string
}

/**
 * `otherProvinceGraduateHolds` 的返回:成立 / 不成立;没答学习省则 null。
 */
export type OtherProvinceGraduateHoldsOut = boolean | null

/**
 * `mostSpecificRows` 的入参。
 */
export type MostSpecificRowsIn = {
  /**
   * 条件已经判过、确定适用的那些门槛行。
   */
  applicable: ReqRow[]
}

/**
 * `mostSpecificRows` 的返回:带条件的那些;一条都没有则原样回。
 */
export type MostSpecificRowsOut = ReqRow[]

/**
 * `lowestMonthsRow` 的入参。
 */
export type LowestMonthsRowIn = {
  /**
   * 入池的那些门槛行。
   */
  pool: ReqRow[]
}

/**
 * `lowestMonthsRow` 的返回:门槛最低的那一行;池子空则 null。
 */
export type LowestMonthsRowOut = ReqRow | null

/**
 * `haveMonthsOf` 的入参。
 */
export type HaveMonthsOfIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 挑中的那一行 —— **量哪一把尺子由它决定**。
   */
  picked: ReqRow | null

  /**
   * 挑中的那行是不是同雇主在职门槛。
   */
  tenure: boolean

  /**
   * 这条通道认不认自雇经历。
   */
  selfEmpExcluded: boolean
}

/**
 * `haveMonthsOf` 的返回:已攒月数;缺槽判不了则 null。
 */
export type HaveMonthsOfOut = number | null

/**
 * `gridMatchesStream` 的入参。
 */
export type GridMatchesStreamIn = {
  /**
   * 该省官方分值表的表头那一行(它的 system 会自报通道名)。
   */
  head: ScoreRow

  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec
}

/**
 * `hasRequiredSlots` 的入参。
 */
export type HasRequiredSlotsIn = {
  /**
   * 要交给官方档位匹配的那几个因素名。
   */
  only: Set<string>

  /**
   * 判定档案。
   */
  p: VerdictProfile
}

/**
 * `ownTicksOf` 的入参。
 */
export type OwnTicksOfIn = {
  /**
   * 判定档案 —— 只用它的 scoreTicks。
   */
  p: VerdictProfile

  /**
   * 本省省码。
   */
  province: string
}

/**
 * `ownTicksOf` 的返回:本省的勾选表。
 */
export type OwnTicksOfOut = Record<string, boolean>

/**
 * `factorNames` 的入参。
 */
export type FactorNamesIn = {
  /**
   * 该省的全量官方分值行。
   */
  all: ScoreRow[]
}

/**
 * `factorNames` 的返回:因素名,原序、不重复。
 */
export type FactorNamesOut = string[]

/**
 * `parseWageRule` 的入参。
 */
export type ParseWageRuleIn = {
  /**
   * 那一行的规则串(官方写成 JSON 放在行里);没有则空。
   */
  rule: string | null
}

/**
 * `wagePoints` 的入参。
 */
export type WagePointsIn = {
  /**
   * 官方那一行规则行(门槛、封顶、上限都写在它自己身上)。
   */
  rule: ScoreRow

  /**
   * 他填的时薪。
   */
  wage: number
}

/**
 * `gridRowFor` 的入参。
 */
export type GridRowForIn = {
  /**
   * 该省的全量官方分值行。
   */
  all: ScoreRow[]

  /**
   * BC 工作地区那几行 —— 它按下标取,不按 seq。
   */
  areaRows: ScoreRow[]

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 要估分的那条通道。
   */
  spec: PathwaySpec

  /**
   * 因素名。
   */
  name: string
}

/**
 * `gridRowFor` 的返回:认中的那一行;他也没答则 null。
 */
export type GridRowForOut = ScoreRow | null

/**
 * 一条通道的三态裁决。
 *
 * 下面这几个都是 `PathwayVerdict` 上的字段形状 —— 它们在签名与中间态里反复出现,
 * 起了名才挂得上注释,也免得 `PathwayVerdict['x']` 这种索引访问在文件里抄二十几遍。
 */
export type Verdict = PathwayVerdict['verdict']

/**
 * offer 到手后还要等几档(0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月);判不了则 null。
 */
export type Tier = PathwayVerdict['tier']

/**
 * 这段等待从什么时候起算 —— 今天,还是毕业拿到工签之后(#319)。
 */
export type TierBasis = PathwayVerdict['tierBasis']

/**
 * 最难拆的那道障碍;一道都不差则 undefined。
 */
export type BlockedBy = PathwayVerdict['blockedBy']

/**
 * 这条通道的估分;接不上一律 undefined(**不编**)。
 */
export type MaybeScore = PathwayVerdict['score'] | undefined

/**
 * `askableSlot` 的入参。
 */
export type AskableSlotIn = {
  /**
   * 官方分值表里的因素名。
   */
  name: string
}

/**
 * `askableSlot` 的返回:那一槽的名字;不在可答清单里则 null。
 */
export type AskableSlotOut = keyof GridProfile | null

/**
 * `quoteOfOcc` 的入参。
 */
export type QuoteOfOccIn = {
  /**
   * 那一行职业清单。
   */
  o: OccupationRow
}

/**
 * `totalExpMonths` 的入参。
 */
export type TotalExpMonthsIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile
}

/**
 * `totalExpMonths` 的返回:总经验月数;两格缺一格则 null。
 */
export type TotalExpMonthsOut = number | null

/**
 * `teerScopes` 的入参。
 */
export type TeerScopesIn = {
  /**
   * 该省的全量门槛行。
   */
  provReqs: ReqRow[]
}

/**
 * `teerScopes` 的返回:一条通道一项。
 */
export type TeerScopesOut = TeerScope[]

/**
 * 攒 `teerScopes` 时的中间态(一条通道攒到哪儿了)。
 */
export type TeerScopeAcc = {
  /**
   * 这条通道收录到的 TEER 档。
   */
  teers: Set<number>

  /**
   * 引哪一行的原句 —— 覆盖面最宽的那行。
   */
  row: ReqRow

  /**
   * 上面那行覆盖了几档(拿来比谁更宽)。
   */
  span: number
}

/**
 * `namedLists` 的入参。
 */
export type NamedListsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全量职业清单行。
   */
  occs: OccupationRow[]
}

/**
 * `namedLists` 的返回:每张具名清单一项。
 */
export type NamedListsOut = NamedList[]

/**
 * `occExcludedRows` 的入参。
 */
export type OccExcludedRowsIn = {
  /**
   * 这个岗位(职业、省份、粗筛结论都在它身上)。
   */
  job: TripleJob

  /**
   * 该职业在本省命中的清单行。
   */
  mine: OccupationRow[]

  /**
   * 职业的人话名;岗位没带就用清单行里的。
   */
  nocName: string
}

/**
 * `occExcludedRows` 的返回:每命中一张不合格清单一行。
 */
export type OccExcludedRowsOut = TripleRow[]

/**
 * `occListedRows` 的入参。
 */
export type OccListedRowsIn = {
  /**
   * 这个岗位(职业、省份、粗筛结论都在它身上)。
   */
  job: TripleJob

  /**
   * 该职业命中的具名清单行。
   */
  listed: OccupationRow[]

  /**
   * 职业的人话名;岗位没带就用清单行里的。
   */
  nocName: string
}

/**
 * `occListedRows` 的返回:每命中一张具名清单一行。
 */
export type OccListedRowsOut = TripleRow[]

/**
 * `occNoListRow` 的入参。
 */
export type OccNoListRowIn = {
  /**
   * 这个岗位(职业、省份、粗筛结论都在它身上)。
   */
  job: TripleJob

  /**
   * 全量职业清单行(要数该省一共几张清单)。
   */
  occs: OccupationRow[]

  /**
   * 职业的人话名;岗位没带就用清单行里的。
   */
  nocName: string
}

/**
 * `occTeerRow` 的入参。
 */
export type OccTeerRowIn = {
  /**
   * 这个岗位(职业、省份、粗筛结论都在它身上)。
   */
  job: TripleJob

  /**
   * 该省的全量门槛行(粗筛要指向真门槛)。
   */
  provReqs: ReqRow[]

  /**
   * 职业的人话名;岗位没带就用清单行里的。
   */
  nocName: string
}

/**
 * `occupationRows` 的入参。
 */
export type OccupationRowsIn = {
  /**
   * 这个岗位(职业、省份、粗筛结论都在它身上)。
   */
  job: TripleJob

  /**
   * 全量职业清单行。
   */
  occs: OccupationRow[]

  /**
   * 该省的全量门槛行。
   */
  provReqs: ReqRow[]
}

/**
 * `occupationRows` 的返回:职业关的那几行。
 */
export type OccupationRowsOut = TripleRow[]

/**
 * 一条官方举证 —— 一个 URL + 抓取日。
 */
export type OfficialSource = {
  /**
   * 官网 URL。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string
}

/**
 * `occListNoneFor` 的入参。
 */
export type OccListNoneForIn = {
  /**
   * 省码。
   */
  province: string
}

/**
 * `occListNoneFor` 的返回:那一条举证;举不出来则 null。
 */
export type OccListNoneForOut = OfficialSource | null

/**
 * `empReqOf` 的入参。
 */
export type EmpReqOfIn = {
  /**
   * 全量门槛行(引官方原句用)。
   */
  reqs: ReqRow[]

  /**
   * 省码。
   */
  province: string

  /**
   * 雇主侧的因素名。
   */
  factor: string
}

/**
 * `empReqOf` 的返回:那一行;该省没收录则 null。
 */
export type EmpReqOfOut = ReqRow | null

/**
 * `empDesignationRow` 的入参。
 */
export type EmpDesignationRowIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany
}

/**
 * `empDesignationRow` 的返回:名录那一行;非 AIP 省且没命中则 null。
 */
export type EmpDesignationRowOut = TripleRow | null

/**
 * `empThresholdRows` 的入参。
 */
export type EmpThresholdRowsIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany

  /**
   * 雇主判定的结果。
   */
  ev: EmployerVerdict

  /**
   * 全量门槛行(引官方原句用)。
   */
  reqs: ReqRow[]
}

/**
 * `empThresholdRows` 的返回:每一项门槛一行。
 */
export type EmpThresholdRowsOut = TripleRow[]

/**
 * `empRevenueRow` 的入参。
 */
export type EmpRevenueRowIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany

  /**
   * 雇主判定的结果。
   */
  ev: EmployerVerdict

  /**
   * 全量门槛行(引官方原句用)。
   */
  reqs: ReqRow[]
}

/**
 * `empStaffFactRow` 的入参。
 */
export type EmpStaffFactRowIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany

  /**
   * 雇主判定的结果。
   */
  ev: EmployerVerdict
}

/**
 * `empStaffFactRow` 的返回:雇员数旁证那一行;不适用则 null。
 */
export type EmpStaffFactRowOut = TripleRow | null

/**
 * `empPublicSectorRow` 的入参。
 */
export type EmpPublicSectorRowIn = {
  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany

  /**
   * 雇主判定的结果。
   */
  ev: EmployerVerdict
}

/**
 * `empPublicSectorRow` 的返回:公营部门那一行;不是公营则 null。
 */
export type EmpPublicSectorRowOut = TripleRow | null

/**
 * `empNextStepRow` 的入参。
 */
export type EmpNextStepRowIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany
}

/**
 * `employerRows` 的入参。
 */
export type EmployerRowsIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(名录匹配、LMIA、事实都在它身上)。
   */
  company: TripleCompany

  /**
   * 雇主判定的结果。
   */
  ev: EmployerVerdict

  /**
   * 全量门槛行(引官方原句用)。
   */
  reqs: ReqRow[]
}

/**
 * `employerRows` 的返回:雇主关的那几行。
 */
export type EmployerRowsOut = TripleRow[]

/**
 * `cardRuleProfile` 的入参。
 */
export type CardRuleProfileIn = {
  /**
   * 这个岗位 —— 挑门槛行按它的职业与 TEER。
   */
  job: TripleJob

  /**
   * 判定档案(比 VerdictProfile 多几格卡片要的)。
   */
  profile: TripleProfile
}

/**
 * `personRows` 的入参。
 */
export type PersonRowsIn = {
  /**
   * 这个岗位 —— 挑门槛行按它的职业与 TEER。
   */
  job: TripleJob

  /**
   * 判定档案(比 VerdictProfile 多几格卡片要的)。
   */
  profile: TripleProfile

  /**
   * 该省的全量门槛行。
   */
  provReqs: ReqRow[]
}

/**
 * `personRows` 的返回:个人关的那几行。
 */
export type PersonRowsOut = TripleRow[]

/**
 * `timeRow` 的入参。
 */
export type TimeRowIn = {
  /**
   * 判定档案(比 VerdictProfile 多几格卡片要的)。
   */
  profile: TripleProfile
}

/**
 * `crossProvinceRows` 的入参。
 */
export type CrossProvinceRowsIn = {
  /**
   * 这个岗位 —— 挑门槛行按它的职业与 TEER。
   */
  job: TripleJob

  /**
   * 判定档案(比 VerdictProfile 多几格卡片要的)。
   */
  profile: TripleProfile

  /**
   * 全量职业清单行。
   */
  occs: OccupationRow[]
}

/**
 * `crossProvinceRows` 的返回:换省对照的那几行。
 */
export type CrossProvinceRowsOut = TripleRow[]

/**
 * 比路里一行 + 它对应的通道裁决 —— 结论句要同时看这两样。
 */
export type MyPathway = {
  /**
   * 比路里那一行(带名次与身份)。
   */
  c: TripleCompareRow

  /**
   * 同一条通道的裁决(判定核算出来的)。
   */
  v: PathwayVerdict
}

/**
 * `compareRows` 的入参。
 */
export type CompareRowsIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司(AIP 名录命中与否)。
   */
  company: TripleCompany

  /**
   * 判定档案(目标省从它取)。
   */
  profile: TripleProfile

  /**
   * 13 条通道的裁决。
   */
  paths: PathwayVerdict[]
}

/**
 * `compareRows` 的返回:入选的那几条。
 */
export type CompareRowsOut = TripleCompareRow[]

/**
 * `judgeableRow` 的入参。
 */
export type JudgeableRowIn = {
  /**
   * 比路里的一行。
   */
  row: TripleCompareRow
}

/**
 * `myPathways` 的入参。
 */
export type MyPathwaysIn = {
  /**
   * 比路的那几行。
   */
  compare: TripleCompareRow[]

  /**
   * 13 条通道的裁决。
   */
  paths: PathwayVerdict[]
}

/**
 * `myPathways` 的返回:可判的那几条。
 */
export type MyPathwaysOut = MyPathway[]

/**
 * `conclude` 的入参。
 */
export type ConcludeIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 整卡的行。
   */
  rows: TripleRow[]

  /**
   * 比路的那几行。
   */
  compare: TripleCompareRow[]

  /**
   * 13 条通道的裁决。
   */
  paths: PathwayVerdict[]
}

/**
 * `excludedRow` 的入参。
 */
export type ExcludedRowIn = {
  /**
   * 整卡的行。
   */
  rows: TripleRow[]
}

/**
 * `excludedRow` 的返回:「职业被官方排除」那一行;没有则 null。
 */
export type ExcludedRowOut = TripleRow | null

/**
 * `concludeOpen` 的入参。
 */
export type ConcludeOpenIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 可判的那几条(比路行与裁决配成对)。
   */
  mine: MyPathway[]
}

/**
 * `concludeOpen` 的返回:那一句结论;一条能走的都没有则 null。
 */
export type ConcludeOpenOut = TripleConclusion | null

/**
 * `concludeBlocked` 的入参。
 */
export type ConcludeBlockedIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 可判的那几条(比路行与裁决配成对)。
   */
  mine: MyPathway[]
}

/**
 * `concludeBlocked` 的返回:那一句结论;没有被卡住的则 null。
 */
export type ConcludeBlockedOut = TripleConclusion | null

/**
 * `concludeNeedsInfo` 的入参。
 */
export type ConcludeNeedsInfoIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 可判的那几条(比路行与裁决配成对)。
   */
  mine: MyPathway[]
}

/**
 * `concludeNeedsInfo` 的返回:那一句结论;点不出槽则 null。
 */
export type ConcludeNeedsInfoOut = TripleConclusion | null

/**
 * `profileWithOffer` 的入参。
 */
export type ProfileWithOfferIn = {
  /**
   * 卡片用的判定档案。
   */
  p: TripleProfile
}

/**
 * `fastestRow` 的入参。
 */
export type FastestRowIn = {
  /**
   * 比路的那几行。
   */
  compare: TripleCompareRow[]
}

/**
 * `notCollectedRow` 的入参。
 */
export type NotCollectedRowIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 比路的那几行。
   */
  compare: TripleCompareRow[]
}

/**
 * `notCollectedRow` 的返回:那一行;没有未收录的通道则 null。
 */
export type NotCollectedRowOut = TripleRow | null

/**
 * `cardFollowups` 的入参。
 */
export type CardFollowupsIn = {
  /**
   * 整卡的行。
   */
  rows: TripleRow[]
}

/**
 * `cardFollowups` 的返回:去重后的缺槽点名。
 */
export type CardFollowupsOut = string[]

/**
 * `tripleVerdict` 的入参。
 */
export type TripleVerdictIn = {
  /**
   * 这个岗位。
   */
  job: TripleJob

  /**
   * 这家公司。
   */
  company: TripleCompany

  /**
   * 判定档案。
   */
  profile: TripleProfile

  /**
   * 判定层六张底表 —— 调用方查好传进来,本域不另起数据面。
   */
  data: VerdictData

  /**
   * 今年是哪年(算经营年限用);不传就取系统年份。
   */
  nowYear?: number
}

// =========================================================================
// 9. 各函数的入参与返回(`XxxIn` / `XxxOut`)
// =========================================================================

/**
 * `mergeOverrides` 的入参。
 */
export type MergeOverridesIn = {
  /**
   * 底下那一份(offer 那一格由档案定)。
   */
  base: Record<string, ScoreOverride>

  /**
   * 盖在上面那一份(用户在分值卡上直选的档位)。
   */
  extra: Record<string, PickedFactor>
}

/**
 * `mergeOverrides` 的返回:合并后的 override 表。
 */
export type MergeOverridesOut = Record<string, ScoreOverride>

/**
 * `profileWithNoc` 的入参。
 */
export type ProfileWithNocIn = {
  /**
   * 原档案,除职业两格外原样带过去。
   */
  p: VerdictProfile

  /**
   * 要换上的 NOC 码。
   */
  noc: string

  /**
   * 要换上的 TEER。
   */
  teer: number
}

/**
 * `pickScoreRow` 的入参。
 */
export type PickScoreRowIn = {
  /**
   * 该省的全量官方分值行。
   */
  all: ScoreRow[]

  /**
   * 判定档案 —— 只用它的 scoreRows(用户直选的档位下标)。
   */
  p: VerdictProfile

  /**
   * 省码,拼 scoreRows 的键用。
   */
  province: string

  /**
   * 因素名(education / language / area …)。
   */
  factor: string
}

/**
 * `pickScoreRow` 的返回:直选中的那一行;没直选或认不出则 null。
 */
export type PickScoreRowOut = ScoreRow | null

/**
 * `offerOverride` 的入参。
 */
export type OfferOverrideIn = {
  /**
   * 官方表里的 offer 那一行;表里没有这一行则 null。
   */
  row: ScoreRow | null

  /**
   * 他手上有没有 offer。
   */
  has: boolean
}

/**
 * `offerOverride` 的返回:只含 offer 一格的 override 表(没有 offer 行则空表)。
 */
export type OfferOverrideOut = Record<string, ScoreOverride>

/**
 * `fieldMatchAnswer` 的入参。
 */
export type FieldMatchAnswerIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 通道 key —— 查这条通道有没有本省院校的例外条款。
   */
  specKey: string
}

/**
 * `fieldMatchAnswer` 的返回:达标 / 不达标;判不了则 null。
 */
export type FieldMatchAnswerOut = boolean | null

/**
 * `statusGateAnswer` 的入参。
 */
export type StatusGateAnswerIn = {
  /**
   * 这道闸问的是哪一样(工签 / PGWP / 住在本省 / 受雇于本省);没标注则走旧口径。
   */
  asks: AskKind | null

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 本省省码 —— 「住在/受雇于该省」拿它比。
   */
  reqProvince: string
}

/**
 * `statusGateAnswer` 的返回:有 / 没有;判不了则 null。
 */
export type StatusGateAnswerOut = boolean | null

/**
 * `gateKeyOf` 的入参。
 */
export type GateKeyOfIn = {
  /**
   * 哪一道闸。
   */
  gate: GateName

  /**
   * 这道闸问的是哪一样;没细分则 undefined。
   */
  asks: AskKind | null

  /**
   * 状态(met / gap / unknown / notCollected)。
   */
  state: string
}

/**
 * `obstacleRank` 的入参。
 */
export type ObstacleRankIn = {
  /**
   * 一条通道的裁决。
   */
  v: PathwayVerdict

  /**
   * 判定档案 —— 工签闸降本要看他在哪读书。
   */
  profile: VerdictProfile
}

/**
 * `workPermitSoon` 的入参。
 */
export type WorkPermitSoonIn = {
  /**
   * 一条通道的裁决。
   */
  v: PathwayVerdict

  /**
   * 判定档案。
   */
  profile: VerdictProfile
}

/**
 * `selfEmpExcludedIn` 的入参。
 */
export type SelfEmpExcludedInIn = {
  /**
   * 该通道的门槛行。
   */
  rows: ReqRow[]
}

/**
 * `jobRowRank` 的入参。
 */
export type JobRowRankIn = {
  /**
   * 一行职业级事实。
   */
  row: JobPathwayRow
}

/**
 * `verdictRank` 的入参。
 */
export type VerdictRankIn = {
  /**
   * 一条通道的裁决;前后对比时那一头可能压根没这条通道 → undefined。
   */
  v?: PathwayVerdict
}

/**
 * `gotWorse` 的入参。
 */
export type GotWorseIn = {
  /**
   * 换职业**之前**这条通道的裁决。
   */
  before: PathwayVerdict

  /**
   * 换职业**之后**同一条通道的裁决;那一头没有这条则 undefined。
   */
  after?: PathwayVerdict
}

/**
 * `pickOnLangRow` 的入参。
 */
export type PickOnLangRowIn = {
  /**
   * ON 的语言分值行(kind=row 的那些)。
   */
  rows: ScoreRow[]

  /**
   * 要问的 CLB 档。
   */
  clb: number
}

/**
 * `pickOnLangRow` 的返回:够得着的最高那一行;一行都够不着则 null。
 */
export type PickOnLangRowOut = ScoreRow | null

/**
 * `occupationListReasons` 的入参。
 */
export type OccupationListReasonsIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表 —— 这里只用得着 occupations。
   */
  data: VerdictData

  /**
   * 这条通道自己的门槛行(要求在清单的通道拿它引官方原文)。
   */
  rows: ReqRow[]
}

/**
 * `occupationListReasons` 的返回。
 */
export type OccupationListReasonsOut = {
  /**
   * 清单类的理由,按摆出的次序。
   */
  reasons: VerdictReason[]

   /**
   * 缺的槽(没答职业时点名 noc)。
   */
  missingSlots: string[]

  /**
   * 有没有被清单判死 —— 硬伤,不是可积累的缺口。
   */
  listExcluded: boolean
}

/**
 * `languageReasons` 的入参。
 */
export type LanguageReasonsIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 这条通道自己的门槛行。
   */
  rows: ReqRow[]

  /**
   * 这条通道认不认自雇经历 —— 喂给判定引擎的可计月数按它折。
   */
  selfEmpExcluded: boolean
}

/**
 * `languageReasons` 的返回。
 */
export type LanguageReasonsOut = {
  /**
   * 语言类的理由,按摆出的次序。
   */
  reasons: VerdictReason[]

  /**
   * 缺的槽(判不了时点名 clb)。
   */
  missingSlots: string[]

  /**
   * 被语言卡住时的 blockedBy;没卡住则 undefined。
   */
  blockedBy: BlockedBy
}

/**
 * `experienceGaps` 的入参。
 */
export type ExperienceGapsIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 这条通道自己的门槛行(居住门槛从里面挑)。
   */
  rows: ReqRow[]

  /**
   * 经验闸的评估(pickGate 的结果)。
   */
  gate: GateEval
}

/**
 * `experienceGaps` 的返回。
 */
export type ExperienceGapsOut = {
  /**
   * 「本站尚未收录经验门槛条文」那一条(有才有)。
   */
  reasons: VerdictReason[]

  /**
   * 缺的槽(经验月数 / 现居省 / 职业)。
   */
  missingSlots: string[]

  /**
   * 可积累的缺口,tier 按最大的那个定。
   */
  gaps: TierGap[]

  /**
   * 命中的居住门槛(⑤ 摆句子还要用);没有这类门槛则 null。
   */
  res: ResidenceGapOut
}

/**
 * `outOfProvinceGradGap` 的入参。
 */
export type OutOfProvinceGradGapIn = {
  /**
   * 要判的那条通道(省外院校条款挂在它的策略文件里)。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile
}

/**
 * `outOfProvinceGradGap` 的返回。
 */
export type OutOfProvinceGradGapOut = {
  /**
   * 缺的槽(本省在职月数 / 学习省份)。
   */
  missingSlots: string[]

  /**
   * 这一档的缺口(条件成立才有)。
   */
  gaps: TierGap[]

  /**
   * 官方那条并列条款;这条通道没有则 undefined。
   */
  oop: PathwaySpec['outOfProvinceGrad']

  /**
   * 条件成立与否;判不了(没答学历省)则 null。
   */
  oopHolds: boolean | null

  /**
   * 他在本省已经全职干了多少个月;判不了则 null。
   */
  oopHave: number | null
}

/**
 * `scoreAndRefLine` 的入参。
 */
export type ScoreAndRefLineIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表(分值行、抽选、EE 分值表都要用)。
   */
  data: VerdictData

  /**
   * 经验闸的评估 —— MPNP 估的是「攒够门槛后」的分,要拿它的 have/need。
   */
  gate: GateEval

  /**
   * 这条通道认不认自雇经历(CRS 的境外经验按它折)。
   */
  selfEmpExcluded: boolean
}

/**
 * `scoreAndRefLine` 的返回。
 */
export type ScoreAndRefLineOut = {
  /**
   * 估分类的理由(MPNP 那三条 warning、抽选线、挑不出档位那条)。
   */
  reasons: VerdictReason[]

  /**
   * 估分;接不上一律 undefined(不编)。
   */
  score: MaybeScore

  /**
   * 拿来当参照的那一轮抽选;没有可对照的轮次则 null。
   */
  draw: VerdictDrawRow | null
}

/**
 * `verdictReasons` 的入参 —— 前四段攒下的全部中间态。
 */
export type VerdictReasonsIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表 —— 这里只用得着 designatedEmployers(NL 名录那条 supporting fact)。
   */
  data: VerdictData

  /**
   * 经验闸的评估:摆经验差距句要逐行引它选中的门槛行。
   */
  gate: GateEval

  /**
   * 「自雇不计入经验」那类门槛行 —— 逐行引官方原文。
   */
  selfEmpRows: ReqRow[]

  /**
   * ④ 算出的估分;判分数鸿沟要它。
   */
  score: MaybeScore

  /**
   * ④ 挑中的那一轮抽选;鸿沟句要报「和哪一轮比」。
   */
  draw: VerdictDrawRow | null

  /**
   * ③ 命中的居住门槛;没有这类门槛则 null。
   */
  res: ResidenceGapOut

  /**
   * ③b 的官方并列条款;这条通道没有则 undefined。
   */
  oop: PathwaySpec['outOfProvinceGrad']

  /**
   * ③b 的条件成立与否;判不了则 null。
   */
  oopHolds: boolean | null

  /**
   * ③b 已攒的本省在职月数;判不了则 null。
   */
  oopHave: number | null

  /**
   * ① 判出的清单硬伤。
   */
  listExcluded: boolean

  /**
   * ② 攒下的 blockedBy;这里只会被自雇顶上去,不会被覆盖。
   */
  blockedBy: BlockedBy
}

/**
 * `verdictReasons` 的返回。
 */
export type VerdictReasonsOut = {
  /**
   * 裁决类的理由,按摆出的次序。
   */
  reasons: VerdictReason[]

  /**
   * 有没有硬伤(清单判死 或 分数鸿沟)。
   */
  excluded: boolean

  /**
   * 可能被自雇顶上的 blockedBy。
   */
  blockedBy: BlockedBy
}

/**
 * `gateManifest` 的入参。
 */
export type GateManifestIn = {
  /**
   * 要判的那条通道(闸的声明按 key 查策略文件)。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 前面几段攒下的 blockedBy;更难拆的闸会把它顶掉。
   */
  blockedBy: BlockedBy
}

/**
 * `gateManifest` 的返回。
 */
export type GateManifestOut = {
  /**
   * 闸类的理由,按 `GATE_KEYS` 的次序。
   */
  reasons: VerdictReason[]

  /**
   * 缺的槽(有闸但他没答的那几道)。
   */
  missingSlots: string[]

  /**
   * 报最难拆的那道闸。
   */
  blockedBy: BlockedBy

  /**
   * 判不了(条文缺 **或** 答案缺,两者都进 needs-info)。
   */
  manifestUnknown: boolean

  /**
   * 条文缺 —— **只有这一种**才是 availability=not-collected(我们的窟窿,不是他的问题)。
   */
  manifestNoSource: boolean
}

/**
 * `scoreGulfReason` 的入参。
 */
export type ScoreGulfReasonIn = {
  /**
   * ④ 算出的估分。
   */
  score: MaybeScore

  /**
   * ④ 挑中的那一轮抽选 —— 句子里报「和哪一轮比」。
   */
  draw: VerdictDrawRow | null

  /**
   * 鸿沟成不成立(上界够不着参照线)。
   */
  scoreGulf: boolean
}

/**
 * `scoreGulfReason` 的返回:成立时一条,否则空。
 */
export type ScoreGulfReasonOut = VerdictReason[]

/**
 * `experienceReasons` 的入参。
 */
export type ExperienceReasonsIn = {
  /**
   * 经验闸的评估 —— 逐行摆它挑中的门槛行与判不了的条件行。
   */
  gate: GateEval

  /**
   * 没达标时算硬伤还是可积累的缺口(由分数鸿沟定)。
   */
  hardKind: VerdictReason['kind']
}

/**
 * `experienceReasons` 的返回:经验类的理由,按门槛行的原序。
 */
export type ExperienceReasonsOut = VerdictReason[]

/**
 * `residenceReason` 的入参。
 */
export type ResidenceReasonIn = {
  /**
   * ③ 命中的居住门槛;没有这类门槛则 null。
   */
  res: ResidenceGapOut

  /**
   * 没达标时算硬伤还是可积累的缺口。
   */
  hardKind: VerdictReason['kind']
}

/**
 * `residenceReason` 的返回:有这类门槛时一条,否则空。
 */
export type ResidenceReasonOut = VerdictReason[]

/**
 * `oopGradReason` 的入参。
 */
export type OopGradReasonIn = {
  /**
   * 要判的那条通道(句子里报它的名字,出处也挂它)。
   */
  spec: PathwaySpec

  /**
   * ③b 的官方并列条款;这条通道没有则 undefined。
   */
  oop: PathwaySpec['outOfProvinceGrad']

  /**
   * ③b 的条件成立与否;判不了则 null。
   */
  oopHolds: boolean | null

  /**
   * ③b 已攒的本省在职月数;判不了则 null。
   */
  oopHave: number | null
}

/**
 * `oopGradReason` 的返回:这一档适用时一条,条件不成立则空。
 */
export type OopGradReasonOut = VerdictReason[]

/**
 * `nlDesignatedReason` 的入参。
 */
export type NlDesignatedReasonIn = {
  /**
   * 要判的那条通道 —— 只有 NL 的通道才走这条。
   */
  spec: PathwaySpec

  /**
   * 判定档案 —— 拿它的 NOC 去名录里数。
   */
  p: VerdictProfile

  /**
   * 六张底表 —— 这里只用得着 designatedEmployers。
   */
  data: VerdictData
}

/**
 * `nlDesignatedReason` 的返回:NL 且答了职业时一条,否则空。
 */
export type NlDesignatedReasonOut = VerdictReason[]

/**
 * `crsScore` 的入参。
 */
export type CrsScoreIn = {
  /**
   * 要判的那条通道 —— 只有联邦那条走 CRS。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表 —— 这里只用得着 eeGrid。
   */
  data: VerdictData

  /**
   * 参照的那一轮抽选;没有可对照的轮次则 null。
   */
  draw: VerdictDrawRow | null

  /**
   * 这条通道认不认自雇经历 —— 境外经验按它折。
   */
  selfEmpExcluded: boolean
}

/**
 * `mbScore` 的入参。
 */
export type MbScoreIn = {
  /**
   * 要判的那条通道 —— 只有 MPNP 那条走这个估分器。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表(分值行与抽选都要用)。
   */
  data: VerdictData

  /**
   * 经验闸的评估 —— 估的是「攒够门槛后」的分,要拿它的 have/need。
   */
  gate: GateEval

  /**
   * 参照的那一轮抽选;没有可对照的轮次则 null。
   */
  draw: VerdictDrawRow | null
}

/**
 * `mbScore` 的返回。
 */
export type MbScoreOut = {
  /**
   * MPNP 估分;不是这条线或档案缺格则 undefined。
   */
  score: MaybeScore

  /**
   * 那三条 warning(外省学习倒扣 / 再叠外省工作 / 天花板对照抽选线)。
   */
  reasons: VerdictReason[]
}

/**
 * `fedLanguageReasons` 的入参。
 */
export type FedLanguageReasonsIn = {
  /**
   * 联邦那条通道(它的 reqPrograms 列着三个子通道)。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 这条通道自己的门槛行。
   */
  rows: ReqRow[]
}

/**
 * `gateAnswers` 的入参。
 */
export type GateAnswersIn = {
  /**
   * 要判的那条通道 —— 专业对口的例外条款按它的 key 查。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile
}

/**
 * `gateAnswers` 的返回:每道闸一个答案(有 / 没有 / 判不了)。
 */
export type GateAnswersOut = Record<GateName, boolean | null>

/**
 * `pickGridFactors` 的入参。
 */
export type PickGridFactorsIn = {
  /**
   * 该省的全量官方分值行。
   */
  all: ScoreRow[]

  /**
   * 判定档案(含用户在分值卡上直选的档位)。
   */
  p: VerdictProfile

  /**
   * 要估分的那条通道。
   */
  spec: PathwaySpec
}

/**
 * `pickGridFactors` 的返回:整省接不上则 undefined。
 */
export type PickGridFactorsOut = {
  /**
   * 已经定死的那几格(岗位维度与用户直选的档位),scoreProvince 拿它当 override。
   */
  picked: Record<string, PickedFactor>

  /**
   * 交给官方档位匹配的那几个因素名。
   */
  only: Set<string>

  /**
   * 这一分是不是**下界**(有加分项没勾)。
   */
  partial: boolean
} | undefined

/**
 * `gridCeiling` 的入参。
 */
export type GridCeilingIn = {
  /**
   * 该省的全量官方分值行。
   */
  all: ScoreRow[]

  /**
   * 六张底表里的全量分值行 —— scoreProvince 自己再按省筛一遍。
   */
  factors: ScoreRow[]

  /**
   * 要估分的那条通道。
   */
  spec: PathwaySpec

  /**
   * 下界那份档案 —— 上界只把语言拉满,其余照抄。
   */
  self: GridProfile

  /**
   * 官方表里的 offer 那一行;没有则 null。
   */
  offerRow: ScoreRow | null

  /**
   * 已经定死的那几格。
   */
  picked: Record<string, PickedFactor>

  /**
   * 交给官方档位匹配的那几个因素名。
   */
  only: Set<string>
}

/**
 * `gridCeiling` 的返回:上界分;算不出则 null。
 */
export type GridCeilingOut = number | null

/**
 * `listRequiredReason` 的入参。
 */
export type ListRequiredReasonIn = {
  /**
   * 要判的那条通道(它的 listRequired 说清了关的是哪个子通道)。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表 —— 这里只用得着 occupations。
   */
  data: VerdictData

  /**
   * 这条通道自己的门槛行 —— 引官方原文,也看它的 appliesTeer。
   */
  rows: ReqRow[]
}

/**
 * `listRequiredReason` 的返回。
 */
export type ListRequiredReasonOut = {
  /**
   * 判死时的那一条理由;不适用则空。
   */
  reasons: VerdictReason[]

  /**
   * 这一条判没判死。
   */
  listExcluded: boolean
}

/**
 * `mbWarnings` 的入参。
 */
export type MbWarningsIn = {
  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表(倒扣行与历轮抽选都要用)。
   */
  data: VerdictData

  /**
   * 门槛达成态的月数 —— 三条 warning 与估分用的是同一份档案。
   */
  workMonths: number

  /**
   * 语言档 —— 与估分用的是同一格(调用方判过非空)。
   */
  clb: number

  /**
   * 已经算出的估分总分(句子里要报「已计入多少分」)。
   */
  mbTotal: number

  /**
   * 已经算出的上界;算不出则 null。
   */
  ceil: number | null
}

/**
 * `mbWarnings` 的返回:三条里成立的那几条。
 */
export type MbWarningsOut = VerdictReason[]

/**
 * `notCollectedVerdict` 的入参。
 */
export type NotCollectedVerdictIn = {
  /**
   * 库里一行门槛条文都没有的那条通道。
   */
  spec: PathwaySpec
}

/**
 * `foldVerdict` 的入参 —— 前面七段攒下的全部中间态。
 */
export type FoldVerdictIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案 —— 起算点看它的处境与许可。
   */
  p: VerdictProfile

  /**
   * 可积累的缺口,tier 按最大的那个定。
   */
  gaps: TierGap[]

  /**
   * 有没有硬伤(清单判死 或 分数鸿沟)。
   */
  excluded: boolean

  /**
   * 经验闸的评估 —— 三值折叠与全职判据都要看它。
   */
  gate: GateEval

  /**
   * 缺的槽(去重后进裁决)。
   */
  missingSlots: string[]

  /**
   * 门槛清单里有判不了的闸。
   */
  manifestUnknown: boolean

  /**
   * 门槛清单里有条文缺的闸 —— 只有这一种进 not-collected。
   */
  manifestNoSource: boolean

  /**
   * 最难拆的那道障碍。
   */
  blockedBy: BlockedBy

  /**
   * 七段攒下的全部理由,按摆出的次序。
   */
  reasons: VerdictReason[]

  /**
   * 估分;接不上则 undefined。
   */
  score: MaybeScore
}

/**
 * `teerDowngradeLever` 的入参。
 */
export type TeerDowngradeLeverIn = {
  /**
   * 判定档案 —— 拿它改过 TEER 之后重跑一遍注册表。
   */
  profile: VerdictProfile

  /**
   * 六张底表。
   */
  data: VerdictData

  /**
   * 场景参数 —— 只用得着 teerDowngradeNoc。
   */
  opts: PathLeverOpts
}

/**
 * `teerDowngradeLever` 的返回:有通道掉档时一根,否则空。
 */
export type TeerDowngradeLeverOut = VerdictLever[]

/**
 * `clbBoostLever` 的入参。
 */
export type ClbBoostLeverIn = {
  /**
   * 判定档案。
   */
  profile: VerdictProfile

  /**
   * 六张底表。
   */
  data: VerdictData

  /**
   * 场景参数 —— 只用得着 clbTarget。
   */
  opts: PathLeverOpts
}

/**
 * `clbBoostLever` 的返回:查得出增量时一根,否则空。
 */
export type ClbBoostLeverOut = VerdictLever[]

/**
 * `gridSelfProfile` 的入参。
 */
export type GridSelfProfileIn = {
  /**
   * 判定档案(含用户在分值卡上直选的那几格)。
   */
  p: VerdictProfile
}

/**
 * `pathwayFacts` 的入参。
 */
export type PathwayFactsIn = {
  /**
   * 要判的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案。
   */
  p: VerdictProfile

  /**
   * 六张底表。
   */
  data: VerdictData

  /**
   * 这条通道自己的门槛行。
   */
  rows: ReqRow[]

  /**
   * 经验闸的评估(`pickGate` 的结果)。
   */
  gate: GateEval

  /**
   * 这条通道认不认自雇经历。
   */
  selfEmpExcluded: boolean
}

/**
 * `pathwayFacts` 的返回:五段的产出,与裁决那一半还要用的中间态。
 */
export type PathwayFactsOut = {
  /**
   * ①②③④ 摆出的理由,按原序。
   */
  reasons: VerdictReason[]

  /**
   * 这几段点名要补的槽。
   */
  missingSlots: string[]

  /**
   * ① 判出的清单硬伤。
   */
  listExcluded: boolean

  /**
   * ② 被语言卡住时的 blockedBy。
   */
  blockedBy: BlockedBy

  /**
   * ③ 与 ③b 的可积累缺口。
   */
  gaps: TierGap[]

  /**
   * ③ 命中的居住门槛;没有这类门槛则 null。
   */
  res: ResidenceGapOut

  /**
   * ③b 的官方并列条款;这条通道没有则 undefined。
   */
  oop: PathwaySpec['outOfProvinceGrad']

  /**
   * ③b 的条件成立与否;判不了则 null。
   */
  oopHolds: boolean | null

  /**
   * ③b 已攒的本省在职月数;判不了则 null。
   */
  oopHave: number | null

  /**
   * ④ 的估分;接不上则 undefined。
   */
  score: MaybeScore

  /**
   * ④ 挑中的那一轮抽选;没有可对照的轮次则 null。
   */
  draw: VerdictDrawRow | null
}

/**
 * `subjectOf` 的返回:门槛行的两个合法主语之一。
 */
export type SubjectOfOut = 'applicant' | 'employer'

/**
 * `loadVerdictTables` 的返回:判定层六张底表。
 */
export type LoadVerdictTablesOut = Promise<VerdictData>

// =========================================================================
// 10. 名录匹配
// =========================================================================

/**
 * `employerNameSegments` 的返回:可比的名段。
 */
export type EmployerNameSegmentsOut = string[]

/**
 * 名录里可比的一行。**只要这两格** —— 判定不关心名录行还有什么。
 */
export type NameRow = {
  /**
   * 名录上的名字,可能是「法定全称 o/a 营业名」。
   */
  name: string

  /**
   * 这一行来自哪份名录。
   */
  source?: string
}

/**
 * `matchDesignation` 的入参。
 */
export type MatchDesignationIn = {
  /**
   * 岗位上挂的公司名。
   */
  companyName: string

  /**
   * **已按省筛过**的名录行 —— 跨省同名是两家公司,本层不管省。
   */
  rows: readonly NameRow[]
}

/**
 * `matchDesignation` 的返回。
 */
export type MatchDesignationOut = {
  /**
   * 唯一命中的那一行。**null = 没认出(count=0)或多配(count≥2,不点名法人)。**
   */
  row: NameRow | null

  /**
   * 完全匹配的法人数:0 / 1 / N。
   */
  count: number

  /**
   * 命中行的名录名;count=0 或多配行 source 不一致 → 空串。
   */
  source: string
}

// =========================================================================
// 11. 雇主侧判定的入参与返回
// =========================================================================

/**
 * `employerVerdict` 的入参。
 */
export type EmployerVerdictIn = {
  /**
   * 公司事实。
   */
  facts: EmployerFacts

  /**
   * 两位省码。
   */
  province: string

  /**
   * 门槛行。**未按省筛**,函数内部自己筛。
   */
  reqs: ReqRow[]

  /**
   * 当前年份。单测拿它锁「N 年前成立」这类相对时间的用例。
   */
  nowYear: number
}

/**
 * `empRowsOf` 的入参。
 */
export type EmpRowsOfIn = {
  /**
   * 全部门槛行。
   */
  reqs: ReqRow[]

  /**
   * 两位省码。
   */
  province: string

  /**
   * 要哪一个因素。
   */
  factor: string
}

/**
 * `empRowsOf` 的返回:该省该因素的雇主侧门槛行。
 */
export type EmpRowsOfOut = ReqRow[]

/**
 * `pushItem` 的入参。
 */
export type PushItemIn = {
  /**
   * 攒结果的那三个数组。
   */
  acc: EmpAcc

  /**
   * 哪一个因素。
   */
  factor: EmployerVerdictFactor

  /**
   * 官方门槛;挑不到行就是 null。
   */
  need: number | null

  /**
   * 公司侧的值;查不到就是 null。
   */
  have: number | null

  /**
   * 单位。
   */
  unit: string

  /**
   * 公司侧这个值的证据性质。
   */
  evidence: EvidenceKind
}

/**
 * 判定过程里的收集器。**只在一次调用内活着**,不是共享状态。
 */
export type EmpAcc = {
  /**
   * 参与整体判定的项。
   */
  items: EmployerVerdictItem[]

  /**
   * 没达标的因素。
   */
  failed: EmployerVerdictFactor[]

  /**
   * 判不了的因素。
   */
  missing: EmployerVerdictFactor[]
}

/**
 * `universalValue` 的入参:同一因素的门槛行。
 */
export type UniversalValueIn = ReqRow[]

/**
 * `universalValue` 的返回:通用档的阈值;分档省份没有这一档就是 null。
 */
export type UniversalValueOut = number | null

/**
 * `blockCost` 的入参:闸的名字;没有闸就是 undefined。
 */
export type BlockCostIn = string | undefined

/**
 * `pathLevers` 的入参。
 */
export type PathLeversIn = {
  /**
   * `pathLevers` 的 profile。
   */
  profile: VerdictProfile

  /**
   * `pathLevers` 的 data。
   */
  data: VerdictData

  /**
   * `pathLevers` 的 opts。
   */
  opts: PathLeverOpts
}

/**
 * `pathLevers` 的返回。
 */
export type PathLeversOut = VerdictLever[]

/**
 * `profileOfOccupation` 的入参。
 */
export type ProfileOfOccupationIn = {
  /**
   * 职业的 NOC 码(4 位),认不出时 null。
   */
  noc: string | null

  /**
   * 职业的 TEER(0-5),认不出时 null。
   */
  teer: number | null
}

/**
 * `jobPathways` 的入参。
 */
export type JobPathwaysIn = {
  /**
   * `jobPathways` 的 noc。
   */
  noc: string | null

  /**
   * `jobPathways` 的 teer。
   */
  teer: number | null

  /**
   * `jobPathways` 的 data。
   */
  data: VerdictData
}

/**
 * `jobPathways` 的返回。
 */
export type JobPathwaysOut = JobPathwayRow[]

/**
 * `provinceGridScore` 的入参。
 */
export type ProvinceGridScoreIn = {
  /**
   * 要估分的那条通道。
   */
  spec: PathwaySpec

  /**
   * 判定档案 —— 含用户在分值卡上直选的官方档位(scoreRows / scoreTicks / scoreProfile)。
   */
  p: VerdictProfile

  /**
   * 全量官方分值行(六张底表里的 scoreFactors),本函数自己按省筛。
   */
  factors: ScoreRow[]

  /**
   * 拿来当参照线的最近一轮抽选;本站没收录到可对照的轮次时 null。
   */
  draw: VerdictDrawRow | null
}

/**
 * `pathVerdict` 的入参。
 */
export type PathVerdictIn = {
  /**
   * `pathVerdict` 的 profile。
   */
  profile: VerdictProfile

  /**
   * `pathVerdict` 的 data。
   */
  data: VerdictData
}

/**
 * `pathVerdict` 的返回。
 */
export type PathVerdictOut = PathwayVerdict[]

/**
 * `evaluateOne` 的入参。
 */
export type EvaluateOneIn = {
  /**
   * `evaluateOne` 的 spec。
   */
  spec: PathwaySpec

  /**
   * `evaluateOne` 的 p。
   */
  p: VerdictProfile

  /**
   * `evaluateOne` 的 data。
   */
  data: VerdictData
}

/**
 * `fedLangApplies` 的入参。
 */
export type FedLangAppliesIn = {
  /**
   * `fedLangApplies` 的 r。
   */
  r: ReqRow

  /**
   * `fedLangApplies` 的 teer。
   */
  teer: number | null
}

/**
 * `ruleProfileOf` 的入参。
 */
export type RuleProfileOfIn = {
  /**
   * `ruleProfileOf` 的 p。
   */
  p: VerdictProfile

  /**
   * `ruleProfileOf` 的 total。
   */
  total: number | null
}

/**
 * `mbProfileOf` 的入参。
 */
export type MbProfileOfIn = {
  /**
   * `mbProfileOf` 的 p。
   */
  p: VerdictProfile

  /**
   * `mbProfileOf` 的 workMonths。
   */
  workMonths: number

  /**
   * `mbProfileOf` 的 clb。
   */
  clb: number
}

/**
 * `mbEduOf` 的入参。
 */
export type MbEduOfIn = {
  /**
   * `mbEduOf` 的 edu。
   */
  edu: EduBand

  /**
   * `mbEduOf` 的 years。
   */
  years: number | null
}

/**
 * `refDraw` 的入参。
 */
export type RefDrawIn = {
  /**
   * `refDraw` 的 spec。
   */
  spec: PathwaySpec

  /**
   * `refDraw` 的 draws。
   */
  draws: VerdictDrawRow[]
}

/**
 * `refDraw` 的返回。
 */
export type RefDrawOut = VerdictDrawRow | null

/**
 * `residenceGap` 的入参。
 */
export type ResidenceGapIn = {
  /**
   * `residenceGap` 的 spec。
   */
  spec: PathwaySpec

  /**
   * `residenceGap` 的 rows。
   */
  rows: ReqRow[]

  /**
   * `residenceGap` 的 p。
   */
  p: VerdictProfile
}

/**
 * `residenceGap` 的返回。
 */
export type ResidenceGapOut = {
  /**
   * 命中的那一行居住门槛条文(结论句要引它的原文与出处)。
   */
  row: ReqRow

  /**
   * 官方要求住满多少个月。
   */
  need: number

  /**
   * 还差多少个月;人不在本省记 0(搬过去当天就开始计时),缺槽判不了则 null。
   */
  gap: number | null
} | null

/**
 * `pickGate` 的入参。
 */
export type PickGateIn = {
  /**
   * `pickGate` 的 spec。
   */
  spec: PathwaySpec

  /**
   * `pickGate` 的 rows。
   */
  rows: ReqRow[]

  /**
   * `pickGate` 的 p。
   */
  p: VerdictProfile

  /**
   * `pickGate` 的 selfEmpExcluded。
   */
  selfEmpExcluded: boolean
}

/**
 * `reqsOf` 的入参。
 */
export type ReqsOfIn = {
  /**
   * 要挑门槛行的那条通道。
   */
  spec: PathwaySpec

  /**
   * 全量门槛行(六张底表里的 requirements)。
   */
  all: ReqRow[]
}

/**
 * `reqsOf` 的返回:属于这条通道的门槛行。
 */
export type ReqsOfOut = ReqRow[]

/**
 * `countableMonths` 的入参。
 */
export type CountableMonthsIn = {
  /**
   * `countableMonths` 的 spec。
   */
  spec: PathwaySpec

  /**
   * `countableMonths` 的 p。
   */
  p: VerdictProfile

  /**
   * `countableMonths` 的 selfEmpExcluded。
   */
  selfEmpExcluded: boolean
}

/**
 * `countableMonths` 的返回。
 */
export type CountableMonthsOut = number | null

/**
 * `conditionHolds` 的入参。
 */
export type ConditionHoldsIn = {
  /**
   * `conditionHolds` 的 cond。
   */
  cond: string

  /**
   * `conditionHolds` 的 p。
   */
  p: VerdictProfile

  /**
   * `conditionHolds` 的 province。
   */
  province: string
}

/**
 * `conditionHolds` 的返回。
 */
export type ConditionHoldsOut = boolean | null

/**
 * `maxClbIn` 的入参。
 */
export type MaxClbInIn = {
  /**
   * `maxClbIn` 的 labels。
   */
  labels: string[]
}

/**
 * `maxClbIn` 的返回。
 */
export type MaxClbInOut = number | null

/**
 * `tierOfMonths` 的入参。
 */
export type TierOfMonthsIn = {
  /**
   * `tierOfMonths` 的 m。
   */
  m: number
}

/**
 * `tierOfMonths` 的返回。
 */
export type TierOfMonthsOut = 0 | 1 | 2 | 3

/**
 * `monthsOfReq` 的入参。
 */
export type MonthsOfReqIn = {
  /**
   * `monthsOfReq` 的 r。
   */
  r: ReqRow
}

/**
 * `monthsOfReq` 的返回。
 */
export type MonthsOfReqOut = number | null

/**
 * `basisParam` 的入参。
 */
export type BasisParamIn = {
  /**
   * `basisParam` 的 basis。
   */
  basis: string

  /**
   * `basisParam` 的 key。
   */
  key: string
}

/**
 * `basisParam` 的返回。
 */
export type BasisParamOut = string | null

/**
 * `evOfFactor` 的入参。
 */
export type EvOfFactorIn = {
  /**
   * `evOfFactor` 的 f。
   */
  f: ScoreRow
}

/**
 * `evOfDraw` 的入参。
 */
export type EvOfDrawIn = {
  /**
   * `evOfDraw` 的 d。
   */
  d: VerdictDrawRow
}

/**
 * `evOfOcc` 的入参。
 */
export type EvOfOccIn = {
  /**
   * `evOfOcc` 的 r。
   */
  r: OccupationRow
}

/**
 * `quoteOfReq` 的入参。
 */
export type QuoteOfReqIn = {
  /**
   * `quoteOfReq` 的 r。
   */
  r: ReqRow
}

/**
 * `evOfReq` 的入参。
 */
export type EvOfReqIn = {
  /**
   * `evOfReq` 的 r。
   */
  r: ReqRow
}

// =========================================================================
// 12. 判定卡的下行数据
// =========================================================================

/**
 * 一袋松散的答案格 —— 服务端档案与前端本地答案都长这样。
 *
 * 🔴 **不可信**:每一格进判定前都要单独收窄,不许整袋断言成档案。
 */
export type AnswerBag = Record<string, Cell | Cell[]>

/**
 * `answerNum` 的入参。
 */
export type AnswerNumIn = {
  /**
   * 那一格的原值。
   */
  v: Cell | Cell[]
}

/**
 * `answerNum` 的返回。
 */
export type AnswerNumOut = number | null

/**
 * `tripleJobOf` 的入参。
 */
export type TripleJobOfIn = {
  /**
   * 库里那一行岗位。
   */
  row: Row
}

/**
 * `lmiaNocsOf` 的入参。
 */
export type LmiaNocsOfIn = {
  /**
   * 库里那一格 `lmia_nocs`,**一段 JSON 文本**。
   *
   * 🔴 列本身是 `jsonb`,驱动会替我们解析成对象 —— 而 `Row` 的值域只有文本/数字/布尔/空,
   * 装不下对象。所以查询里就 `::text` 取成文本(`SQL.COMPANY_LMIA_NOCS`),
   * 让「库里一格是标量」这句话对每一列都成立,而不是在这里补一刀 `typeof` 把两种可能都接着。
   */
  raw: string | null
}

/**
 * `lmiaNocsOf` 的返回。
 */
export type LmiaNocsOfOut = Record<string, number> | null

/**
 * `parseNocDict` 的入参。
 */
export type ParseNocDictIn = {
  /**
   * 那一格的文本。
   */
  text: string
}

/**
 * `parseNocDict` 的返回。
 */
export type ParseNocDictOut = Record<string, Cell> | null

/**
 * `tripleProfileOf` 的入参。
 */
export type TripleProfileOfIn = {
  /**
   * 服务端档案的那几格。
   */
  up: AnswerBag

  /**
   * 前端带上来的本地答案;匿名用户就只有这一份。
   */
  answers: ClientAnswers
}

/**
 * `boolOf` 的入参。
 */
export type BoolOfIn = {
  /**
   * 服务端档案那一格。
   */
  fromProfile: Cell | Cell[]

  /**
   * 本地答案那一格。
   */
  fromAnswers: Cell | Cell[]
}

/**
 * `boolOf` 的返回。
 */
export type BoolOfOut = boolean | null

/**
 * `provinceOf` 的入参。
 */
export type ProvinceOfIn = {
  /**
   * 那一格的原值。
   */
  v: Cell | Cell[]
}

/**
 * `provinceOf` 的返回。
 */
export type ProvinceOfOut = string | null

/**
 * `permitOf` 的入参。
 */
export type PermitOfIn = {
  /**
   * 那一格的原值。
   */
  v: Cell | Cell[]
}

/**
 * `permitOf` 的返回。
 */
export type PermitOfOut = VerdictProfile['permit']

/**
 * `firstNoc` 的入参。
 */
export type FirstNocIn = {
  /**
   * 服务端档案的那几格。
   */
  up: AnswerBag

  /**
   * 本地答案的那几格。
   */
  answers: AnswerBag
}

/**
 * `firstNoc` 的返回。
 */
export type FirstNocOut = string | null

/**
 * `targetProvincesOf` 的入参。
 */
export type TargetProvincesOfIn = {
  /**
   * 服务端档案的那几格。
   */
  up: AnswerBag

  /**
   * 本地答案的那几格。
   */
  answers: AnswerBag
}

/**
 * `targetProvincesOf` 的返回。
 */
export type TargetProvincesOfOut = string[]

/**
 * `wireRows` 的入参。
 */
export type WireRowsIn = {
  /**
   * 整卡的行。
   */
  rows: TripleRow[]

  /**
   * 他是不是 Pro。
   */
  pro: boolean
}

/**
 * `wireRows` 的返回。
 */
export type WireRowsOut = TripleWireRow[]

/**
 * 按省取指定雇主名录候选行的那个函数 —— **由调用方注进来**。
 *
 * 🔴 名录扫描走跨路由的 TTL 缓存,而缓存要连 `payload`,那是路由层的基建、不属于本域
 * (宪法「带 `payload` 的进程内缓存不属于域」)。本域只声明「我需要这么一个函数」。
 */
export type DesignatedLoader = (input: GetDesignatedEmployersIn) => GetDesignatedEmployersOut

/**
 * `buildTripleWire` 的入参。
 */
export type BuildTripleWireIn = {
  /**
   * 数据库连接(池由调用方注进来)。连接池由调用方注进来 —— 本域不 import `payload`。
   */
  db: Db

  /**
   * 岗位号。**不可信**,进库前先验成正整数。
   */
  id: number

  /**
   * 前端带上来的本地答案;SSR 调用时是 null(服务端读不到 localStorage)。
   */
  answers: ClientAnswers

  /**
   * 服务端档案的那几格;匿名用户传空袋。
   */
  profile: AnswerBag

  /**
   * 他登录了没有。只决定前端提示,**与付费闸无关**。
   */
  loggedIn: boolean

  /**
   * 他是不是 Pro。付费闸只看这一格。
   */
  pro: boolean

  /**
   * 判定层六张底表。走跨路由 TTL 缓存,由调用方取好传进来。
   */
  data: VerdictData

  /**
   * 按省取名录候选行。
   */
  designatedOf: DesignatedLoader
}

/**
 * 下行数据判出来的东西:整张卡,或一句错误加 HTTP 码。
 *
 * 单独起名是给调用方用的 —— 路由拿到它先靠 `ok` 做联合窄化,再决定回 200 还是回错。
 */
export type TripleWireResult = TripleWire | WireError

/**
 * `buildTripleWire` 的返回。
 */
export type BuildTripleWireOut = Promise<TripleWireResult>

/**
 * 下行数据判不出来时的那一句。
 */
export type WireError = {
  /**
   * 哪一种错。取自 `WIRE_ERR`,不手写。
   */
  error: string

  /**
   * HTTP 码。取自 `HTTP`,不手写。
   */
  status: number
}

/**
 * `tripleCompanyOf` 的入参。
 */
export type TripleCompanyOfIn = {
  /**
   * 库里那一行岗位(公司名与公司主键都在上面)。
   */
  row: Row

  /**
   * 公司注册事实。边缘入口(`buildTripleWire`)先查好传进来(拍板③:db 只在边缘)——
   * 没有公司主键或查不到则 null,本函数落成全 null 的空事实。
   */
  facts: EmployerFacts | null

  /**
   * 该公司 LMIA 职业码那一格的原始文本。同上由边缘入口先查;没有则 null。
   */
  nocsRaw: string | null

  /**
   * 这份岗所在省 —— 名录按省取。
   */
  province: string

  /**
   * 名录候选行。同上由边缘入口按省取好传进来(公司名或省码为空时给空数组,不白查)。
   */
  dir: DesignatedEmployerRow[]
}

/**
 * `tripleCompanyOf` 的返回。
 */
export type TripleCompanyOfOut = TripleCompany

/**
 * `oneRow` 的入参:一条 SQL + 它的行映射函数(db 的 `queryRows` 同款形态,单行版)。
 * 泛型 `R` 由 `map` 的返回类型定。
 */
export type OneRowIn<R> = {
  /**
   * 数据库连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 那条 SQL。取自 `lib/db/sql`,本域不自己写 SQL。
   */
  sql: string

  /**
   * 绑定参数。
   */
  params: Cell[]
  /**
   * 行映射函数:第一行原始行 → 干净的 `R`。默认值决策(词汇表)全在它体内。
   */
  map: (row: Row) => R
}

/**
 * `oneRow` 的返回:映射完的第一行;查不到或查挂了则 null。
 */
export type OneRowOut<R> = Promise<R | null>

/**
 * `hasEnoughProfile` 的入参。
 */
export type HasEnoughProfileIn = {
  /**
   * 判定卡认的那份档案。
   */
  profile: TripleProfile
}

/**
 * `designatedRow` 的入参。
 */
export type DesignatedRowIn = {
  /**
   * 按省取回来的名录候选行(**带全部列**)。
   */
  rows: DesignatedEmployerRow[]

  /**
   * `matchDesignation` 认出来的那一行;认不出或多配则 null。
   */
  hit: NameRow | null
}

/**
 * `designatedRow` 的返回。
 */
export type DesignatedRowOut = DesignatedEmployerRow | null

// =========================================================================
// 13. 处境页的事实层
// =========================================================================

/**
 * 一条处境的事实层:他问的那条通道 + 已核过的完整画像。
 */
export type CaseProfileSpec = {
  /**
   * 中介/朋友推的那个省的通道 key —— 页面第一段就回答它。
   */
  askedKey: string

  /**
   * 已核过的完整画像。**不是答题预填用的残缺 preset。**
   */
  profile: VerdictProfile
}

/**
 * 一个出页处境:事实层再加上它属于哪条案例。
 */
export type CasePageSpec = {
  /**
   * 案例编号。
   */
  caseId: string

  /**
   * 中介/朋友推的那个省的通道 key。
   */
  askedKey: string

  /**
   * 已核过的完整画像。
   */
  profile: VerdictProfile
}

/**
 * `caseProfiles` 的返回:案例编号 → 事实层。
 */
export type CaseProfilesOut = Record<string, CaseProfileSpec>

/**
 * `casePages` 的返回:slug → 出页处境。
 */
export type CasePagesOut = Record<string, CasePageSpec>

/**
 * `caseAnswer` 的入参。
 */
export type CaseAnswerIn = {
  /**
   * 页面 slug。唯一来源是 `CASES` 的 `page` 字段 —— 两边各写一份就会出死链。
   */
  slug: string

  /**
   * 判定层六张底表。
   */
  data: VerdictData

  /**
   * 数据库连接(池由调用方注进来)。连接池由调用方注进来。
   */
  db: Db
}

/**
 * `caseAnswer` 的返回:整份答案;没有事实层的 slug 则 null。
 */
export type CaseAnswerOut = Promise<CaseAnswer | null>

/**
 * 库里一行「该职业在某省的在招计数」。
 */
export type ProvCountRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 在招总数。
   */
  n: number

  /**
   * 其中官方标了带训 / 不要经验的。
   */
  t: number
}

/**
 * 一条通道配上「本省该职业有多少个在招岗」—— 只为排序活着。
 */
export type RankedPathway = {
  /**
   * 那条通道的裁决。
   */
  v: PathwayVerdict

  /**
   * 本省该职业的在招岗数;跨省通道记 `NO_PROVINCE_RANK`。
   */
  n: number
}

/**
 * `tierRows` 的入参。
 */
export type TierRowsIn = {
  /**
   * 除他问的那条以外、没被排除的通道。
   */
  rest: PathwayVerdict[]

  /**
   * 要挑哪一档。
   */
  tier: number

  /**
   * 各省该职业的在招计数。
   */
  openings: Record<string, OpeningCount>
}

/**
 * `tierRows` 的返回:这一档的通道,已按在招岗数降序。
 */
export type TierRowsOut = PathwayVerdict[]

/**
 * `opsByProvince` 的入参。
 */
export type OpsByProvinceIn = {
  /**
   * `PNP_OPS_STATS` 查出的原始统计行。边缘入口(`caseAnswer`)先查好传进来(拍板③:db 只在边缘)。
   */
  stats: OpsStatRow[]
}

/**
 * `opsByProvince` 的返回:省码 → 官方运营数字。
 */
export type OpsByProvinceOut = Record<string, OpsFacts>

/**
 * `applyOpsRow` 的入参。
 */
export type ApplyOpsRowIn = {
  /**
   * 往哪个省的数字上记。**就地改**,因为一个省的几个指标分散在好几行里。
   */
  facts: OpsFacts

  /**
   * 指标名。取自 `OPS_METRIC`。
   */
  metric: string

  /**
   * 指标值。
   */
  value: number
}

/**
 * `applyOpsPeriod` 的入参。
 */
export type ApplyOpsPeriodIn = {
  /**
   * 往哪个省的数字上记。
   */
  facts: OpsFacts

  /**
   * 指标名。
   */
  metric: string

  /**
   * 这一行的期次。
   */
  period: string
}

/**
 * `trainableRows` 的入参。
 */
export type TrainableRowsIn = {
  /**
   * 每省的在招计数。
   */
  rows: ProvCountRow[]
}

/**
 * `trainableRows` 的返回。
 */
export type TrainableRowsOut = TrainableRow[]

/**
 * `answerBool` 的入参。
 */
export type AnswerBoolIn = {
  /**
   * 那一格的原值。
   */
  v: Cell | Cell[]
}

/**
 * `answerBool` 的返回。
 */
export type AnswerBoolOut = boolean | null

/**
 * `answerText` 的入参。
 */
export type AnswerTextIn = {
  /**
   * 那一格的原值。
   */
  v: Cell | Cell[]
}

/**
 * `answerText` 的返回。
 */
export type AnswerTextOut = string | null

// =========================================================================
// 14. 自己去连库的那几支
// =========================================================================

/**
 * `getVerdictData` 的返回。
 */
export type GetVerdictDataOut = Promise<VerdictData>

/**
 * `getDesignatedEmployers` 的入参。
 */
export type GetDesignatedEmployersIn = {
  /**
   * 两位省码。名录**按省**取 —— 跨省同名是两家公司。
   */
  province: string
}

/**
 * `getDesignatedEmployers` 的返回。
 */
export type GetDesignatedEmployersOut = Promise<DesignatedEmployerRow[]>

/**
 * `directoryRow` 的入参。
 */
export type DirectoryRowIn = {
  /**
   * 库里那一行名录。
   */
  row: Row
}

/**
 * `tripleWireOf` 的入参。
 */
export type TripleWireOfIn = {
  /**
   * 当前这个人(入口 getUser 后注进来;未登录 null;鉴权层的形状起本地别名)。
   */
  user: QuotaSession | null

  /**
   * Pro 与否(入口 isPro(user) 后注进来 —— isPro 住 quota 服务端半边,functions 不借门)。
   */
  pro: boolean

  /**
   * 岗位号。
   */
  id: number

  /**
   * 浏览器本地那份答案;SSR 时是 null(服务端读不到 localStorage)。
   */
  answers: ClientAnswers
}

/**
 * `tripleWireOf` 的返回。
 */
export type TripleWireOfOut = Promise<TripleWireResult>

/**
 * 六张底表那一份缓存。
 */
export type TablesCache = {
  /**
   * 存进来的时刻。过了 TTL 就重取。
   */
  at: number

  /**
   * 六张底表。
   */
  data: VerdictData
}

/**
 * 某个省的名录那一份缓存。
 */
export type DirectoryCache = {
  /**
   * 存进来的时刻。
   */
  at: number

  /**
   * 该省的名录行。
   */
  rows: DesignatedEmployerRow[]
}

/**
 * `profileSlots` 的入参。
 */
export type ProfileSlotsIn = {
  /**
   * 当前这个人;没登录则 null。形状由鉴权那层定,本域只关心它身上挂没挂档案。
   */
  user: SessionUser
}

/**
 * 鉴权那层交回来的人。**本域只声明自己真读的那一格**(有没有档案),
 * 其余(id / email / 到期日)是那一层的事,不在这里跟着声明一遍。
 */
export type SessionUser = {
  /**
   * 用户身上那组档案槽;没建过档则没有这一格。
   */
  profile?: AnswerBag
} | null

/**
 * `sessionOf` 的入参。
 */
export type SessionOfIn = {
  /**
   * 鉴权那层交回来的人。形状归那一层管,本域不跟着声明一遍。
   */
  user: AuthUser
}

/**
 * 鉴权那层交回来的那个人 —— 本域**不认识它的字段**,只负责把它转成自己的形状。
 */
export type AuthUser = object | null

/**
 * 判定域的运行时状态。**这个域一共有多少可变的东西,就这张表上这几格。**
 */
export type RulingCache = {
  /**
   * 六张判定底表那一份;还没取过则 null。
   */
  tables: TablesCache | null

  /**
   * 指定雇主名录按省的那几份。查失败**不写进来** —— 不把一次抖动钉死 10 分钟。
   */
  byProvince: Map<string, DirectoryCache>
}

/**
 * 一条被卡住的通道,配上「那道闸多难拆」—— 只为排序活着。
 */
export type RankedBlock = {
  /**
   * 那条通道(比路行与裁决配成的对)。
   */
  x: MyPathway

  /**
   * 那道闸的难度。**由调用方先算好**,比较器只做减法。
   */
  cost: number
}

/**
 * 一行官方运营统计(rows 映射后的干净形态)。
 */
export type OpsStatRow = {
  /**
   * 数值;官方隐私抑制/纯文本时 null,不折 0。
   */
  value: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 指标名(ETL 词表)。
   */
  metric: string

  /**
   * 统计期;没有就空串。
   */
  period: string

  /**
   * 官方口径日;没有就空串。
   */
  asOf: string

  /**
   * 出处页;没有就空串。
   */
  url: string
}

/**
 * `toOpsStat` 的返回:干净的统计行。
 */

/**
 * POST /api/ruling/verdict 的请求体形状（跨边界断言目标，逐格判后才用）。
 */
export type VerdictBody = {
  /**
   * 岗位 id；不是数就落 NaN 由域层拒。
   */
  job: number | string | null

  /**
   * 本地答案；不是对象就当没带。
   */
  answers: ClientAnswers
}

/**
 * 透传的 json 值（问卷答案包的格；逐格验形后才用）。
 */
export type RCell = string | number | boolean | null | RCell[] | { [k: string]: RCell }

/**
 * 透传的 json 对象。
 */
export type RObj = { [k: string]: RCell }

/**
 * POST /api/ruling/profile 的请求体形状（跨边界断言目标）。
 */
export type ProfileBody = {
  /**
   * 统一题库答案包；不是对象 400。
   */
  answers: RObj | null

  /**
   * 加分项勾选（省:因素:批 → true）；验形不过的丢。
   */
  ticks: RObj | null

  /**
   * 官方档位直选（省:因素 → seq）；验形不过的丢。
   */
  rows: RObj | null

  /**
   * 时薪；非法落 null。
   */
  wage: RCell

  /**
   * BC 地区档；非法落 null。
   */
  areaI: RCell
}

/**
 * 各省名额竞争度（E12-07 stats.difficulty，IRCC 开放数据）：
 * value = 临时居民存量 ÷ 当年省提名名额。与「各省 EOI 池不可比」不是一回事：
 * 这个是联邦一个源算的比值，九省同口径可排序（Frank 2026-08-12）。
 */
export type ProvCompetition = {
  /**
   * 竞争比。
   */
  ratio: number

  /**
   * 难度档文本；没有空串。
   */
  tier: string

  /**
   * 池子人数（缺位 0）。
   */
  pool: number

  /**
   * 当年名额（缺位 0）。
   */
  quota: number

  /**
   * 名额年份（缺位 0）。
   */
  quotaYear: number
}

/**
 * 省码 → 竞争度。
 */
export type CompetitionMap = Record<string, ProvCompetition>

/**
 * 难度表一行的解析结果（rows 产；json 坏/比值缺 = comp null 不入图）。
 */
export type CompetitionPair = {
  /**
   * 省码。
   */
  province: string

  /**
   * 解得出的竞争度；解不出 null。
   */
  comp: ProvCompetition | null
}

/**
 * 难度表原始行（SQL.PROV_DIFFICULTY）。
 */
export type ProfileDiffDbRow = {
  /**
   * 省码；库里可空。
   */
  province: string | null

  /**
   * 难度 json；jsonb 驱动给对象、文本列给串、没有 null。
   */
  difficulty: RCell
}

/**
 * `loadProvinceCompetition` 的返回。
 */
export type CompetitionMapOut = Promise<CompetitionMap>

/**
 * `pathwayMatchesTargets` 的入参。
 */
export type MatchTargetsIn = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 行的省（'FED' 或两字码）。
   */
  province: string

  /**
   * 目标省；空 = 不限。
   */
  targets: string[]
}

/**
 * 拆省并装饰后的一行（rankRows/pickOutside 的输入；#307 单源化：服务端一把尺
 * 排完再下发，客户端只渲染不重排）。
 */
export type SplitRow = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 省（联邦区域线已拆到省）。
   */
  province: string

  /**
   * 命中的通道名。
   */
  stream: string

  /**
   * 判定档。
   */
  verdict: string

  /**
   * 障碍档；没有 null。
   */
  tier: number | null

  /**
   * tier 的起算点（#319：在读学生的经验型 tier 要等毕业拿工签才起算）。
   */
  tierBasis: string

  /**
   * 这段等待要不要全职（取自官方条文行）。
   */
  tierFullTime: boolean

  /**
   * 最难那道闸；没有 null。
   */
  blockedBy: string | null

  /**
   * 判不了是因为他还没答哪几道题。
   */
  missingSlots: string[]

  /**
   * 理由行（措辞层键+参数，quote 随行）。
   */
  reasons: VerdictReason[]

  /**
   * 打分制通道的估分与官方线；非打分制 null。
   */
  score: PathwayScore | null

  /**
   * 该省门槛数据的可得性。
   */
  availability: string

  /**
   * 估分上界也摸不到线（沉底段）。
   */
  belowLine: boolean

  /**
   * 估分下界已 ≥ 线（同档内提前）。
   */
  aboveLine: boolean

  /**
   * 该省名额竞争度；联邦区域线行 null（AIP/RCIP/FCIP 没有 EOI 池，
   * 不许拿该省 PNP 的名额竞争比充数）。
   */
  competition: ProvCompetition | null
}

/**
 * `splitDecorated` 的入参。
 */
export type SplitDecoratedIn = {
  /**
   * 引擎原行。
   */
  rows: PathwayVerdict[]

  /**
   * 目标省（拆区域线时取交；空 = 全拆）。
   */
  targets: string[]

  /**
   * 省码 → 竞争度（非区域行按省挂）。
   */
  comp: CompetitionMap
}

/**
 * 单行装饰的入参（splitDecorated 内部用）。
 */
export type SplitRowOfIn = {
  /**
   * 引擎原行。
   */
  row: PathwayVerdict

  /**
   * 拆完的省。
   */
  province: string

  /**
   * 该行的竞争度（区域线行一律 null）。
   */
  competition: ProvCompetition | null
}

/**
 * 反事实一格（L2-09：拿到该省 offer 之后这条路的判定；只给被 offer 卡住的行）。
 */
export type AfterOfferWire = {
  /**
   * 反事实判定档。
   */
  verdict: string

  /**
   * 反事实下还剩的闸；没有 null。
   */
  blockedBy: string | null

  /**
   * 反事实障碍档。
   */
  tier: number | null
}

/**
 * 估分与官方线的下发格（三态互斥：两头硬结论、中间如实留白 —— 2026-08-16）。
 */
export type WireScore = {
  /**
   * 估分下界（加分项按 0 记）。
   */
  value: number

  /**
   * 估分上界；算不出 null。
   */
  ceiling: number | null

  /**
   * 最近抽选线；没有 null。
   */
  refLine: number | null

  /**
   * 线所属通道；没有 null。
   */
  refStream: string | null

  /**
   * value 是下界吗（展示层据此说不说「取决于加分项」）。
   */
  partial: boolean
}

/**
 * 一行方案的下发格（前端 Decision 的契约按这个写）。
 */
export type ProfileWireRow = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 省。
   */
  province: string

  /**
   * 判定档。
   */
  verdict: string

  /**
   * 障碍档；没有 null。
   */
  tier: number | null

  /**
   * 该省门槛数据的可得性。
   */
  availability: string

  /**
   * 最难那道闸；没有 null（被硬门槛卡住时方案卡不能再写「优先核对」）。
   */
  blockedBy: string | null

  /**
   * tier 起算点（#319）。
   */
  tierBasis: string

  /**
   * 这段等待要不要全职。
   */
  tierFullTime: boolean

  /**
   * 全部缺口闸键（#324：原因列要逐行差异，单一 blockedBy 不够）。
   */
  gaps: string[]

  /**
   * 还没答的题（展示层据此挂提醒）。
   */
  missingSlots: string[]

  /**
   * 该省名额竞争度；联邦区域线 null。
   */
  competition: ProvCompetition | null

  /**
   * 该省该职业在招岗数（与排序同源，#307）；非省级行 null。
   */
  jobsN: number | null

  /**
   * RCIP/FCIP 社区名额状态（省×制度聚合）；非试点行 null。
   */
  pilotQuota: PilotQuotaAgg | null

  /**
   * 反事实；只给被 offer 卡住的行，其余 null。
   */
  afterOffer: AfterOfferWire | null

  /**
   * 估分与官方线；非打分制 null。
   */
  score: WireScore | null

  /**
   * 估分上界也摸不到线。
   */
  belowLine: boolean

  /**
   * 估分下界已 ≥ 线。
   */
  aboveLine: boolean
}

/**
 * 已排除通道的理由下发格（#318：excluded 不再整条隐身）。
 */
export type ExcludedReasonWire = {
  /**
   * 措辞层键；没有 null。
   */
  key: string | null

  /**
   * 措辞参数；没有 null。
   */
  params: Record<string, string | number> | null

  /**
   * 兑好的文本。
   */
  text: string

  /**
   * 官方原句；没有 null。
   */
  quote: string | null
}

/**
 * 一条已排除通道。
 */
export type ExcludedRowWire = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 省。
   */
  province: string

  /**
   * 第一条排除理由；没有 null。
   */
  reason: ExcludedReasonWire | null
}

/**
 * 省外提示里的对照边（措辞层拿 insideBest 摆对照，不再裸称「更优」）。
 */
export type OutsideSideWire = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 省。
   */
  province: string

  /**
   * 竞争比；没数据 null。
   */
  ratio: number | null

  /**
   * 障碍档。
   */
  tier: number | null

  /**
   * 最难那道闸；没有 null。
   */
  blockedBy: string | null
}

/**
 * 省外提示（#302/#303：与主排序共用 planRank 同一把尺）。
 */
export type OutsideWire = {
  /**
   * 省外那一边。
   */
  key: string

  /**
   * 省。
   */
  province: string

  /**
   * 竞争比；没数据 null。
   */
  ratio: number | null

  /**
   * 障碍档。
   */
  tier: number | null

  /**
   * 最难那道闸；没有 null。
   */
  blockedBy: string | null

  /**
   * 目标省内最好的那条；没有 null。
   */
  inside: OutsideSideWire | null
}

/**
 * `parseProfileBody` 的返回：验完形的档案与附带三样。
 */
export type ProfileParse = {
  /**
   * 翻好的引擎档案。
   */
  profile: VerdictProfile

  /**
   * 验过形的职业码清单（可空）。
   */
  nocs: string[]

  /**
   * 主职业码；空串 = 没给（路由 400）。
   */
  noc: string

  /**
   * 目标省（验过形）。
   */
  targets: string[]
}

/**
 * `buildProfileWire` 的入参（取数全在路由完成，这里纯组装）。
 */
export type ProfileWireIn = {
  /**
   * 引擎档案。
   */
  profile: VerdictProfile

  /**
   * 判定底表（getVerdictData 的单件缓存）。
   */
  data: VerdictData

  /**
   * 省码 → 竞争度。
   */
  comp: CompetitionMap

  /**
   * 该职业在各省的竞争面（jobs 域取）。
   */
  occRows: OccCompetitionRow[]

  /**
   * 试点名额聚合（pathways 域取）。
   */
  pilotQuota: PilotQuotaAgg[]

  /**
   * 目标省。
   */
  targets: string[]
}

/**
 * `buildProfileWire` 的返回（不含 noc/nocs —— 那两样路由自己回传）。
 */
export type ProfileWireOut = {
  /**
   * 排好序的方案行。
   */
  rows: ProfileWireRow[]

  /**
   * 已排除通道（单列一组）。
   */
  excluded: ExcludedRowWire[]

  /**
   * 省外提示；没有 null。
   */
  outside: OutsideWire | null
}

/**
 * plan 排序行的本地名（jobsOf 回调收它 —— 参型由 plan 定，收窄会逆变报错）。
 */
export type PlanRow = RankableRow

/**
 * 「该省该职业在招岗数」取数回调（RankCtx.jobsOf 的形状）。
 */
export type JobsOfFn = (row: PlanRow) => number | null

/**
 * 反事实结果表：通道 key → 拿到 offer 之后的判定行；档案明确没 offer 才跑。
 */
export type AfterMap = Map<string, PathwayVerdict>

/**
 * 学历格的本地名（VerdictProfile.edu 的取值域；白名单验过才断言进来）。
 */
export type EduCell = VerdictProfile['edu']

/**
 * 持照格的本地名。
 */
export type PermitCell = VerdictProfile['permit']

/**
 * `wireRowOf` 的入参（查表在循环里做完，这里纯拼装）。
 */
export type WireRowOfIn = {
  /**
   * 排好序的一行。
   */
  row: SplitRow

  /**
   * 该省该职业在招岗数；非省级行 null。
   */
  jobsN: number | null

  /**
   * 反事实行；不适用 null。
   */
  after: PathwayVerdict | null

  /**
   * 试点名额；非试点行 null。
   */
  pilot: PilotQuotaAgg | null
}

/**
 * `parseProfileBody` 的入参（解不开的 body 就是 null）。
 */
export type MaybeProfileBody = ProfileBody | null

/**
 * `parseProfileBody` 的返回（body 非法是 null）。
 */
export type MaybeProfileParse = ProfileParse | null

/**
 * json 格里的标量（cellOr 的返回；缺席折空串）。
 */
export type ScalarCell = string | number | boolean

/**
 * 可缺位的布尔（没答不算「没有」）。
 */
export type MaybeBool = boolean | null

/**
 * 可缺位的数。
 */
export type MaybeNum = number | null

/**
 * 可缺位的文本（职业码空串折 null 那类）。
 */
export type MaybeStr = string | null

/**
 * 排序行清单。
 */
export type SplitRows = SplitRow[]

/**
 * 可缺位的竞争度。
 */
export type MaybeCompetition = ProvCompetition | null

/**
 * 该职业在各省的竞争面清单（jobs 行的本域清单名）。
 */
export type OccRowsList = OccCompetitionRow[]
