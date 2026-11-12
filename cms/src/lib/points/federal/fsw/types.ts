/**
 * points 域的子桶 federal/fsw 的形状 —— FSW67(Federal Skilled Worker 67 分资格分)估分 estimateFsw67。
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
 * `pickAdaptabilityFsw` 的返回:适应性那六项。
 */
export type AdaptOut = EstimateItem[]

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
// 3. 曼省 EOI
// =========================================================================

/**
 * `fswRowsOf` 的返回。
 */
export type FswRowsOfOut = EeGridRow[]
