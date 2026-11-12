/**
 * 分值域的形状 —— **本域自己声明,不从别的域取**。
 *
 * @author Frank
 * @time 2026-08-20 22:00:00
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
// 2. 用户条件与估分结果
// =========================================================================

/**
 * 本站认的学历档。
 */
export type EduKey = 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

/**
 * 用户自报的一套条件 —— **一套填完,各省各查各的表**。
 */
export type SelfProfile = {
  /**
   * 学历档。
   */
  edu: EduKey

  /**
   * 近 5 年内同职业全职年数(0-5)。
   */
  expRecent: number

  /**
   * 再往前(6-10 年前)的年数(0-5)。
   */
  expOlder: number

  /**
   * 首考语言 CLB;0 = 没有成绩。
   */
  clb1: number

  /**
   * 第二官方语言 CLB;0 = 没有。
   */
  clb2: number

  /**
   * 年龄。
   */
  age: number
}

/**
 * 一份分数从哪来。
 */
export type ScoreSource = 'profile' | 'job' | 'tick'

/**
 * 一个因素算出来的那一块分。
 */
export type ScorePart = {
  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 这一块得几分。
   */
  pts: number

  /**
   * 这一块封顶几分。
   */
  max: number

  /**
   * 命中的官方原文标签。**UI 必须显出来**,好让用户核对。
   */
  matched: string

  /**
   * 属于哪个官方分组。
   */
  group: string

  /**
   * 分数从哪来。
   */
  source: ScoreSource
}

/**
 * 一个省的估分。
 */
export type ProvinceScore = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 分制全名。
   */
  system: string

  /**
   * 满分。
   */
  maxTotal: number

  /**
   * 及格线;没有则 null。
   */
  passMark: number | null

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
   * 逐因素的分。
   */
  parts: ScorePart[]

  /**
   * 合计(已按因素封顶、组封顶、满分封顶)。
   */
  total: number
}

/**
 * 手动 / 自动项的分数 —— 由 UI 传进来(BC 的时薪与地区、SK 的雇主 offer 等)。
 */
export type ScoreOverride = {
  /**
   * 几分。
   */
  pts: number

  /**
   * 命中的官方原文标签。
   */
  matched: string

  /**
   * 分数从哪来。
   */
  source: ScoreSource
}

// =========================================================================
// 3. 各函数的入参与返回(`XxxIn` / `XxxOut`)
// =========================================================================

/**
 * `streamWords` 的入参:一个通道名。
 */
export type StreamWordsIn = string

/**
 * `streamWords` 的返回:实词。
 */
export type StreamWordsOut = string[]

/**
 * `streamMatches` 的入参。
 */
export type StreamMatchesIn = {
  /**
   * 抽选侧写的通道名。
   */
  drawStream: string

  /**
   * 分值表自报的通道名。
   */
  gridStream: string
}

/**
 * `streamMatches` 的返回:抽选侧的实词是不是分值表那边的子集。
 */
export type StreamMatchesOut = boolean

/**
 * `gridStreamOf` / `systemShort` 的入参:分制全名。
 */
export type SystemIn = string

/**
 * `gridStreamOf` / `systemShort` 的返回。
 */
export type SystemOut = string

/**
 * 从官方标签解析数字的那几个函数的入参:一条官方原文标签。
 */
export type LabelIn = string

/**
 * 从官方标签解析数字的那几个函数的返回:解析出的数;读不出则 null。
 */
export type LabelNumOut = number | null

/**
 * `ageRangeOf` 的返回:闭区间;读不出则 null。
 */
export type AgeRangeOut = AgeRange | null

/**
 * 一个年龄闭区间。
 */
export type AgeRange = {
  /**
   * 下界(含)。
   */
  from: number

  /**
   * 上界(含)。
   */
  to: number
}

/**
 * `pickByThreshold` 的入参。
 */
export type PickByThresholdIn = {
  /**
   * 该因素的档位行。
   */
  rows: ScoreFactor[]

  /**
   * 怎么从标签读出这一档的阈值。**由调用方注进来** —— 年 / 月 / CLB / 学历各一把尺。
   */
  thresholdOf: LabelReader

  /**
   * 他自己的值。
   */
  want: number
}

/**
 * 从官方标签读一个可比较的数 —— 读不出则 null。
 */
export type LabelReader = (label: string) => number | null

/**
 * `pickByThreshold` / `pickByAge` / `autoPick` 的返回:命中的那一行;没有则 null。
 */
export type PickOut = ScoreFactor | null

/**
 * `pickByAge` 的入参。
 */
export type PickByAgeIn = {
  /**
   * 年龄那几行。
   */
  rows: ScoreFactor[]

  /**
   * 他的年龄。
   */
  age: number
}

/**
 * `autoPick` 的入参。
 */
export type AutoPickIn = {
  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 该因素的档位行。
   */
  rows: ScoreFactor[]

  /**
   * 他自报的条件。
   */
  profile: SelfProfile
}

/**
 * 一行档位配上它的阈值 —— 只为挑档活着。
 */
