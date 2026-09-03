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
   * 右上角返回钮(详情页递 BackButton;主页面不递 —— 2026-09-03 Frank「所有主页面都不应该有
   * 返回按钮,所有详情页面的返回按钮都在右上,样式和位置应该是固定统一的」)。
   * 位置由本壳钉死:正文轨右上角,与上内衬齐平。
   */
  back?: React.ReactNode

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

/**
 * Frame(整页外框)的 props。
 */
export type FrameIn = {
  /**
   * 整页内容(顶栏 / 正文 / 页脚)。
   */
  children: React.ReactNode
}
