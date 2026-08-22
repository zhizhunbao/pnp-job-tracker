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

/**
 * 省抽选事实(`pnp_draws` 里用得着的几列)。
 */
export type DrawRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选类别。
   */
  kind: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 分数线;没公布则 null。
   */
  score: number | null

  /**
   * 通道名的中文灰注(ETL 已译)。
   *
   * **只在 zh 界面出** —— en/ko 不读:官方原名是事实,译名是辅助,不能反过来盖掉原名。
   */
  streamZh?: string
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
// 4. 联邦表(CRS / FSW67)
// =========================================================================

/**
 * `ee_points_grid` 一行(官方两张联邦表抓取入库)。
 */
export type EeGridRow = {
  /**
   * 哪张表:CRS 还是 FSW67。
   */
  grid: string

  /**
   * 分节(CRS 的 A / C / D)。
   */
  section: string

  /**
   * 分节标题原文。
   */
  sectionLabel: string

  /**
   * 行类别 —— 只有 `detail` 参与查表。
   */
  kind: string

  /**
   * 官方表号。
   */
  tableNo: number | null

  /**
   * 小节标题原文。
   */
  heading: string

  /**
   * 因素名原文。
   */
  factor: string

  /**
   * 这一档的官方原文(要匹的就是它)。
   */
  criterion: string

  /**
   * 列名原文(有无配偶 / 子档门槛都写在这)。
   */
  columnLabel: string

  /**
   * 这一档给几分。**官方写 n/a 时为 null,不折成 0。**
   */
  points: number | null

  /**
   * 分数的官方原文写法。
   */
  pointsText: string

  /**
   * 行序。
   */
  seq: number | null

  /**
   * 官方页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string
}

/**
 * 联邦估分吃的那份档案 —— **本域只消费这几格**。
 */
export type CrsProfile = {
  /**
   * 年龄。
   */
  age: number | null

  /**
   * 配偶**是否随行申请**;null / false 都走无配偶那张表。
   */
  married: boolean | null

  /**
   * 四项最低(首官方语言)。
   */
  clb: number | null

  /**
   * 学历档。
   */
  edu: EduKey | null

  /**
   * 学制年数。
   */
  eduYears: number | null

  /**
   * 有无加拿大学历。
   */
  canadaStudy: boolean | null

  /**
   * 加拿大工作经验月数。
   */
  expCanadaMonths: number | null

  /**
   * 海外工作经验月数。
   */
  expForeignMonths: number | null
}

/**
 * 联邦估分某一项的出处。
 */
export type EeEvidence = {
  /**
   * 官方页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 命中那一行的原文与分数写法。
   */
  label?: string
}

/**
 * 逐项的判定态。
 */
export type ItemStatus = 'matched' | 'zero' | 'needs-info'

/**
 * 联邦估分的一项。
 */
export type EstimateItem = {
  /**
   * 内部键(`age` / `edu` / `clb` …),上游靠它反问缺哪一格。
   */
  factor: string

  /**
   * 人话短名。
   */
  label: string

  /**
   * 官方行抄来的分;判不了或没命中时为 0。
   */
  points: number

  /**
   * 命中的官方原文(核对用);没命中为空。
   */
  matched: string

  /**
   * 出处;没命中则 null。
   */
  evidence: EeEvidence | null

  /**
   * 命中 / 确定为 0 / 判不了。
   */
  status: ItemStatus
}

/**
 * 联邦估分的结果。
 */
export type EstimateResult = {
  /**
   * 合计。
   */
  total: number

  /**
   * 逐项。
   */
  breakdown: EstimateItem[]

  /**
   * 走的是有配偶那张表吗。
   */
  withSpouse: boolean

  /**
   * 判不了的那几项的内部键,供上游反问。
   */
  needsInfo: string[]
}

/**
 * 一个闭区间。
 */
export type NumRange = {
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
 * 解析官方标签成区间的那几个函数的返回。
 */
export type RangeOut = NumRange | null

/**
 * 从官方标签读一个区间 —— 读不出则 null。
 */
export type RangeReader = (label: string) => NumRange | null

/**
 * `pickByRange` 的入参。
 */
export type PickByRangeIn = {
  /**
   * 候选行。
   */
  rows: EeGridRow[]

  /**
   * 他自己的值。
   */
  want: number

  /**
   * 怎么从标签读出这一档的区间。**由调用方注进来**。
   */
  rangeOf: RangeReader
}

/**
 * `pickByRange` 的返回:区间包含他的值的第一行;没有则 null(**不猜**)。
 */
export type PickByRangeOut = EeGridRow | null

/**
 * `estimateItem` 的入参。
 */
export type EstimateItemIn = {
  /**
   * 内部键。
   */
  factor: string

  /**
   * 人话短名。
   */
  label: string

  /**
   * 分。
   */
  points: number

  /**
   * 命中的官方原文。
   */
  matched: string

  /**
   * 出处。
   */
  evidence: EeEvidence | null

  /**
   * 判定态。
   */
  status: ItemStatus
}

/**
 * `estimateItem` / 各 picker 的返回。
 */
export type EstimateItemOut = EstimateItem

/**
 * `eeEvidenceOf` 的入参。
 */
export type EeEvidenceOfIn = {
  /**
   * 命中的那一行。
   */
  r: EeGridRow
}

/**
 * `eeEvidenceOf` 的返回。
 */
export type EeEvidenceOfOut = EeEvidence

/**
 * `needsInfoItem` 的入参。
 */
export type NeedsInfoItemIn = {
  /**
   * 内部键。
   */
  factor: string

  /**
   * 人话短名。
   */
  label: string
}

/**
 * 各 picker 共用的入参。
 */
export type PickerIn = {
  /**
   * 该表的全部行(已按 `grid` 筛过)。
   */
  rows: EeGridRow[]

  /**
   * 他的档案。
   */
  profile: CrsProfile

  /**
   * 有无配偶那一列的匹配式;FSW67 不分表,传的是恒真式也不会用到。
   */
  spouseCol: RegExp
}

/**
 * `pickEduComboCrs` 的入参。
 */
export type EduComboIn = {
  /**
   * CRS 的全部行。
   */
  rows: EeGridRow[]

  /**
   * 学历档。
   */
  edu: EduKey | null

  /**
   * 官方因素名原文。
   */
  factor: string

  /**
   * 拿去比子档门槛的那个值(语言 CLB 或加拿大经验年数)。
   */
  want: number | null

  /**
   * 内部键。
   */
  key: string

  /**
   * 人话短名。
   */
  label: string
}

/**
 * `pickForeignComboCrs` 的入参。
 */
export type ForeignComboIn = {
  /**
   * CRS 的全部行。
   */
  rows: EeGridRow[]

  /**
   * 小节标题里要含的那个片段(区分「× 语言」还是「× 加拿大经验」)。
   */
  headingHas: string

  /**
   * 海外经验月数。
   */
  expForeignMonths: number | null

  /**
   * 拿去比子档门槛的那个值。
   */
  want: number | null

  /**
   * 内部键。
   */
  key: string

  /**
   * 人话短名。
   */
  label: string
}

/**
 * 一行配上它的子档门槛 —— 只为挑档活着。
 */
export type TierRow = {
  /**
   * 那一行。
   */
  r: EeGridRow

  /**
   * 这一档的门槛。
   */
  th: number
}

/**
 * `pickBestTier` 的入参。
 */
export type PickBestTierIn = {
  /**
   * 带门槛的候选行。
   */
  scored: TierRow[]

  /**
   * 他自己的值。
   */
  want: number
}

/**
 * `pickBestTier` 的返回:门槛不超过他的值里**最高**的那一行;一档都够不到则 null。
 */
export type PickBestTierOut = EeGridRow | null

/**
 * `estimateCrs` / `estimateFsw67` 的入参。
 */
export type EstimateIn = {
  /**
   * 他的档案。
   */
  profile: CrsProfile

  /**
   * `ee_points_grid` 全部行 —— **不用预先按表筛**,本函数自己挑。
   */
  rows: EeGridRow[]
}

/**
 * `estimateCrs` / `estimateFsw67` 的返回。
 */
export type EstimateOut = EstimateResult

/**
 * `needsInfoOf` 的入参。
 */
export type NeedsInfoOfIn = {
  /**
   * 逐项。
   */
  breakdown: EstimateItem[]
}

/**
 * `needsInfoOf` 的返回:判不了的那几项的内部键,**按逐项的次序**。
 */
export type NeedsInfoOfOut = string[]

/**
 * `sumPoints` 的入参。
 */
export type SumPointsIn = {
  /**
   * 逐项。
   */
  breakdown: EstimateItem[]
}

/**
 * `sumPoints` 的返回。
 */
export type SumPointsOut = number

/**
 * `pickAdaptabilityFsw` 的返回:适应性那六项。
 */
export type AdaptOut = EstimateItem[]

/**
 * `eduYearsOf` 这类「从官方学历标签读年数」的函数的返回。
 */
export type EduYearsOut = number | null

/**
 * `eduSpecialOf` 的入参。
 */
export type EduSpecialOfIn = {
  /**
   * 学历档。
   */
  edu: EduKey
}

/**
 * `eduSpecialOf` 的返回:按学位名认的匹配式;这一档不按学位名认则 null。
 */
export type EduSpecialOfOut = RegExp | null

/**
 * `comboTierOf` 的入参。
 */
export type ComboTierOfIn = {
  /**
   * 学历档。
   */
  edu: EduKey
}

/**
 * `comboTierOf` 的返回:该学历在组合分表里对应哪一档。
 */
export type ComboTierOfOut = RegExp

/**
 * `comboSubTier` 的入参。
 */
export type ComboSubTierIn = {
  /**
   * 列名原文。
   */
  columnLabel: string
}

/**
 * `comboSubTier` 的返回:子档门槛;读不出则 null。
 */
export type ComboSubTierOut = number | null

/**
 * `monthsToYears` 的入参:月数。
 */
export type MonthsToYearsIn = number | null

/**
 * `monthsToYears` 的返回:整年数(向下取整);没答则 null。
 */
export type MonthsToYearsOut = number | null

/**
 * FSW67 各 picker 的入参 —— **不分有无配偶**,所以没有那一列。
 */
export type FswPickerIn = {
  /**
   * FSW67 的全部行。
   */
  rows: EeGridRow[]

  /**
   * 他的档案。
   */
  profile: CrsProfile
}

/**
 * `hitItem` 的入参。
 */
export type HitItemIn = {
  /**
   * 内部键。
   */
  factor: string

  /**
   * 人话短名。
   */
  label: string

  /**
   * 命中的那一行。
   */
  r: EeGridRow

  /**
   * 分(已从官方行抄好,语言那项已乘过项数)。
   */
  points: number

  /**
   * 命中原文。
   */
  matched: string
}

/**
 * `pickEduRow` 的入参。
 */
export type PickEduRowIn = {
  /**
   * 学历那几行。
   */
  cand: EeGridRow[]

  /**
   * 学历档。
   */
  edu: EduKey

  /**
   * 学制年数。
   */
  eduYears: number | null

  /**
   * 按学位名认的那把尺。
   */
  specialOf: EduSpecialReader

  /**
   * 按年数认的那把尺。
   */
  yearsOf: EduYearsReader

  /**
   * 比对前要不要先去掉首尾空白(FSW67 的原文带空白)。
   */
  trimCriterion: boolean
}

/**
 * 按学位名认学历档的那把尺。
 */
export type EduSpecialReader = (input: EduSpecialOfIn) => RegExp | null

/**
 * 按年数认学历档的那把尺。
 */
export type EduYearsReader = (criterion: string) => number | null

/**
 * `pickStudyTier` 的入参。
 */
export type PickStudyTierIn = {
  /**
   * 加拿大学习加分那几行。
   */
  cand: EeGridRow[]

  /**
   * 学制年数。
   */
  years: number
}

/**
 * `fswRowsOf` 的入参。
 */
export type FswRowsOfIn = {
  /**
   * FSW67 的全部行。
   */
  rows: EeGridRow[]

  /**
   * 官方因素名原文。
   */
  factor: string
}

/**
 * 适应性那两项的入参。
 */
export type AdaptItemIn = {
  /**
   * 官方那一行;表里没有则 null。
   */
  row: EeGridRow | null

  /**
   * 他的档案。
   */
  profile: CrsProfile
}

// =========================================================================
// 5. 估分 × 抽选线
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
// 6. 曼省 EOI
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

/**
 * `fswRowsOf` 的返回。
 */
export type FswRowsOfOut = EeGridRow[]

// =========================================================================
// 7. 正则的具名捕获组
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
 * 捕获一个拼写单词的正则命中后长这样。
 */
export type WordGroup = {
  /**
   * 那个单词。
   */
  word: string
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

/**
 * `wordGroupOf` 的返回。
 */
export type WordGroupOut = WordGroup | null

/**
 * `comboItem` 的入参。
 */
export type ComboItemIn = {
  /**
   * 带门槛的候选行。
   */
  scored: TierRow[]

  /**
   * 他自己的值。
   */
  want: number

  /**
   * 内部键。
   */
  key: string

  /**
   * 人话短名。
   */
  label: string
}

// =========================================================================
// 8. 决策页官方表包(getScoreTables;2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * 库标量一格(本域窄行取数用;json 列另走各自的 json 形状)。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行(窄查询 + 词汇表收窄)。
 */
export type Row = Record<string, Cell>

/**
 * 可空数值:官方没写保 null,不折 0。
 */
export type MaybeNum = number | null

/**
 * json 里的一格数字原料:ETL 写的是数字,经文本列绕行时可能是字符串。
 */
export type NumCell = number | string | null

/**
 * 字符串清单。
 */
export type StrList = string[]

/**
 * `ScoreFactor` 的复数。
 */
export type ScoreFactors = ScoreFactor[]

/**
 * `DrawRow` 的复数。
 */
export type DrawRows = DrawRow[]

/**
 * 抽选事实一行(pnp_draws 洗净后的本域形态)—— 比 `DrawRow` 多带 invitations。
 *
 * 🔴 invitations 必须带出来:overview 的入选条件就是「有分数线**或**有邀请数」,
 * 只带分数线的话,靠邀请数入选的那几行会显示成一整行「—」——
 * 把它入选的那个事实藏了(2026-08-12 Frank 实拍)。
 */
export type DrawFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选类别。
   */
  kind: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 通道名中文灰注(ETL 已译;没有则空串)。
   */
  streamZh: string

  /**
   * 分数线;没公布保 null。
   */
  score: number | null

  /**
   * 邀请数;没公布保 null。
   */
  invitations: number | null
}

/**
 * 抽选事实的复数。
 */
export type DrawFacts = DrawFact[]

/**
 * SSR 事实区一行:每省最近一轮有分数线或邀请数的抽选(红线见 `DrawFact`)。
 */
export type OverviewDraw = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名)。
   */
  stream: string

  /**
   * 分数线;没公布保 null。
   */
  score: number | null

  /**
   * 邀请数;没公布保 null。
   */
  invitations: number | null
}

