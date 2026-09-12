/**
 * 城市详情页组件桶的形状(本域自声明,只声明真读的格 —— lib/stats 的基面全格喂进来,
 * 结构兼容,不 import)。
 *
 * @author Frank
 * @time 2026-09-12 02:30:00
 */

/**
 * 取词函数的形(各域自抄)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言三字面量(各域自抄)。
 */
export type CityLang = 'zh' | 'en' | 'ko'

/**
 * by_broad 展开的一组行(lib/stats CityIndustryRow 里本桶真读的四格)。
 */
export type CityGroupIn = {
  /**
   * 行业组键(IND_KEYS 之一)。
   */
  broad: string

  /**
   * 该组在招岗数。
   */
  n: number

  /**
   * 该组中位年薪;没有 null。
   */
  wage: number | null

  /**
   * 该组中位时薪;没有 null。
   */
  hourly: number | null
}

/**
 * 城市基面(lib/stats CityDetail 里本桶真读的格)。
 */
export type CityFace = {
  /**
   * 城英文名。
   */
  city: string

  /**
   * 中文译名;没有是空串。
   */
  cityZh: string

  /**
   * 韩文译名;没有是空串。
   */
  cityKo: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * CSD 人口;官方没有 null。
   */
  population: number | null

  /**
   * 所在都会区失业率;不在 CMA null。
   */
  unempRate: number | null

  /**
   * 在招岗数;无快照 null。
   */
  openJobs: number | null

  /**
   * 近 7 天发布;无快照 null。
   */
  new7d: number | null

  /**
   * 全城中位年薪;无快照 null。
   */
  medianWageAnnual: number | null

  /**
   * 城内在招 AIP 资格岗数;无快照 null。
   */
  aipJobs: number | null

  /**
   * 行业分布(一组一行)。
   */
  groups: CityGroupIn[]
}

/**
 * DLI 一行(lib/stats CitySchoolRow 里本桶真读的三格)。
 */
export type CitySchoolIn = {
  /**
   * 院校官方名。
   */
  name: string

  /**
   * 公立与否。
   */
  isPublic: boolean

  /**
   * 毕业可申工签与否。
   */
  gradProgram: boolean
}

/**
 * City(城市详情视图)的 props。
 */
export type CityIn = {
  /**
   * 城市基面(cities 打底 + 快照;查无城时门给最小壳走 Notice)。
   */
  city: CityFace

  /**
   * 该城 DLI 名单;没有是空清单(块不出)。
   */
  schools: CitySchoolIn[]

  /**
   * 该城命中的试点通道名(RCIP / FCIP);没有是空清单。
   */
  pilotTypes: string[]

  /**
   * 查无城(slug 拼错 / 城不在维度表)时 true,正文换 Notice。
   */
  missing: boolean

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
}

/**
 * `cityTitleOf` 的入参。
 */
export type CityTitleIn = {
  /**
   * 城市基面。
   */
  city: CityFace

  /**
   * 界面语言。
   */
  lang: CityLang
}

/**
 * `localNameOf` 的入参。
 */
export type LocalNameIn = {
  /**
   * 城英文名。
   */
  city: string

  /**
   * 中文译名;没有是空串。
   */
  zh: string

  /**
   * 韩文译名;没有是空串。
   */
  ko: string

  /**
   * 界面语言。
   */
  lang: CityLang
}

/**
 * H1 双行的两格(主文案 + 灰注;照城市显示约定)。
 */
export type CityTitleOut = {
  /**
   * 主文案(界面语言译名;没有用英文名)。
   */
  main: string

  /**
   * 灰注(「英文名 省码」;主文案已是英文时只剩省码)。
   */
  note: string
}

/**
 * `factRowsOf` 的入参。
 */
export type FactRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 城市基面。
   */
  city: CityFace

  /**
   * 该城命中的试点通道名。
   */
  pilotTypes: string[]
}

/**
 * 概览一行(标签 + 值)。
 */
export type FactRow = {
  /**
   * 行键。
   */
  key: string

  /**
   * 标签。
   */
  label: string

  /**
   * 值文案(缺格显杠)。
   */
  value: string
}

/**
 * 行业分布表列构造的入参。
 */
export type GroupColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 行业分布一行的展示形(组名按界面语言,值格文案化)。
 */
export type GroupRow = {
  /**
   * 组键(行身份)。
   */
  key: string

  /**
   * 界面语言组名。
   */
  label: string

  /**
   * 在招岗数。
   */
  n: number

  /**
   * 在招文案。
   */
  nText: string

  /**
   * 中位时薪文案(没有显杠)。
   */
  hourlyText: string

  /**
   * 中位年薪文案(没有显杠)。
   */
  wageText: string
}

/**
 * `groupRowsOf` 的入参。
 */
export type GroupRowsIn = {
  /**
   * 取词函数(组名词条)。
   */
  t: TFn

  /**
   * by_broad 展开的组行。
   */
  groups: CityGroupIn[]
}

/**
 * DLI 名单表列构造的入参。
 */
export type SchoolColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * DLI 名单一行的展示形。
 */
export type SchoolRow = {
  /**
   * 行键(院校名)。
   */
  key: string

  /**
   * 院校官方名。
   */
  name: string

  /**
   * 类型文案(公立 / 私立)。
   */
  typeText: string

  /**
   * 毕业可申工签文案(勾 / 杠)。
   */
  gradText: string
}

/**
 * `schoolRowsOf` 的入参。
 */
export type SchoolRowsIn = {
  /**
   * 取词函数(公立 / 私立词条)。
   */
  t: TFn

  /**
   * DLI 名单。
   */
  schools: CitySchoolIn[]
}
