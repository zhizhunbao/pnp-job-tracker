/**
 * modal 域的形状:两组件的 props 契约、overlay 手柄与拖拽机器的进出口。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 三档宽的档名。
 */
export type ModalSize = 'sm' | 'md' | 'lg'

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
  size?: ModalSize

  /**
   * 层级;普通层 50、叠加层 60。
   */
  z?: number

  /**
   * 要不要统一内衬;false = 内容自管(如整页 JD)。
   */
  pad?: boolean

  /**
   * 加高档(默认 85vh 上限,true = 94vh;全站只有 PricingModal 用)。
   */
  tall?: boolean

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
 * useOverlayClose 交回的两枚手柄(挂到 overlay 元素上)。
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

/**
 * 拖拽位移(相对居中位的像素偏移)。
 */
export type DragPos = {
  /**
   * 横向偏移(px)。
   */
  x: number

  /**
   * 纵向偏移(px)。
   */
  y: number
}

/**
 * 拖拽起手快照(按下那一刻的指针位与卡位)。
 */
export type DragStart = {
  /**
   * 按下时指针横坐标。
   */
  x: number

  /**
   * 按下时指针纵坐标。
   */
  y: number

  /**
   * 按下时卡的横向偏移。
   */
  posX: number

  /**
   * 按下时卡的纵向偏移。
   */
  posY: number
}

/**
 * useCard 的入参:机器要感知的两个外部形态。
 */
export type CardIn = {
  /**
   * 是否窄屏(窄屏禁拖)。
   */
  narrow: boolean

  /**
   * 调用方开没开拖拽。
   */
  draggable: boolean
}

/**
 * useCard 交回的机器面板(全屏态与拖拽是一台机器:全屏要复位位移、全屏中禁拖)。
 */
export type CardOut = {
  /**
   * 是否全屏态。
   */
  maximized: boolean

  /**
   * 全屏/还原切换(顺带归零拖拽位移)。
   */
  toggleMax: () => void

  /**
   * 当前位移。
   */
  pos: DragPos

  /**
   * 此刻是否在拖(读 ref,渲染期取用不触发重渲)。
   */
  dragging: () => boolean

  /**
   * 按下起手(落在豁免目标上不起)。
   */
  onPointerDown: (e: React.PointerEvent) => void

  /**
   * 移动跟手。
   */
  onPointerMove: (e: React.PointerEvent) => void

  /**
   * 松手收尾(释放指针捕获)。
   */
  onPointerUp: (e: React.PointerEvent) => void
}


/**
 * clsOf 的入参:决定遮罩与白卡形态的五个开关。
 */
export type ClsIn = {
  /**
   * 是否窄屏。
   */
  narrow: boolean

  /**
   * 三档宽。
   */
  size: ModalSize

  /**
   * 是否全屏态。
   */
  maximized: boolean

  /**
   * 是否可拖(居中态给手势光标)。
   */
  draggable: boolean

  /**
   * 是否统一内衬。
   */
  pad: boolean

  /**
   * 是否加高档(94vh)。
   */
  tall: boolean

  /**
   * 此刻是否在拖(拖中关过渡)。
   */
  dragging: boolean
}

/**
 * clsOf 的出参:两条拼好的 className。
 */
export type ClsOut = {
  /**
   * 白卡 className。
   */
  card: string

  /**
   * 遮罩层 className。
   */
  overlay: string
}

/**
 * cardStyleOf 的入参:居中态还剩的唯一运行时样式 —— 拖拽位移。
 * (三档宽/高上限/过渡开关全类化进 module.css 了,2026-08-24 Frank「改成用 class 不行吗」。)
 */
export type CardStyleIn = {
  /**
   * 是否窄屏(窄屏/全屏态样式全在类里,返回空)。
   */
  narrow: boolean

  /**
   * 是否全屏态。
   */
  maximized: boolean

  /**
   * 拖拽位移(进 transform)。
   */
  pos: DragPos
}