/**
 * SSR 事实区行的复数。
 */
export type OverviewDraws = OverviewDraw[]

/**
 * 某省某年的临时居民存量拆分(学签 / 工签;访客旅游签从不计入)。
 */
export type ProvStockYear = {
  /**
   * 学签存量;官方缺位保 null。
   */
  study: number | null

  /**
   * 工签存量(TFWP+IMP);官方缺位保 null。
   */
  work: number | null

  /**
   * 该年存量快照月(StatCan 季度参考日;年末=Y-12,进行年=最新季度月,方案C 2026-08-15);
   * 没有则空串。
   */
  asOf: string
}

/**
 * 某省某年的新发学签流量。
 */
export type ProvFlowYear = {
  /**
   * 当年新发数。
   */
  n: number

  /**
   * 口径期:整年是 'YYYY',进行年带「至几月」为 'YYYY-MM'。
   */
  period: string
}

/**
 * 省提名名额三年序列(2024–2026;缺位一律 null,前端显「—」)。
 */
export type ProvQuotaYears = {
  /**
   * 2024 名额。
   */
  y2024: number | null

  /**
   * 2025 名额。
   */
  y2025: number | null

  /**
   * 2026 名额。
   */
  y2026: number | null
}

/**
 * 年份筛选序列(2026-08-14):存量近 3 年(官方停在 2024,之后年份缺位)、
 * 流量近 5 年、名额 2024–2026。
 */
