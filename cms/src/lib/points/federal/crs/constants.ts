/**
 * points 域的子桶 federal/crs 的常量 —— CRS(Comprehensive Ranking System,快速通道排名分)估分 estimateCrs。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 联邦表:分表、分节与列
// =========================================================================

/**
 * 官方表里的行类别 —— 只有明细行参与查表。
 */
export const EE_KIND_DETAIL = 'detail'

/**
 * CRS 的分节。
 */
export const EE_SECTION = {
  /**
   * A:核心人力资本。
   */
  core: 'A',

  /**
   * C:技能可转移性(组合分)。
   */
  combo: 'C',

  /**
   * D:附加分(加拿大学习等)。
   */
  extra: 'D',
} as const

/**
 * 有配偶随行那一列。
 */
export const EE_COL_WITH_SPOUSE = /^with a spouse/i

/**
 * 无配偶随行那一列。
 */
export const EE_COL_WITHOUT_SPOUSE = /^without a spouse/i

/**
 * CRS 语言那几行里,第一官方语言那一块。
 */
export const EE_HEAD_FIRST_LANG = /first official language/i

/**
 * CRS 组合分里「海外工作经验」那一块。
 */
export const EE_HEAD_FOREIGN_EXP = 'foreign work experience'

/**
 * CRS 组合分:海外经验 × 语言那一块的标题片段。
 */
export const EE_HEAD_GOOD_LANG = 'good official language'

/**
 * CRS 组合分:海外经验 × 加拿大经验那一块的标题片段。
 */
export const EE_HEAD_CANADA_EXP = 'canadian work experience'

/**
 * CRS 加拿大学习加分那几行。
 */
export const EE_CRIT_CANADA_STUDY = /post-secondary education in canada/i

/**
 * CRS 加拿大学习加分:三年及以上那一档。
 */
export const EE_CRIT_STUDY_LONG = /three years or longer/i

/**
 * CRS 加拿大学习加分:一到两年那一档。
 */
export const EE_CRIT_STUDY_SHORT = /one or two years/i

// =========================================================================
// 2. 联邦表:学历档与组合分门槛
// =========================================================================

/**
 * CRS 学历档里能读出「几年制」的那几条。
 */
export const CRS_EDU_YEARS = {
  /**
   * 一年制。
   */
  one: /^one-year degree/i,

  /**
   * 两年制。
   */
  two: /^two-year program/i,

  /**
   * 学士或三年及以上。
   */
  three: /bachelor's degree or a three or more year program/i,
} as const

/**
 * CRS 学历档里**不按年数**、按学位名认的那几条。
 */
export const CRS_EDU_SPECIAL = {
  /**
   * 博士。
   */
  doctorate: /^doctoral level/i,

  /**
   * 硕士。
   */
  master: /^master's degree/i,

  /**
   * 高中。
   */
  highschool: /^secondary diploma/i,
} as const

/**
 * CRS 组合分里,按学历分的那几档门槛写法。
 */
export const CRS_COMBO_TIER = {
  /**
   * 博士档。
   */
  doctorate: /doctoral level/i,

  /**
   * 硕士档。
   */
  master: /master's level/i,

  /**
   * 高中及以下档。
   */
  highschool: /secondary school \(high school\) credential or less/i,

  /**
   * 其余一律走「一年及以上专上」那一档。
   */
  other: /^post-secondary program credential of one year or longer$/i,
} as const

/**
 * CRS 组合分的子档门槛 —— 列名里带 CLB9 / CLB7 / 2 years or more / 1 year。
 */
export const CRS_SUB_TIER = {
  /**
   * CLB 9。
   */
  clb9: /clb\s*9/i,

  /**
   * CLB 7。
   */
  clb7: /clb\s*7/i,

  /**
   * 两年及以上。
   */
  years2: /2\s*years?\s*or more/i,

  /**
   * 一年。
   */
  year1: /\b1\s*year\b/i,
} as const

/**
 * CRS 组合分子档的分值(**是门槛不是分**:分照抄官方行)。
 */
export const SUB_TIER_VALUE = {
  /**
   * CLB 9 档。
   */
  clb9: 9,

  /**
   * CLB 7 档。
   */
  clb7: 7,

  /**
   * 两年档。
   */
  years2: 2,

  /**
   * 一年档。
   */
  year1: 1,
} as const

/**
 * CRS 加拿大学习加分:三年及以上那一档的年数门槛。
 */
export const CRS_STUDY_LONG_YEARS = 3

/**
 * CRS 加拿大学习加分:一到两年那一档的年数门槛。
 */
export const CRS_STUDY_SHORT_YEARS = 1
