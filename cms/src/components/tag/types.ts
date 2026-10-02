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
   * 界面语取词函数(展开 / 收起钮面由 pager 桶 FoldLine 现拼;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」,原「展开钮 / 收起钮两枚现成钮面」撤)。
   */
  t: TagT

  /**
   * 展开钮的量词(调用方取好词,如「个」)。
   */
  unit: string
}

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本域自抄,types 不许 import)。
 */
export type TagT = (key: string, vars?: Record<string, string | number>) => string

/**
 * tagsShownOf 的入参:全部标签、默认露几枚与已展开几枚。
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
   * 已展开几枚(收着为 0)。
   */
  extra: number
}