export type ProvCompSeries = {
  /**
   * 年 → 存量拆分。
   */
  stocks: Record<string, ProvStockYear>

  /**
   * 年 → 流量。
   */
  flow: Record<string, ProvFlowYear>

  /**
   * 名额三年。
   */
  quota: ProvQuotaYears
}

/**
 * 新发学签**流量**(IRCC 月度表,provinces.info.studyFlow)。
 *
 * 🔴 与名额竞争比**口径不同不可混用**:比值的分母是「在库存量」(2024-12 快照,官方最新
 * 只到这儿),这一格是「当期新增」——2026 年只到 5 月,拿它当分子会把比值凭空砍一半。
 * 摆它是因为存量停在 2024,而这是唯一能反映**当下还在涌进多少人**的官方数字。
 */
export type ProvFlow = {
  /**
   * 口径期('YYYY' 或 'YYYY-MM')。
   */
  period: string

  /**
   * 当期新发数。
   */
  n: number

  /**
   * 上一年同口径;官方缺位保 null。
   */
  prevYear: number | null
}

/**
 * 各省名额竞争一行(E12-07 `stats.difficulty`,来源 IRCC 开放数据):
 * ratio = 该省临时居民存量 ÷ 该省当年省提名名额。9 省**同一个源同一套口径**,可以横向比 ——
 * 与各省自己公布的 EOI 池(AB 实时 / MB 年报 / SK·ON 不发)不是一回事,后者才是不可比的那类。
 */
