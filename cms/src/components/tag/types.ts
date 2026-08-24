/**
 * tag 域的形状:状态标签的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 标签变体(六种状态,一种一套配色):region 省/地区、federal 联邦、imp 重要、
 * warn 关注、ok 通过、pro 付费层。
 */
export type TagVariant = 'region' | 'federal' | 'imp' | 'warn' | 'ok' | 'pro'

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
