/**
 * points 域的子桶 federal/fsw 的常量 —— FSW67(Federal Skilled Worker 67 分资格分)估分 estimateFsw67。
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
 * FSW67 语言只取「Speaking」那一列 —— 官方四项同档,取一列 × 4。
 */
export const EE_COL_SPEAKING = 'Speaking'

/**
 * FSW67 适应性:加拿大学习那一行。
 */
export const EE_CRIT_PAST_STUDY = /^your past studies in canada/i

/**
 * FSW67 适应性:加拿大工作那一行。
 */
export const EE_CRIT_PAST_WORK = /^your past work in canada/i

// =========================================================================
// 2. 联邦表:学历档与组合分门槛
// =========================================================================

/**
 * FSW67 学历档里的「… plus a …」双证书组合行 —— 档案没有「第二证书」字段,**不猜那一档**。
 */
export const FSW_EDU_PLUS = /plus a/i

/**
 * FSW67 学历档里能读出「几年制」的那几条。
 */
export const FSW_EDU_YEARS = {
  /**
   * 一年制。
   */
  one: /^one-year/i,

  /**
   * 两年制。
   */
  two: /^two-year/i,

  /**
   * 三年制。
   */
  three: /^three-year/i,

  /**
   * 四年制。
   */
  four: /^four-year/i,
} as const

/**
 * FSW67 学历档里按学位名认的那几条。
 */
export const FSW_EDU_SPECIAL = {
  /**
   * 博士。
   */
  doctorate: /^doctorate \(ph\.?d\.?\)$/i,

  /**
   * 硕士。
   */
  master: /^master's degree$/i,

  /**
   * 高中。
   */
  highschool: /^secondary school diploma$/i,
} as const

/**
 * FSW67 适应性:加拿大学习要满几个学年。
 */
export const FSW_ADAPT_STUDY_YEARS = 2

/**
 * FSW67 适应性:加拿大工作要满几个月。
 */
export const FSW_ADAPT_WORK_MONTHS = 12

/**
 * 命中标签在留痕里截断到几个字。
 */
export const MATCHED_MAX = 40