export type ProvCompetition = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 临时居民存量 ÷ 省提名名额。
   */
  ratio: number

  /**
   * 难度档(ETL 算好的 tier)。
   */
  tier: string

  /**
   * 临时居民存量合计(分子)。
   */
  pool: number

  /**
   * 当年省提名名额(分母)。
   */
  quota: number

  /**
   * 存量拆分:学签。旧库行没有拆分 → null,前端回退合计列。
   */
  poolStudy: number | null

  /**
   * 存量拆分:工签(TFWP+IMP)。旧库行没有拆分 → null,前端回退合计列。
   */
  poolWork: number | null

  /**
   * 分子的统计年(asOf)。🔴 两个数不是同一年的:分子是临时居民存量的统计年,
   * 分母是名额的年份(quotaYear)—— 各行还不一样(ON/BC/AB/SK 拿到 2026 名额,
   * MB/NS/NB/NL/PE 还是 2025)。**必须逐行摆出来**,否则读者会默认它们同年。
   */
  poolYear: string

  /**
   * 分母的名额年份(红线见 poolYear)。
   */
  quotaYear: number

  /**
   * 本站算出这一行的日期(difficulty.generated;缺则落 stats.fetched)。
   */
  generated: string

  /**
   * 年份筛选序列;没有则 null。
   */
  series: ProvCompSeries | null

  /**
   * 数据源说明(difficulty json 里的 source)。
   */
  source: string

  /**
   * 新发学签流量;没有则 null(口径红线见 `ProvFlow`)。
   */
  flow: ProvFlow | null
}

