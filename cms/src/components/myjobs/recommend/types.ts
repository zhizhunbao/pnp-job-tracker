/**
 * myjobs 桶的子桶 recommend —— 「我的求职」今日推荐这一节:形状(本桶自声明;推荐线格式与父桶同形各写一份)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:原先按函数长相切的 cos / why / ask / today 四个子桶撤掉 ——
 * 删除确认、公司名懒翻三张表都用,回父桶;推荐原因、通道名、显示更多 / 打码行、推荐取数与「删除」(不再推)是「今日推荐」这一节,
 * 并成本子桶(判据同 prefs / thread:页面上的一节)。依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-10-12 22:00:00
 */

/**
 * 取词函数(与父桶同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 一枚胶囊(父桶 TagItem 的子集:推荐原因只用 ok 档)。
 */
export type WhyTag = {
  /**
   * 字。
   */
  text: string

  /**
   * tag 桶的档。
   */
  variant: 'ok'
}

/**
 * 推荐原因的字(whyTextsOf)的入参。
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
   * 取词函数。
   */
  t: TFn

  /**
   * 雇主办过的 LMIA 外劳名额。
   */
  lmiaPositions: number

  /**
   * EE 定向类别(英文原名)。
   */
  eeCategory: string

  /**
   * 社区试点名(RCIP / FCIP;没有 = 空串;2026-10-12 Frank「现在有数据能知道 这个雇主愿不愿意帮忙 弄 pr 吗」「知名公司 也算 一个吧」)。
   */
  pilot: string
}

/**
 * 界面语。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 带职位名与两语库存译名的一行。
 */
export type TitledItem = {
  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 库里存好的中文译名。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名。
   */
  titleKo: string
}

/**
 * 推荐整包里本桶读的格(父桶 PicksFact 的子集)。
 */
export type PicksPack = {
  /**
   * 看得见的推荐。
   */
  picks: TitledItem[]

  /**
   * 还有几条看不见。
   */
  more: number

  /**
   * 锁住给看的几条。
   */
  locked: TitledItem[]
}

/**
 * 表里列哪几条(shownPicksOf)的入参。
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
 * 「显示更多」后面的条数(hiddenPicksOf)的入参。
 */
export type HiddenPicksIn = {
  /**
   * 推荐整包。
   */
  data: PicksPack

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
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 通道两行名:英文黑字 + 界面语灰字(不走省提名两格都空)。
 */
export type ChanName = {
  /**
   * 英文名。
   */
  en: string

  /**
   * 界面语名(英文界面或与英文同字给空串)。
   */
  sub: string
}

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
   * 具名省提名通道(没有 = 空串;2026-10-12 通道列)。
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
   * 推荐理由码(2026-10-12 Frank「还是需要一个 推荐原因的列 然后 bullets 显示 好处」)。
   */
  reasons: string[]

  /**
   * 薪资高出本省同职业中位的百分比(没有是 null)。
   */
  abovePct: number | null


  /**
   * 雇主办过的 LMIA 外劳名额(没有是 0;2026-10-12 Frank「整点有吸引力的 bullets」)。
   */
  lmiaPositions: number

  /**
   * EE 定向类别(没有 = 空串)。
   */
  eeCategory: string

  /**
   * 社区试点名(RCIP / FCIP;没有 = 空串;2026-10-12 Frank「现在有数据能知道 这个雇主愿不愿意帮忙 弄 pr 吗」「知名公司 也算 一个吧」)。
   */
  pilot: string
}

/**
 * 「显示更多」里锁住的一条(线格式:职位名与通道;2026-10-12 理由胶囊撤、改读通道三格)。
 */
export type LockedItem = {
  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 省码。
   */
  province: string

  /**
   * 具名省提名通道(没有 = 空串;2026-10-12 通道列)。
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
   * 职位名中文译名(2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」)。
   */
  titleZh: string

  /**
   * 职位名韩文译名。
   */
  titleKo: string
}

/**
 * 推荐接口回包(信任边界:缺席的格按空读)。
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
   * 不用服务端当天缓存、现算一份(2026-10-11:这一页答过档案)。
   */
  fresh: boolean
}

/**
 * 今日推荐「删除」手柄(makeDismiss)的入参。
 */
export type DismissIn = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 删之前的整包推荐(请求失败时退回它)。
   */
  data: PicksFact

  /**
   * 写推荐。
   */
  setData: (v: PicksFact) => void
}
