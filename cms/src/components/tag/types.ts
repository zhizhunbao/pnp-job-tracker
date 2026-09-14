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