/**
 * 名额竞争行的复数。
 */
export type ProvCompetitions = ProvCompetition[]

/**
 * `ProvCompetition` 或没有。
 */
export type MaybeCompetition = ProvCompetition | null

/**
 * difficulty json 里的一个因子(只声明本域真正读的那几格)。
 */
export type DifficultyFactorJson = {
  /**
   * 因子键(名额竞争是 'comp')。
   */
  key: string | null

  /**
   * 因子值(comp 的是比值)。
   */
  value: NumCell

  /**
   * 临时居民存量合计。
   */
  pool: NumCell

  /**
   * 存量拆分:学签。
   */
  poolStudy: NumCell

  /**
   * 存量拆分:工签。
   */
  poolWork: NumCell

  /**
   * 当年省提名名额。
   */
  quota: NumCell

  /**
   * 名额年份。
   */
  quotaYear: NumCell

  /**
   * 分子的统计年。
   */
  asOf: string | null

  /**
   * 数据源说明。
   */
  source: string | null
}

/**
 * difficulty json(stats.difficulty,ETL E12-07 产)里本域读的那几格。
 */
export type DifficultyJson = {
  /**
   * 难度档。
   */
  tier: string | null

  /**
   * 本站算出的日期。
   */
  generated: string | null

  /**
   * 因子清单。
   */
  factors: DifficultyFactorJson[] | null
}

