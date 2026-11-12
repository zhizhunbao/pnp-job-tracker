/**
 * points 域的子桶 provinces/mb 的形状 —— 曼尼托巴 MPNP EOI 估分 estimateMbEoi(通用省表装不下,手写)。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 官方分值表与抽选事实
// =========================================================================

/**
 * 官方分值表一行(`pnp_score_factors` 维度表)。
 *
 * 🔴 **分值一分都不许在代码里编** —— 全部来自这张表。本域只负责「你选的条件对应哪一行」,
 * 分数照抄那一行的 `points`。
 */
export type ScoreFactor = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 分制全名,结尾括号里可能自报通道。
   */
  system: string

  /**
   * 官方表的小节名(work / education / language …)。
   */
  factor: string

  /**
   * 这一行是档位、加分项还是规则。
   */
  kind: string

  /**
   * 组内序号。加分项的勾选键靠它。
   */
  seq: number

  /**
   * 官方原文标签。**UI 必须显出来**,好让用户核对我们匹的是哪一档。
   */
  label: string

  /**
   * 这一档给几分。
   */
  points: number | null

  /**
   * 与上一条是**二选一**(官方原文的「…, or」)。
   */
  xorPrev: boolean

  /**
   * 官方写的附加规则原文。
   */
  rule: string

  /**
   * 该因素封顶多少分。
   */
  factorMax: number | null

  /**
   * 该因素属于哪个官方分组(SK 的 FACTOR I / II)。
   */
  factorGroup: string

  /**
   * 该分组封顶多少分。
   */
  groupMax: number | null

  /**
   * 该分制的及格线。
   */
  passMark: number | null

  /**
   * 该分制满分。
   */
  maxTotal: number | null

  /**
   * 官方指南的生效日。
   */
  guideEffective: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 官方页地址。
   */
  url: string
}

// =========================================================================
// 2. 曼省 EOI
// =========================================================================

/**
 * 曼省认的学历档。
 */
export type MbEduKey =
  | 'masterOrDoctorate'
  | 'twoPrograms2yPlus'
  | 'oneProgram3yPlus'
  | 'oneProgram2y'
  | 'oneYearProgram'
  | 'tradeCert'
  | 'none'

/**
 * 曼省适应性那几格。
 */
export type MbAdaptInput = {
  /**
   * 曼省持续就业 6 个月以上加长期 offer,或战略计划 ITA。**二选一即满分,不叠加。**
   */
  demand: boolean

  /**
   * 曼省有直系亲属。
   */
  closeRelative: boolean

  /**
   * 曾在曼省合法工作满 6 个月。
   */
  priorMbWork6moPlus: boolean

  /**
   * 在曼省完成的学制年数档:2 = 两年及以上 / 1 = 一年 / 0 = 无。
   */
  mbEduYears: 0 | 1 | 2

  /**
   * 曼省有好友或远亲。
   */
  closeFriendOrDistantRelative: boolean

  /**
   * 移民目的地在温尼伯以外。
   */
  regionalOutsideWinnipeg: boolean
}

/**
 * 曼省 EOI 吃的那份档案。
 */
export type MbProfile = {
  /**
   * 语言:单一数 = 四项同档;给一份四项档则各项分别算。
   */
  clb: number | MbLangBands

  /**
   * 第二官方语言总体 CLB ≥ 5 —— **一次性加分,不按项乘**。
   */
  secondLangClb5Plus: boolean

  /**
   * 年龄。
   */
  age: number

  /**
   * 同职业在曼省(或官方认可)的工作月数。
   */
  workMonthsSameOcc: number

  /**
   * 该职业已获省内发证 / 监管机构全面认可。
   */
  employerLicenseRecognized: boolean

  /**
   * 学历档。
   */
  edu: MbEduKey

  /**
   * 适应性那几格。
   */
  adapt: MbAdaptInput

  /**
   * 有外省工作经历(扣分)。
   */
  riskForeignWork: boolean

  /**
   * 有外省学习经历(扣分)。
   */
  riskForeignStudy: boolean
}

/**
 * 曼省 EOI 一块分。
 */
export type MbScorePart = {
  /**
   * 因素名。
   */
  factor: string

  /**
   * 这一块得几分。
   */
  pts: number

  /**
   * 这一块的封顶(风险那块是**下限**)。
   */
  max: number | null

  /**
   * 命中的官方原文,拼起来的。
   */
  matched: string
}

/**
 * 曼省 EOI 的估分。
 */
export type MbEoiScore = {
  /**
   * 恒为曼省。
   */
  province: 'MB'

  /**
   * 分制全名。
   */
  system: string

  /**
   * 满分。
   */
  maxTotal: number

  /**
   * 官方页地址。
   */
  url: string

  /**
   * 官方指南生效日。
   */
  guideEffective: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 逐块的分。
   */
  parts: MbScorePart[]

  /**
   * 合计(已按满分封顶)。
   */
  total: number
}

/**
 * `mbRowsOf` 的入参。
 */
export type MbRowsOfIn = {
  /**
   * 曼省的全部分值行。
   */
  rows: ScoreFactor[]

  /**
   * 因素名。
   */
  factor: string

  /**
   * 要档位行还是加分行。
   */
  kind: string
}

/**
 * `needRow` 的入参。
 */
