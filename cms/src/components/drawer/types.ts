/**
 * drawer 域的形状:右侧编辑面板的 props 契约。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */

/**
 * Drawer 的 props。
 */
export type DrawerIn = {
  /**
   * 面板标题(「修改档案」之类)。
   */
  title: string

  /**
   * 关面板(点遮罩、点 ×、按 Esc)。
   */
  onClose: () => void

  /**
   * 底部一行钮(保存 / 取消);没有就不出底栏。
   */
  foot?: React.ReactNode

  /**
   * 面板正文(内容多了自己滚)。
   */
  children: React.ReactNode
}
