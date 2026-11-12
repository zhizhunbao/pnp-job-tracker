/**
 * points 域的子桶 federal/crs 的形状 —— CRS(Comprehensive Ranking System,快速通道排名分)估分 estimateCrs。
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

// =========================================================================
// 3. 正则的具名捕获组
// =========================================================================

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