/**
 * difficulty 一格的原料:json 列驱动可能已解析成对象,经文本列绕行时是字符串。
 */
export type DifficultyRaw = DifficultyJson | string | null

/**
 * `DifficultyJson` 或没有。
 */
export type MaybeDifficulty = DifficultyJson | null

/**
 * `DifficultyFactorJson` 或没有。
 */
export type MaybeCompFactor = DifficultyFactorJson | null

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY_FETCHED)。
 */
export type DifficultyDbRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 难度 json 原料。
   */
  difficulty: DifficultyRaw

  /**
   * 抓取日(generated 缺位时的兜底)。
   */
  fetched: string | null
}

/**
 * 难度行的复数。
 */
export type DifficultyDbRows = DifficultyDbRow[]

/**
 * info json 里的新发学签流量格(IRCC 月度表,scrape_ircc_stats 产)。
 */
export type StudyFlowJson = {
  /**
   * 口径年。
   */
  year: string | number | null

  /**
   * 当期新发数。
   */
  n: NumCell

  /**
   * 进行年「至几月」的英文月份缩写。
   */
  throughMonth: string | null

  /**
   * 上一年同口径。
   */
  prev: NumCell
}

/**
 * info json 里某年的存量拆分格。
 */
export type TrSeriesEntryJson = {
  /**
   * 学签存量。
   */
  study: NumCell

  /**
   * 工签存量。
   */
  work: NumCell

  /**
   * 该年存量快照月。
   */
  asOf: string | null
}

/**
 * info json 里某年的流量格。
 */
export type FlowSeriesEntryJson = {
  /**
   * 当年新发数。
   */
  n: NumCell

  /**
   * 是否整年:false = 进行年,period 要带「至几月」。
   */
  complete: boolean | null

  /**
   * 进行年「至几月」的英文月份缩写。
   */
  throughMonth: string | null
}

/**
 * info json 里的名额三年格。
 */
export type AllocJson = {
  /**
   * 2024 名额。
   */
  y2024: NumCell

  /**
   * 2025 名额。
   */
  y2025: NumCell

  /**
   * 2026 名额。
   */
  y2026: NumCell
}

/**
 * provinces.info json 里本域读的那几格。
 */
export type ProvInfoJson = {
  /**
   * 新发学签流量。
   */
  studyFlow: StudyFlowJson | null

  /**
   * 年 → 存量拆分。
   */
  trSeries: Record<string, TrSeriesEntryJson> | null

  /**
   * 年 → 流量。
   */
  flowSeries: Record<string, FlowSeriesEntryJson> | null

  /**
   * 名额三年。
   */
  alloc: AllocJson | null
}

/**
 * info 一格的原料(同 `DifficultyRaw` 的两条路)。
 */
export type ProvInfoRaw = ProvInfoJson | string | null

/**
 * `ProvInfoJson` 或没有。
 */
export type MaybeProvInfo = ProvInfoJson | null

/**
 * 一行省份维度(SQL.PROVINCES_INFO)。
 */
export type ProvInfoDbRow = {
  /**
   * 两位省码。
   */
  code: string | null

  /**
   * info json 原料。
   */
  info: ProvInfoRaw
}

/**
 * 省份维度行的复数。
 */
export type ProvInfoDbRows = ProvInfoDbRow[]

