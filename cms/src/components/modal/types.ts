/**
 * modal 域的形状:两组件的 props 契约、overlay 手柄与拖拽机器的进出口。
 * 2026-09-28 并壳(Frank「别并存啊」「你都重构了 还并存什么」):advisor 浮层壳的形状并进来,
 * 拖动 / 拉伸两台机器(useCard、useEdgeResize)合成一台 useFrame,旧的位移 / 尺寸 / 快照形状随之换成 FrameBox 一族。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 三档宽的档名。
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'fit'

/**
 * 窗口形的尺寸规格:记忆键 + 没有记忆时的宽高。
 */
export type FrameSize = {
  /**
   * 尺寸记忆的本地存储键(同一个键的弹框共用一份记住的宽高)。
   */
  memo: string

  /**
   * 没有记忆时的宽(px)。
   */
  w: number

  /**
   * 没有记忆时的高(px)。
   */
  h: number
}

/**
 * 窗口形(带标题栏)的规格:职位描述 / 公司 / 字段弹框这类长内容弹框 —— 标题栏钉住、正文单独滚、尺寸记在本地。
 */
export type ModalWin = {
  /**
   * 标题栏左块(一般是 ModalHead)。
   */
  head: React.ReactNode

  /**
   * 尺寸记忆的本地存储键(同一个键的弹框共用一份记住的宽高)。
   */
  memo: string

  /**
   * 没有记忆时的宽(px)。
   */
  w: number

  /**
   * 没有记忆时的高(px)。
   */
  h: number

  /**
   * 正文走职位描述档(底内衬归零、纵向弹性列,投递栏贴底;字号行高照 JD 正文)。
   */
  jd: boolean
}

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
   * 额外的窗口按钮(与关闭钮同排;用本域的 ModalBtn,几颗钮一样大才叫一排)。
   */
  actions?: React.ReactNode

  /**
   * 内容。
   */
  children: React.ReactNode

  /**
   * 四边 / 四角可拖拽缩放(光标到边上变缩放形;2026-09-04 pte 字典弹框先例,Frank「像应用那种」)。
   */
  edgeResize?: boolean

  /**
   * 窗口形规格(给了就走带标题栏的窗口形:可拖可拉、记住尺寸;size / pad / tall / draggable / edgeResize 不再起作用)。
   */
  win?: ModalWin

  /**
   * 外层起的白卡机器(useFrame):弹框内容要整块重挂(职位描述弹框重新翻译后)时位置尺寸不丢;不给就用弹框自己的。
   */
  frame?: FrameOut
}

/**
 * 标题栏左块的 props(窗口形专用:灰色小标 + 大标题 + 译名行)。
 */
export type ModalHeadIn = {
  /**
   * 灰色小标那一行的内容(文字,或文字 + KickerNote)。
   */
  kicker: React.ReactNode

  /**
   * 大标题(岗位名 / 公司名)。
   */
  title: string

  /**
   * 大标题下的界面语译名;空串 = 不出。
   */
  sub: string

  /**
   * 译名行右端的控件(切换钮这类);没有给 null。
   */
  ctl: React.ReactNode
}

/**
 * 灰色小标里的副段(剩余次数这类)的 props。
 */
export type KickerNoteIn = {
  /**
   * 副段文字。
   */
  text: string
}

/**
 * 窗口图标钮的 props(关闭 / 重新翻译 / 打开落地页 —— 几颗一样大才叫一排)。
 */
export type ModalBtnIn = {
  /**
   * 读屏名。
   */
  aria: string

  /**
   * 悬停提示;不给就不出。
   */
  tip?: string

  /**
   * 点击动作(与 href 二选一)。
   */
  onClick?: () => void

  /**
   * 链接地址(与 onClick 二选一)。
   */
  href?: string

  /**
   * 链接打开方式。
   */
  target?: string

  /**
   * 图标。
   */
  children: React.ReactNode
}

/**
 * 窗口形标题栏的 props。
 */
export type ModalBarIn = {
  /**
   * 标题栏左块。
   */
  head: React.ReactNode

  /**
   * 额外的窗口按钮。
   */
  actions?: React.ReactNode

  /**
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 标题栏按下(拖动起手)。
   */
  onDown: PointerHandlerFn

  /**
   * 是否窄屏(窄屏全屏,标题栏不给拖动光标)。
   */
  narrow: boolean
}