export type ThresholdRow = {
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
 * `defaultProfile` 的返回。
 */
export type DefaultProfileOut = SelfProfile

/**
 * `scoreProvince` 的入参。
 */
export type ScoreProvinceIn = {
  /**
   * 官方分值表(可以是全量,本函数自己按省筛)。
   */
  factors: ScoreFactor[]

  /**
   * 两位省码。
   */
  province: string

  /**
   * 他自报的条件。
   */
  profile: SelfProfile

  /**
   * 手动 / 自动项的分数,键 = 因素名;没有就传空。
   */
  overrides: Record<string, ScoreOverride>

  /**
   * 加分项勾选状态,键 = `省:因素:序号`;没有就传空。
   */
  ticks: Record<string, boolean>

  /**
   * 自动匹配的**白名单**:只有这些因素拿档案去匹官方档位,其余一律当「未答」。
   *
   * 🔴 为什么需要它:报告只问了语言与加拿大经验,若让缺答的字段照常匹配,
   * 「没考语言」会被 `pickByThreshold` 兜到最低档白捡分 —— 那是编数。
   * 不传 = 不限,老调用方行为不变。
   */
  only?: Set<string>
}

/**
 * `scoreProvince` 的返回:该省的估分;这个省没有分值表则 null。
 */
export type ScoreProvinceOut = ProvinceScore | null

/**
 * `factorPart` 的入参。
 */
export type FactorPartIn = {
  /**
   * 该省的全部分值行。
   */
  all: ScoreFactor[]

  /**
   * 官方因素名。
   */
  name: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 他自报的条件。
   */
  profile: SelfProfile

  /**
   * 手动 / 自动项的分数。
   */
  overrides: Record<string, ScoreOverride>

  /**
   * 加分项勾选状态。
   */
  ticks: Record<string, boolean>

  /**
   * 自动匹配白名单;不传 = 不限。
   */
  only?: Set<string>
}

/**
 * `factorPart` 的返回。
 */
export type FactorPartOut = ScorePart

/**
 * `totalOf` 的入参。
 */
export type TotalOfIn = {
  /**
   * 逐因素的分。
   */
  parts: ScorePart[]

  /**
   * 该省的全部分值行(取组封顶用)。
   */
  all: ScoreFactor[]
}

/**
 * `totalOf` 的返回:组封顶之后的合计(还没按满分封顶)。
 */
export type TotalOfOut = number

/**
 * `bonusPoints` 的入参。
 */
export type BonusPointsIn = {
  /**
   * 该因素的加分项行,**保持官方原序** —— 二选一是靠相邻关系判的。
   */
  list: ScoreFactor[]

  /**
   * 勾选状态的键前缀 = `省:因素`。
   */
  prefix: string

  /**
   * 勾选状态。
   */
  ticks: Record<string, boolean>
}

/**
 * `bonusPoints` 的返回。
 */
export type BonusPointsOut = number

/**
 * `rowsOf` 的入参。
 */
export type RowsOfIn = {
  /**
   * 候选行。
   */
  rows: ScoreFactor[]

  /**
   * 要哪一种(档位 / 加分项 / 规则)。
   */
  kind: string
}

/**
 * `rowsOf` 的返回。
 */
export type RowsOfOut = ScoreFactor[]

/**
 * `groupCap` 的入参。
 */
export type GroupCapIn = {
  /**
   * 该省的全部分值行。
   */
  all: ScoreFactor[]

  /**
   * 官方分组名。
   */
  group: string
}

/**
 * `groupCap` 的返回:封顶;没封顶则 null。
 */
export type GroupCapOut = number | null

/**
 * `hasAutoPick` 的返回。
 */
export type HasAutoPickOut = boolean

// =========================================================================
// 4. 估分 × 抽选线
// =========================================================================

/**
 * 估分与它要对照的那条线。
 */
export type ScoreVsLine = {
  /**
   * 本站问得到的因子算出的分;`partial` 时它是**下界**。
   */
  value?: number | null

  /**
   * 加分项全按满分的**上界**;算不出给 null。
   */
  ceiling?: number | null

  /**
   * 对照的最近一轮抽选线;本站没收录给 null。
   */
  refLine?: number | null

  /**
   * `value` 是不是下界(有加分项没勾)。
   */
  partial?: boolean
}

/**
 * 够得着 / 够不着 / 说不好。
 */
export type LineState = 'above' | 'below' | 'unknown'

/**
 * `lineStateOf` / `isAboveLine` / `isBelowLine` / `marginOf` 的入参。
 *
 * 允许 null 与 undefined:调用方常常手里就没有分,**缺一边就不比**。
 */
export type ScoreLineIn = ScoreVsLine | null | undefined

/**
 * `lineStateOf` 的返回。
 */
export type LineStateOut = LineState

/**
 * `isAboveLine` / `isBelowLine` 的返回。
 */
export type LineSideOut = boolean

/**
 * `marginOf` 的返回:高出线多少分;够不着或无从比较则 null。
 */
export type MarginOut = number | null

// =========================================================================
// 5. 正则的具名捕获组
// =========================================================================

/**
 * 只有一个捕获组的正则命中后长这样。
 */
export type OneGroup = {
  /**
   * 那一个捕获组。
   */
  n: string
}

/**
 * 一头一尾两个捕获组的正则命中后长这样。
 */
export type RangeGroup = {
  /**
   * 下界。
   */
  low: string

  /**
   * 上界。
   */
  high: string
}

/**
 * 三个捕获组读取函数共用的入参。
 */
export type MatchIn = {
  /**
   * 正则。**必须带具名捕获组**,名字要与读取函数的返回形状对得上。
   */
  re: RegExp

  /**
   * 要匹的那段字。
   */
  text: string
}

/**
 * `oneGroupOf` 的返回:命中则给那一格;没命中则 null。
 */
export type OneGroupOut = OneGroup | null

/**
 * `rangeGroupOf` 的返回。
 */
export type RangeGroupOut = RangeGroup | null
