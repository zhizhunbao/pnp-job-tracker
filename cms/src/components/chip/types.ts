/**
 * chip 域的形状:筛选药丸的 props 契约与类名预算入参。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Chip 的 props。
 */
export type ChipIn = {
  /**
   * 是否选中(主色实底)。
   */
  active?: boolean

  /**
   * 是否强调红(未选中但要引起注意;选中态优先于它)。
   */
  hot?: boolean

  /**
   * 点击回调(可省 = 纯展示)。
   */
  onClick?: () => void

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 调用方追加类:只用来接全局规范类(如手机触控靶 tapPad),
   * 长相仍归本域 —— 传别的类等于绕过药丸规格。
   */
  className?: string

  /**
   * 药丸文字。
   */
  children: React.ReactNode
}

/**
 * chipClsOf 的入参:两个态开关。
 */
export type ChipClsIn = {
  /**
   * 调用方追加的全局规范类(如 tapPad);null = 没有。
   */
  extra: string | null

  /**
   * 是否选中。
   */
  active: boolean

  /**
   * 是否强调红(选中态优先)。
   */
  hot: boolean
}
