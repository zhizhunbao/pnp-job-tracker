/**
 * NOC 显示域的形状 —— 本域自己声明。分类名/层级(broad/mid/fine/teer)由 ETL
 * (etl/noc.py → mart)算好存在 job 字段上,本域只负责怎么显示。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 界面语言码(镜像 i18n 的 Lang;types 是叶子不 import,加语言时装配处 tsc 会点名)。
 */
export type LangCode = 'zh' | 'en' | 'ko'

/**
 * 取词函数的最小面(i18n 的 TFn 结构兼容;本域只用「key → 词」和 lang 两格)。
 */
export type TransFn = {
  /**
   * 取词。
   */
  (key: string): string

  /**
   * 当前语言(TFn 挂的只读字段;可缺 —— 外部形状)。
   */
  // eslint-disable-next-line local/no-optional -- 镜像 i18n TFn 的形状:lang 在那边就是可选挂载字段
  lang?: LangCode
}

/**
 * 一个分类色(底色 + 前景)。
 */
export type Cat = {
  /**
   * 底色。
   */
  bg: string

  /**
   * 前景色。
   */
  fg: string
}

/**
 * 登记译名时的一行(dims 的 noc_categories 行;各列可缺,Partial 语义)。
 */
export type CatLabelRow = Partial<{
  /**
   * 大类(数据层中文值)。
   */
  broad: string

  /**
   * 中类。
   */
  mid: string

  /**
   * 小类。
   */
  fine: string

  /**
   * 大类英文名。
   */
  broadEn: string

  /**
   * 大类韩文名。
   */
  broadKo: string

  /**
   * 中类英文名。
   */
  midEn: string

  /**
   * 中类韩文名。
   */
  midKo: string

  /**
   * 小类英文名。
   */
  fineEn: string

  /**
   * 小类韩文名。
   */
  fineKo: string
}>

/**
 * 登记行的复数。
 */
export type CatLabelRows = CatLabelRow[]

/**
 * 登记表的一格(某个中文分类值的英/韩名;可缺)。
 */
export type CatL10n = Partial<{
  /**
   * 英文名。
   */
  en: string

  /**
   * 韩文名。
   */
  ko: string
}>

/**
 * NOC 显示域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type NocCache = {
  /**
   * 分类值 → 英/韩名登记表(页面拿到 dims 时登记一次;查不到走 i18n 回退)。
   */
  labels: Record<string, CatL10n>
}

/**
 * `catName` 的入参。
 */
export type CatNameIn = {
  /**
   * 取词函数。
   */
  t: TransFn

  /**
   * 数据层分类值(中文)。
   */
  value: string
}

/**
 * 职业名行要读的几列(全声明;来源行缺列经 Partial 缺席)。
 */
export type OccNameFields = {
  /**
   * NOC 官方英文名(引用依据)。
   */
  title: string

  /**
   * 完整中文译名。
   */
  titleZh: string

  /**
   * 完整韩文译名。
   */
  titleKo: string

  /**
   * 窄位中文短名。
   */
  titleZhShort: string

  /**
   * 窄位韩文短名。
   */
  titleKoShort: string

  /**
   * 窄位英文短名。
   */
  titleEnShort: string
}

/**
 * 名字判定的输入行(各列可缺;缺席语义与 patch 同类,不引入 undefined 进自家字段声明)。
 */
export type OccNameRow = Partial<OccNameFields>

/**
 * `pickName` 的入参。
 */
export type PickNameIn = {
  /**
   * 名字行;没有则 null(返回空串,调用方不渲染)。
   */
  row: OccNameRow | null

  /**
   * 界面语言码(宽字符串:非 zh/ko 一律按英文)。
   */
  lang: string
}

/**
 * 大分类值或没有(`colorOf` 的入参;没有/空串给中性色)。
 */
export type MaybeBroad = string | null

/**
 * `nocLocalTitle` 的入参。
 */
export type NocLocalTitleIn = {
  /**
   * 职业名行;没有则 null(返回空串,调用方不渲染灰注)。
   */
  row: OccNameRow | null

  /**
   * 界面语言码。
   */
  lang: LangCode
}
