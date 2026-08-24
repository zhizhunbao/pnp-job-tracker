/**
 * row 域的形状:事实行的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Row 的 props。
 */
export type RowIn = {
  /**
   * 标签(k = key,「标签-值」的左格)。
   */
  k: React.ReactNode

  /**
   * 值;null / '' / '—' 时整行不渲染(空值守卫在组件体内)。
   */
  children: React.ReactNode
}
