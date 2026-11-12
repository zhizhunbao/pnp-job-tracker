/**
 * points 域的子桶 federal 的形状 —— 联邦两套表(CRS 与联邦技工 67 分)共用的部分:联邦区间解析、学历档、needsInfoOf / pickEduRow / sumPoints。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 用户条件与估分结果
// =========================================================================

/**
 * 本站认的学历档。
 */
export type EduKey = 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

// =========================================================================
// 2. 联邦表(CRS / FSW67)
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
 * `monthsToYears` 的入参:月数。
 */
export type MonthsToYearsIn = number | null

/**
 * `monthsToYears` 的返回:整年数(向下取整);没答则 null。
 */
export type MonthsToYearsOut = number | null

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
