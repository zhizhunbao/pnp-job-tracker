/**
 * title 域的形状:标题块的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Eyebrow 的 props。
 */
export type EyebrowIn = {
  /**
   * 小字内容;null/没传 = 整块不渲染。
   */
  eyebrow: React.ReactNode

  /**
   * 是否深靛蓝档。
   */
  deep: boolean
}

/**
 * ModalTitle 的 props。
 */
export type ModalTitleIn = {
  /**
   * eyebrow 小字(可省)。
   */
  eyebrow?: React.ReactNode

  /**
   * eyebrow 深靛蓝档(默认靛蓝;全站只有简历匹配弹框用深档)。
   */
  deep?: boolean

  /**
   * 17px 标题(右侧给关闭钮留位)。
   */
  title: React.ReactNode
}
