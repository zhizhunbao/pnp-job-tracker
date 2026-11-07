/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的形状(本桶自声明;推荐线格式与父桶同形的各自抄)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 今日推荐一行(线格式;lib/myjobs 的 PickRow 全格照抄)。
 */
export type PickItem = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名中文译文(没有 = 空串)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 发布日期(ISO;没有 = 空串)。
   */
  datePosted: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 具名省提名通道(没有 = 空串)。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 本省有省默认通道。
   */
  provDefault: boolean

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 薪资高出本省同职业中位的百分比(没有是 null)。
   */
  abovePct: number | null

  /**
   * 雇主办过的 LMIA 外劳名额(没有是 0)。
   */
  lmiaPositions: number

  /**
   * EE 定向类别(没有 = 空串)。
   */
  eeCategory: string

  /**
   * 社区试点名(RCIP / FCIP;没有 = 空串)。
   */
  pilot: string
}

/**
 * 「显示更多」里锁住的一条(线格式:职位名与通道)。
 */
export type LockedItem = {
  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名中文译名。
   */
  titleZh: string

  /**
   * 职位名韩文译名。
   */
  titleKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 具名省提名通道(没有 = 空串)。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 本省有省默认通道。
   */
  provDefault: boolean
}

/**
 * 推荐(洗净)。
 */
export type PicksFact = {
  /**
   * 看得见的推荐。
   */
  picks: PickItem[]

  /**
   * 还有几条看不见。
   */
  more: number

  /**
   * 锁住给看的几条。
   */
  locked: LockedItem[]
}

/**
 * 带职位名与两语库存译名的一行(MyJobItem / PickItem / LockedItem 都合这个形)。
 */
export type TitledItem = {
  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 库里存好的中文译名(没有 = 空串)。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名。
   */
  titleKo: string
}

/**
 * 今日推荐接口的回包(线格式;缺席按空读)。
 */
export type PicksRespJson = {
  /**
   * 看得见的推荐。
   */
  picks?: PickItem[]

  /**
   * 还有几条看不见。
   */
  more?: number

  /**
   * 锁住给看的几条。
   */
  locked?: LockedItem[]
}

/**
 * 拉推荐(makeLoadPicks)的入参。
 */
export type LoadPicksIn = {
  /**
   * 写推荐。
   */
  setData: (v: PicksFact) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void

  /**
   * 这一页答过档案,让服务端现算(不用当天缓存)。
   */
  fresh: boolean

  /**
   * 第几批(0 = 当天第一批)。
   */
  batch: number
}

/**
 * 「换一批」(makeSwap)的入参。
 */
export type SwapIn = {
  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 现在的批号。
   */
  batch: number

  /**
   * 改批号。
   */
  setBatch: (v: number) => void

  /**
   * 收起「显示更多」。
   */
  setExpanded: (v: boolean) => void

  /**
   * 开定价框。
   */
  setUpsell: (v: boolean) => void
}

/**
 * shownPicksOf 的入参。
 */
export type ShownPicksIn<T> = {
  /**
   * 看得见的推荐。
   */
  items: T[]

  /**
   * 点过「显示更多」。
   */
  expanded: boolean
}

/**
 * hiddenPicksOf 的入参。
 */
export type HiddenPicksIn = {
  /**
   * 推荐整包。
   */
  data: PicksFact

  /**
   * 点过「显示更多」。
   */
  expanded: boolean
}

/**
 * 通道两行名(chanNameOf)的入参。
 */
export type ChanNameIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 具名省提名通道。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 本省有省默认通道。
   */
  provDefault: boolean

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 通道两行名。
 */
export type ChanName = {
  /**
   * 英文名(不走省提名 = 空串)。
   */
  en: string

  /**
   * 界面语名(英文界面、与英文同字或没有 = 空串)。
   */
  sub: string
}

/**
 * 推荐原因(whyTagsOf)的入参。
 */
export type WhyTextsIn = {
  /**
   * 理由码。
   */
  reasons: string[]

  /**
   * 薪资高出中位的百分比(没有是 null)。
   */
  abovePct: number | null

  /**
   * LMIA 名额。
   */
  lmiaPositions: number

  /**
   * EE 定向类别。
   */
  eeCategory: string

  /**
   * 社区试点名。
   */
  pilot: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 一枚推荐原因胶囊。
 */
export type WhyTag = {
  /**
   * 字。
   */
  text: string

  /**
   * tag 桶的档(绿)。
   */
  variant: 'ok'
}
