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
   * 本省同职业时薪中位(没有是 null)。
   */
  wageMedHourly: number | null

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
 * 推荐(洗净)。
 */
export type PicksFact = {
  /**
   * 今天的推荐。
   */
  picks: PickItem[]
}

/**
 * 带职位名与两语库存译名的一行(MyJobItem / PickItem 都合这个形)。
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
   * 今天的推荐。
   */
  picks?: PickItem[]
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
}

/**
 * 中位时薪与 vs 中位两格(wageViewOf)的入参。
 */
export type WageViewIn = {
  /**
   * 本省同职业时薪中位(没有是 null)。
   */
  hourly: number | null

  /**
   * 薪资高出中位的百分比(没有是 null)。
   */
  pct: number | null
}

/**
 * 中位时薪与 vs 中位两格的显示(wageViewOf 的产出)。
 */
export type WageView = {
  /**
   * 中位时薪显示串(「$N/hr」;没有 = 空串)。
   */
  med: string

  /**
   * vs 中位显示串(「+N%」「-N%」;没有 = 空串)。
   */
  vs: string

  /**
   * 薪资低于中位(vs 中位格用琥珀;否则绿)。
   */
  down: boolean
}
