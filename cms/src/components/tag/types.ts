/**
 * tag 域的形状:状态标签的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 标签变体(七种,一种一套配色,值 = 把脉页胶囊那套):region 省/地区(绿)、federal 联邦(青)、imp 重要/紧(红)、
 * warn 关注/中(黄)、ok 通过/易(绿)、pro 付费层(金)、gray 中性事实标签(灰)。
 */
export type TagVariant = 'region' | 'federal' | 'imp' | 'warn' | 'ok' | 'pro' | 'gray'

/**
 * Tag 的 props。
 */
export type TagIn = {
  /**
   * 变体(可省 = region)。
   */
  variant?: TagVariant

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 标签文字。
   */
  children: React.ReactNode
}

/**
 * TagFold(可折叠的一排标签)的 props。
 */
export type TagFoldIn = {
  /**
   * 全部标签文字(顺序即渲染顺序;同一排里不重复)。
   */
  items: string[]

  /**
   * 收着时露前几枚。
   */
  first: number

  /**
   * 这一排标签的变体。
   */
  variant: TagVariant

  /**
   * 展开钮的钮面(调用方拼好,如「展开其余 5 个」)。
   */
  moreText: string

  /**
   * 收起钮的钮面。
   */
  lessText: string
}

/**
 * tagsShownOf 的入参:全部标签、默认露几枚与展开态。
 */
export type TagsShownIn = {
  /**
   * 全部标签文字。
   */
  items: string[]

  /**
   * 收着时露前几枚。
   */
  first: number

  /**
   * 已展开。
   */
  all: boolean
}

/**
 * 布尔态的落格(useState 的 setter,签名由 React 定死)。
 */
export type SetBoolFn = (v: boolean) => void

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

/**
 * makeFoldToggle 的入参:现值与落格。
 */
export type FoldToggleIn = {
  /**
   * 当前开合。
   */
  on: boolean

  /**
   * 落格。
   */
  set: SetBoolFn
}