/**
 * 窗口钮排的 props。
 */
export type ModalActsIn = {
  /**
   * 额外的窗口按钮。
   */
  actions?: React.ReactNode

  /**
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 排在标题栏里(窗口形)还是浮在白卡右上角(普通弹框)。
   */
  bar: boolean
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
 * 指针按下的手柄。
 */
export type PointerHandlerFn = (e: React.PointerEvent) => void

/**
 * 缩放把手在哪条边 / 哪个角。
 */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/**
 * 弹框被拖动 / 拉伸之后钉在视口上的位置与尺寸;null 的宽高 = 没拉过,宽高照尺寸档与内容走。
 */
export type FrameBox = {
  /**
   * 左边(视口 px)。
   */
  x: number

  /**
   * 上边(视口 px)。
   */
  y: number

  /**
   * 宽(px);null = 没拉过。
   */
  w: number | null

  /**
   * 高(px);null = 没拉过。
   */
  h: number | null
}

/**
 * 拉伸时的位置与尺寸(四格都有值)。
 */
export type SizedBox = {
  /**
   * 左边(视口 px)。
   */
  x: number

  /**
   * 上边(视口 px)。
   */
  y: number

  /**
   * 宽(px)。
   */
  w: number

  /**
   * 高(px)。
   */
  h: number
}

/**
 * useFrame 的入参:弹框形态的三个开关。
 */
export type FrameIn = {
  /**
   * 窗口形的尺寸规格;不给 = 普通弹框(弹框 props 原样递进来,归一前的形状)。
   */
  win?: FrameSize

  /**
   * 普通弹框开没开拖动。
   */
  draggable: boolean

  /**
   * 普通弹框开没开拉伸。
   */
  edgeResize: boolean
}

/**
 * useFrame 交回的机器面板。
 */
export type FrameOut = {
  /**
   * 是否窄屏(窄屏全屏,不拖不拉)。
   */
  narrow: boolean

  /**
   * 白卡的运行时样式(拖过 / 拉过 / 窗口形才有值)。
   */
  style: React.CSSProperties

  /**
   * 白卡按下(普通弹框的拖动起手;窗口形不起)。
   */
  onCardDown: PointerHandlerFn

  /**
   * 标题栏按下(窗口形的拖动起手)。
   */
  onBarDown: PointerHandlerFn

  /**
   * 某条边 / 角的起手手柄工厂。
   */
  startOf: (edge: ResizeEdge) => PointerHandlerFn

  /**
   * 渲不渲把手。
   */
  resizable: boolean
}

/**
 * clsOf 的入参:决定遮罩与白卡形态的六个开关。
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
   * 是否窗口形。
   */
  win: boolean
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
 * frameStyleOf 的入参。
 */
export type FrameStyleIn = {
  /**
   * 是否窄屏(窄屏全屏样式全在类里,返回空)。
   */
  narrow: boolean

  /**
   * 钉住的位置与尺寸;null = 还没动过,照遮罩居中。
   */
  box: FrameBox | null
}

/**
 * 窄屏开关(标题栏类名)。
 */
export type BarClsIn = {
  /**
   * 是否窄屏。
   */
  narrow: boolean
}

/**
 * 正文档开关(窗口形正文类名)。
 */
export type BodyClsIn = {
  /**
   * 是否职位描述档。
   */
  jd: boolean
}

/**
 * frameOf 的入参:外层起的机器与弹框自己的机器。
 */
export type FramePickIn = {
  /**
   * 外层起的;不给 = 没起(弹框 props 原样递进来,归一前的形状)。
   */
  ext?: FrameOut

  /**
   * 弹框自己的。
   */
  own: FrameOut
}

/**
 * useFrame 首帧算式的入参(窄屏态由机器自己量)。
 */
export type FrameInitIn = {
  /**
   * 窗口形的尺寸规格;不给 = 普通弹框(弹框 props 原样递进来,归一前的形状)。
   */
  win?: FrameSize
}

/**
 * 最小尺寸的入参。
 */
export type MinSizeIn = {
  /**
   * 是否窗口形。
   */
  win: boolean
}

/**
 * 最小尺寸。
 */
export type MinSize = {
  /**
   * 最小宽(px)。
   */
  w: number

  /**
   * 最小高(px)。
   */
  h: number
}

/**
 * 拉伸起手快照。
 */
export type ResizeStart = {
  /**
   * 起手指针 x。
   */
  x: number

  /**
   * 起手指针 y。
   */
  y: number

  /**
   * 起手时的位置与尺寸。
   */
  box: SizedBox

  /**
   * 哪条边。
   */
  edge: ResizeEdge
}

/**
 * resizedOf 的入参。
 */
export type ResizedIn = {
  /**
   * 起手快照。
   */
  st: ResizeStart

  /**
   * 指针水平位移。
   */
  dx: number

  /**
   * 指针垂直位移。
   */
  dy: number

  /**
   * 最小尺寸。
   */
  min: MinSize
}

/**
 * 按下那一刻的位置(还没动过就量白卡)的入参。
 */
export type BoxNowIn = {
  /**
   * 钉住的位置与尺寸;null = 还没动过。
   */
  box: FrameBox | null

  /**
   * 白卡元素(从按下的那块往上找到的)。
   */
  el: Element | null
}

/**
 * 拖动起手工厂的入参。
 */
export type DragStartIn = {
  /**
   * 开没开(窄屏 / 没开拖动 / 不是这块手柄时不起)。
   */
  enabled: boolean

  /**
   * 当前钉住的位置与尺寸。
   */
  box: FrameBox | null

  /**
   * 位置落格。
   */
  setBox: (b: FrameBox) => void
}

/**
 * 拉伸起手工厂的入参。
 */
export type ResizeStartIn = {
  /**
   * 开没开。
   */
  enabled: boolean

  /**
   * 当前钉住的位置与尺寸。
   */
  box: FrameBox | null

  /**
   * 位置尺寸落格。
   */
  setBox: (b: FrameBox) => void

  /**
   * 哪条边。
   */
  edge: ResizeEdge

  /**
   * 尺寸记忆键;空串 = 不记。
   */
  memo: string

  /**
   * 最小尺寸。
   */
  min: MinSize
}

/**
 * 按下手柄的挑选入参(拖动只挂在一块手柄上:窗口形挂标题栏、普通弹框挂整张白卡)。
 */
export type DownPickIn = {
  /**
   * 这块手柄起不起。
   */
  on: boolean

  /**
   * 起的话用的手柄。
   */
  fn: PointerHandlerFn
}

/**
 * 本地存储里的尺寸记忆(线格式:缺席 = 没记过;老版本还多存一格全屏,已不认)。
 */
export type PrefJson = {
  /**
   * 宽(px)。
   */
  w?: number | null

  /**
   * 高(px)。
   */
  h?: number | null
}

/**
 * 读出来的尺寸记忆;null = 没记过。
 */
export type PrefFact = {
  /**
   * 宽(px)。
   */
  w: number | null

  /**
   * 高(px)。
   */
  h: number | null
}

/**
 * 写尺寸记忆的入参。
 */
export type SavePrefIn = {
  /**
   * 记忆键。
   */
  key: string

  /**
   * 宽(px)。
   */
  w: number

  /**
   * 高(px)。
   */
  h: number
}

/**
 * 居中的入参:弹框宽高。
 */
export type CenterIn = {
  /**
   * 宽(px)。
   */
  w: number

  /**
   * 高(px)。
   */
  h: number
}

/**
 * ResizeHandles 的 props。
 */
export type ResizeHandlesIn = {
  /**
   * 某条边 / 角的起手手柄工厂。
   */
  startOf: (edge: ResizeEdge) => PointerHandlerFn
}

/**
 * useLayerStack 的出参(2026-09-21 叠开的弹框栈):后开的在上面,各层从下到上排。
 */
export type LayerStackOut<L> = {
  /**
   * 从下到上的各层;空 = 一层都没开。
   */
  layers: L[]

  /**
   * 叠上一层。
   */
  push: (layer: L) => void

  /**
   * 换掉最上面一层(同框换内容:公司弹框里点相似雇主);一层都没有时等于叠上一层。
   */
  swapTop: (layer: L) => void

  /**
   * 关掉最上面一层(× 与 Esc 都走它)。
   */
  pop: () => void
}
