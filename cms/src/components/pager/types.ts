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
