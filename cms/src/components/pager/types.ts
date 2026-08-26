/**
 * pager 域的形状:翻页行的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Pager 的 props。
 */
export type PagerIn = {
  /**
   * 当前页(0 起)。
   */
  page: number

  /**
   * 总页数(≤1 时不渲染导航)。
   */
  max: number

  /**
   * 左侧说明(如「共 N 条」;可省)。
   */
  note?: React.ReactNode

  /**
   * 翻页回调(参数是目标页,0 起)。
   */
  onPage: (p: number) => void
}

/**
 * 无参无返的钮点击手柄形状(前后两枚翻页钮都是这一形)。
 */
export type ClickFn = () => void

/**
 * makePagerHandles 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 Pager 体内的 prev/next 迁出,闭包的页码与总页数改走显式入参)。
 */
export type PagerHandlesIn = {
  /**
   * 当前页(0 起)。
   */
  page: number

  /**
   * 总页数(下一页的上界)。
   */
  max: number

  /**
   * 翻页回调(参数是目标页,0 起)。
   */
  onPage: (p: number) => void
}

/**
 * makePagerHandles 交回的两枚手柄(同一格页码,一个工厂发齐)。
 */
export type PagerHandlesOut = {
  /**
   * 上一页(不低于第 0 页)。
   */
  prev: ClickFn

  /**
   * 下一页(不高于末页)。
   */
  next: ClickFn
}
