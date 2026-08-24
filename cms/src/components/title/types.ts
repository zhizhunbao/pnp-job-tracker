/**
 * title 域的形状:两种标题变体的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Title(页面二级标题)的 props。
 */
export type TitleIn = {
  /**
   * 右槽(可挂「更多 →」这类链接;可省)。
   */
  right?: React.ReactNode

  /**
   * 标题文字。
   */
  children: React.ReactNode
}

/**
 * ModalTitle(弹框标题)的 props。
 */
export type ModalTitleIn = {
  /**
   * 17px 标题(右侧给关闭钮留位)。
   */
  title: React.ReactNode
}