/**
 * 一行各省难度洗净后的事实 —— json 解析与拆格都在 rows 做完,functions 拿到即有效
 * (2026-08-22 Frank:值级清洗不进 functions)。
 */
export type DifficultyFact = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 名额竞争比(comp 因子的值);官方缺位保 null —— 据此不出竞争行(判断在 functions)。
   */
  ratio: MaybeNum

  /**
   * 难度档;没有是空串。
   */
  tier: string

  /**
   * 临时居民存量合计;缺位折 0(ratio 为 null 的行不会上屏)。
   */
  pool: number

  /**
   * 当年省提名名额;缺位折 0(同上)。
   */
  quota: number

  /**
   * 存量拆分:学签;官方缺位保 null。
   */
  poolStudy: MaybeNum

  /**
   * 存量拆分:工签;官方缺位保 null。
   */
  poolWork: MaybeNum

  /**
   * 分子的统计年;没有是空串。
   */
  poolYear: string

  /**
   * 分母的名额年份;缺位折 0。
   */
  quotaYear: number

  /**
   * 本站算出这一行的日期(generated 缺位落 stats.fetched)。
   */
  generated: string

  /**
   * 数据源说明;没有是空串。
   */
  source: string
}

/**
 * 难度事实的复数。
 */
export type DifficultyFacts = DifficultyFact[]

/**
 * 一行省份维度洗净后的事实 —— json 解析与 flow/series 拼装都在 rows 做完。
 */
export type ProvInfoFact = {
  /**
   * 两位省码。
   */
  code: string

  /**
   * flow/series 两格增补(没有的格是 null)。
   */
  extra: ProvInfoExtra
}

/**
 * 省份维度事实的复数。
 */
export type ProvInfoFacts = ProvInfoFact[]

/**
 * 单省的 flow/series 两格增补(info json 里读出来挂给竞争行)。
 */
export type ProvInfoExtra = {
  /**
   * 新发学签流量;没有则 null。
   */
  flow: ProvFlow | null

  /**
   * 年份筛选序列;没有则 null。
   */
  series: ProvCompSeries | null
}

/**
 * `ProvFlow` 或没有。
 */
export type MaybeFlow = ProvFlow | null

/**
 * `ProvCompSeries` 或没有。
 */
export type MaybeSeries = ProvCompSeries | null

/**
 * 省码 → flow/series 增补。
 */
export type ExtrasMap = Record<string, ProvInfoExtra>

/**
 * `attachExtras` 的入参。
 */
export type CompetitionExtrasIn = {
  /**
   * 竞争行(就地挂增补)。
   */
  rows: ProvCompetitions

  /**
   * 省码 → 增补。
   */
  extras: ExtrasMap
}

/**
 * 决策页首屏的官方表包。
 */
export type ScoreTables = {
  /**
   * SSR 事实区:每省最近一轮有分数线或邀请数的抽选。
   */
  overview: OverviewDraws

  /**
   * 每省近 6 轮**有分数**的抽选(2026-08-16):估分卡的空态诱饵。
   * 必须随 SSR 下发 —— 先前它取自 `/api/score-factors`,而那个请求只在**答满全卷**后才发,
   * 于是「选了省却看不到线」,连「先选目标省份」都还在提示(实撞)。
   * 线是免费硬事实,不该收在答题之后。
   */
  drawsRecent: DrawRows

  /**
   * 各省名额竞争(松→紧);这一页的第二条免费硬事实,要被爬到。
   */
  competition: ProvCompetitions

  /**
   * 抽选全表(近 200 轮)。
   */
  draws: DrawRows

  /**
   * 官方分值表全表。
   */
  factors: ScoreFactors

  /**
   * 本站已收录官方分值表的省 —— 决策页据此把「本站没有表」的省单列出来。
   */
  factorProvinces: StrList
}

/**
 * `getScoreTables` 的返回。
 */
export type ScoreTablesOut = Promise<ScoreTables>

/**
 * 分值域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type PointsCache = {
  /**
   * 官方表包那一份;null = 冷。
   */
  scoreTables: {
    /**
     * 灌入时刻。
     */
    at: number

    /**
     * 表包。
     */
    data: ScoreTables
  } | null
}
