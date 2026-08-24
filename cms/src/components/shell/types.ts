/**
 * shell 域的形状:正文轨的 props 契约与类名预算入参。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 上内衬档(px;不传 = 默认 4px)。全站实查只有这几档,数字即像素。
 */
export type ShellTop = 0 | 14 | 16 | 18 | 32 | 40

/**
 * 下内衬档(px;不传 = 默认 32px)。
 */
export type ShellBottom = 0 | 40

/**
 * Shell 的 props。
 */
export type ShellIn = {
  /**
   * 上内衬档(可省/null = 默认 4px)。
   */
  top?: ShellTop | null

  /**
   * 下内衬档(可省/null = 默认 32px)。
   */
  bottom?: ShellBottom | null

  /**
   * 页面内容。
   */
  children: React.ReactNode
}

/**
 * shellClsOf 的入参:上/下内衬档,null = 用默认档。
 */
export type ShellClsIn = {
  /**
   * 上内衬档;null = 默认 4px(不叠修饰类)。
   */
  top: ShellTop | null

  /**
   * 下内衬档;null = 默认 32px。
   */
  bottom: ShellBottom | null
}
