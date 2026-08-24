/**
 * button 域的形状:按钮的 props 契约与类名预算入参。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 按钮变体(颜色语义):primary 普通行动蓝 / pro 付费琥珀 / secondary 白底描边 /
 * ai AI 功能靛蓝 / ghost 弱操作幽灵 / danger 危险红。
 */
export type ButtonKind = 'primary' | 'pro' | 'secondary' | 'ai' | 'ghost' | 'danger'

/**
 * Button 的 props。
 */
export type ButtonIn = {
  /**
   * 变体(可省 = primary)。
   */
  kind?: ButtonKind

  /**
   * 小一号档。
   */
  sm?: boolean

  /**
   * 大一号档(与 sm 互斥,都传按 sm 算)。
   */
  lg?: boolean

  /**
   * 禁用(禁用时 href 形态也退回 <button>)。
   */
  disabled?: boolean

  /**
   * 点击回调(可省 = 纯链接形态)。
   */
  onClick?: () => void

  /**
   * 传了就渲成 <a>(内链要被爬到);禁用时不生效。
   */
  href?: string

  /**
   * <a> 的 target(传了自动补 rel="noreferrer")。
   */
  target?: string

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 调用方几何微调(宽度/边距这类;过渡口 —— 消费页形制化后逐个收进各页的类)。
   */
  style?: React.CSSProperties

  /**
   * 调用方追加类(过渡口,同上)。
   */
  className?: string

  /**
   * 钮文字。
   */
  children: React.ReactNode
}

/**
 * btnClsOf 的入参:变体与尺寸档。
 */
export type BtnClsIn = {
  /**
   * 变体。
   */
  kind: ButtonKind

  /**
   * 小一号档。
   */
  sm: boolean

  /**
   * 大一号档。
   */
  lg: boolean

  /**
   * 调用方追加类;null = 没有。
   */
  className: string | null
}
