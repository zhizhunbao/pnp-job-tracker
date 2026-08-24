/**
 * grid 域的形状:事实网格的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Grid 的 props。
 */
export type GridIn = {
  /**
   * 列数(children 按行铺平,每行 cols 个格)。
   */
  cols: number

  /**
   * 格子(单元格角色类 gridK/gridV/gridN 由调用方按格写,组件不按列位自动派 ——
   * 同一列在不同行里角色可以不同,按列位派一半场合是错的)。
   */
  children: React.ReactNode
}
