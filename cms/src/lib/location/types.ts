/**
 * 地点域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 取词函数的最小面(i18n 的 TFn 结构兼容;本域只用「key → 词」这一格)。
 */
export type TransFn = (key: string) => string

/**
 * `provName` 的入参。
 */
export type ProvNameIn = {
  /**
   * 取词函数。
   */
  t: TransFn

  /**
   * 两位省码(大小写不敏感)。
   */
  code: string

  /**
   * true = 只出界面语言的省名(Frank 2026-08-16「中文模式只显示中文即可」:
   * `<option>` 里没有灰字小注这一手,「Ontario(安大略省)」在下拉里就是一行两遍)。
   */
  localeOnly: boolean
}

/**
 * 地点行要读的几格(JobRow 的地点子集;列全声明,可空照库)。
 */
export type LocJob = {
  /**
   * 国家。
   */
  country: string | null

  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 区(大渥太华社区等)。
   */
  district: string | null

  /**
   * 精确地址(含街号才有,见数据约定)。
   */
  address: string | null
}

/**
 * 拆解后的显示地点。
 */
export type ParsedLoc = {
  /**
   * 国家。
   */
  country: string

  /**
   * 省全名(仅显示用;筛选仍用 PROV_NAMES 的英文全名)。
   */
  prov: string

  /**
   * 城市。
   */
  city: string

  /**
   * 区。
   */
  district: string
}

/**
 * `mapQuery` 的入参。
 */
export type MapQueryIn = {
  /**
   * 哪一级(country/province/city/district,其余按地址级)。
   */
  field: string

  /**
   * 职位的地点格。
   */
  job: LocJob
}

/**
 * `cleanProvs` 的入参。
 */
export type CleanProvsIn = {
  /**
   * 模型给的省码清单(原料就是可缺的模型输出;undefined 在函数第一行收)。
   */
  // eslint-disable-next-line local/no-optional -- 三个调用点的原料是模型输出的可缺字段,由这一格收
  raw?: string[]
}

/**
 * 省码清单。
 */
export type ProvList = string[]