export type NeedRowIn = {
  /**
   * 候选行。
   */
  rows: ScoreFactor[]

  /**
   * 官方标签的匹配式。
   */
  re: RegExp

  /**
   * 少了这一行时报给人看的上下文。
   */
  ctx: string
}

/**
 * `needRow` 的返回:那一行。**少一行就抛**,不静默补 0。
 */
export type NeedRowOut = ScoreFactor

/**
 * `mbLangPick` 的入参。
 */
export type MbLangPickIn = {
  /**
   * 语言档位行。
   */
  rows: ScoreFactor[]

  /**
   * 这一项的 CLB。
   */
  clb: number
}

/**
 * `mbLangPick` 的返回:这一项得几分与命中的那一行。
 */
export type MbLangPickOut = {
  /**
   * 几分。
   */
  pts: number

  /**
   * 命中的那一行。
   */
  row: ScoreFactor
}

/**
 * `mbAgePick` 的入参。
 */
export type MbAgePickIn = {
  /**
   * 年龄档位行。
   */
  rows: ScoreFactor[]

  /**
   * 他的年龄。
   */
  age: number
}

/**
 * `mbWorkPick` 的入参。
 */
export type MbWorkPickIn = {
  /**
   * 工作年限档位行。
   */
  rows: ScoreFactor[]

  /**
   * 他的整年数。
   */
  years: number
}

/**
 * 挑到的那一行。
 */
export type MbRowOut = ScoreFactor

/**
 * `mbWorkYearsOf` 的返回:这一档的年数;读不出则 null。
 */
export type MbWorkYearsOut = number | null

/**
 * `mbEduReOf` 的入参。
 */
export type MbEduReOfIn = {
  /**
   * 学历档。
   */
  edu: MbEduKey
}

/**
 * `mbEduReOf` 的返回。
 */
export type MbEduReOfOut = RegExp

/**
 * `estimateMbEoi` 的入参。
 */
export type EstimateMbEoiIn = {
  /**
   * 官方分值表全部行 —— **不用预先按省筛**,本函数自己挑曼省。
   */
  factors: ScoreFactor[]

  /**
   * 他的档案。
   */
  profile: MbProfile
}

/**
 * `estimateMbEoi` 的返回。
 */
export type EstimateMbEoiOut = MbEoiScore

/**
 * 曼省逐块估分函数共用的入参。
 */
export type MbPartIn = {
  /**
   * 曼省的全部分值行。
   */
  rows: ScoreFactor[]

  /**
   * 他的档案。
   */
  profile: MbProfile
}

/**
 * 曼省逐块估分函数的返回。
 */
export type MbPartOut = MbScorePart

/**
 * `mbBands` 的入参。
 */
export type MbBandsIn = {
  /**
   * 语言:单一数或一份四项档。
   */
  clb: number | MbLangBands
}

/**
 * `mbBands` 的返回:摊平成四项。
 */
export type MbBandsOut = number[]

/**
 * `mbRiskTicks` 的入参。
 */
export type MbRiskTicksIn = {
  /**
   * 风险那两条加分行。
   */
  rows: ScoreFactor[]

  /**
   * 他的档案。
   */
  profile: MbProfile
}

/**
 * `mbRiskTicks` 的返回:勾选状态。
 */
export type MbRiskTicksOut = Record<string, boolean>

/**
 * 一行曼省档位配上它的阈值 —— 只为挑档活着。
 */
export type MbThresholdRow = {
  /**
   * 那一行。
   */
  r: ScoreFactor

  /**
   * 这一档的阈值。
   */
  th: number
}

/**
 * 关系分要挑的一条:匹配式与报错上下文。
 */
export type MbPick = {
  /**
   * 官方标签的匹配式。
   */
  re: RegExp

  /**
   * 少了这一行时报给人看的上下文。
   */
  ctx: string
}

/**
 * `mbConnectionPicks` 的入参。
 */
export type MbConnectionPicksIn = {
  /**
   * 适应性那几格。
   */
  adapt: MbAdaptInput
}

/**
 * `mbConnectionPicks` 的返回。
 */
export type MbConnectionPicksOut = MbPick[]

/**
 * `mbMaxPoints` 的入参。
 */
export type MbMaxPointsIn = {
  /**
   * 那几行。
   */
  rows: ScoreFactor[]
}

/**
 * `mbMaxPoints` 的返回。
 */
export type MbMaxPointsOut = number

// =========================================================================
// 3. 正则的具名捕获组
// =========================================================================

/**
 * 语言四项各自的档。
 *
 * 🔴 **不用四元组**:`[8, 6, 7, 4]` 在调用点读不出哪个是听力。曼省是唯一按每项计分的省,
 * 顺序写反不会报错,只会算出一个看起来很合理的错分。
 */
export type MbLangBands = {
  /**
   * 阅读。
   */
  reading: number

  /**
   * 写作。
   */
  writing: number

  /**
   * 听力。
   */
  listening: number

  /**
   * 口语。
   */
  speaking: number
}

/**
 * 捕获一个拼写单词的正则命中后长这样。
 */
export type WordGroup = {
  /**
   * 那个单词。
   */
  word: string
}

/**
 * `wordGroupOf` 的返回。
 */
export type WordGroupOut = WordGroup | null
