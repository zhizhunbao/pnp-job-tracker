/**
 * modal 域的形状:两组件的 props 契约与 overlay 手柄。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Modal 的 props。
 */
export type ModalIn = {
  /**
   * 关闭回调(Esc / 点遮罩 / 关闭钮三条路都走它)。
   */
  onClose: () => void

  /**
   * 三档宽;缺省 md。
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * 层级;普通层 50、叠加层 60。
   */
  z?: number

  /**
   * 要不要统一内衬;false = 内容自管(如整页 JD)。
   */
  pad?: boolean

  /**
   * 高度上限(vh)。
   */
  vh?: number

  /**
   * header 按住可拖动。
   */
  draggable?: boolean

  /**
   * 右上角全屏/还原钮。
   */
  resizable?: boolean

  /**
   * 额外的窗口按钮(与全屏/关闭同排;请用 iconBtnS,三颗钮一样大才叫一排)。
   */
  actions?: React.ReactNode

  /**
   * 内容。
   */
  children: React.ReactNode
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
   * eyebrow 颜色按场景传(顾问靛蓝/升级琥珀)。
   */
  color?: string

  /**
   * 17px 标题(右侧给关闭钮留位)。
   */
  title: React.ReactNode
}

/**
 * useOverlayClose 交回的两枚手柄(spread 到 overlay 元素上)。
 */
export type OverlayHandlers = {
  /**
   * 按下记录:是否落在 overlay 本身。
   */
  onMouseDown: (e: React.MouseEvent) => void

  /**
   * 点击判定:按下与松开都在 overlay 才关。
   */
  onClick: (e: React.MouseEvent) => void
}
