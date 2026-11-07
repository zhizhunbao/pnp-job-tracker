/**
 * pdf 桶的形状:逐页画原件、预览视图(倍数 + 平移)、手势与各件的 props(本桶自声明)。
 * 2026-11-07 自 account 桶在新域重写,形状逐格照抄;useResumePages / ResumePages 的入出参与原件同形(投递框首页预览也用)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 预览整机(useResumePages)的入参:原件地址。
 */
export type ResumePagesHookIn = {
  /**
   * 原件地址(空串 = 不画)。
   */
  src: string
}

/**
 * 预览整机的面板(useResumePages 出)。
 */
export type ResumePagesPanel = {
  /**
   * 放页的容器挂上 / 卸下时的回调(页一张张画进它里面)。
   */
  onBoxMount: (el: HTMLDivElement | null) => void

  /**
   * 画完了吗(画完前出「加载中」)。
   */
  ready: boolean

  /**
   * 画不出来(加密、损坏;弹框出一句改下载)。
   */
  failed: boolean

  /**
   * 一共几页(画完前是 0;多于 1 页才出翻页条)。
   */
  count: number

  /**
   * 舞台挂上 / 卸下时的回调(滚轮缩放挂在它上面)。
   */
  onStageMount: (el: HTMLDivElement | null) => void

  /**
   * 放大了吗(放大后舞台换抓手光标,可拖动)。
   */
  zoomed: boolean

  /**
   * 当前倍数的百分比字样(如 150%)。
   */
  pct: string

  /**
   * 还能放大吗(到上限钮灰掉)。
   */
  canIn: boolean

  /**
   * 还能缩小吗(整页时钮灰掉)。
   */
  canOut: boolean

  /**
   * 点「+」。
   */
  onZoomIn: () => void

  /**
   * 点「−」。
   */
  onZoomOut: () => void

  /**
   * 点百分比 / 双击:回整页。
   */
  onZoomReset: () => void

  /**
   * 手指 / 鼠标按下(开始拖动或捏合)。
   */
  onGripDown: (e: DivPointerEvent) => void

  /**
   * 手指 / 鼠标移动。
   */
  onGripMove: (e: DivPointerEvent) => void

  /**
   * 手指 / 鼠标抬起或被打断。
   */
  onGripUp: (e: DivPointerEvent) => void

  /**
   * 正在看第几页(从 0 数,同 pager 桶的口径)。
   */
  index: number

  /**
   * 翻到第几页。
   */
  onPage: (p: number) => void
}

/**
 * 只露一页(showPdfPage)的入参。
 */
export type ShowPageIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 露第几页(从 0 数)。
   */
  index: number
}

/**
 * 逐页画 PDF(renderPdfPages)的入参。
 */
export type PdfPagesIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 原件地址。
   */
  src: string

  /**
   * 画完时拨「画完了」。
   */
  setReady: (v: boolean) => void

  /**
   * 画不出来时拨「画不了」。
   */
  setFailed: (v: boolean) => void

  /**
   * 画完时报一共几页。
   */
  setCount: (v: number) => void

  /**
   * 画完时交出文档(缩放后按新倍数重画要用;弹框关掉时销毁)。
   */
  setDoc: (v: MaybePdfDoc) => void
}

/**
 * 预览的视图:倍数 + 平移(CSS 像素,相对舞台中心;倍数 1 时平移恒为 0)。
 */
export type ZoomView = {
  /**
   * 缩放倍数(1 = 整页)。
   */
  zoom: number

  /**
   * 横向平移。
   */
  x: number

  /**
   * 纵向平移。
   */
  y: number
}

/**
 * 改视图(useState 的 setter:可以直接给值,也可以按上一刻的视图算)。
 */
export type ZoomViewSet = React.Dispatch<React.SetStateAction<ZoomView>>

/**
 * 舞台里的一个位置(相对舞台中心,CSS 像素)。
 */
export type ZoomXY = {
  /**
   * 横坐标。
   */
  x: number

  /**
   * 纵坐标。
   */
  y: number
}

/**
 * 一根手指 / 鼠标的位置(相对舞台中心)。
 */
export type ZoomPt = {
  /**
   * 指针编号(浏览器给的 pointerId,区分两根手指)。
   */
  id: number

  /**
   * 横坐标。
   */
  x: number

  /**
   * 纵坐标。
   */
  y: number
}

/**
 * 一次拖动 / 捏合:开始那刻的视图与各指位置 + 现在各指位置(手指增减时重新起算)。
 */
export type ZoomGrip = {
  /**
   * 开始那刻的视图。
   */
  start: ZoomView

  /**
   * 开始那刻各指位置。
   */
  from: ZoomPt[]

  /**
   * 现在各指位置(与 from 同序同编号)。
   */
  now: ZoomPt[]
}

/**
 * 正在拖动 / 捏合吗(null = 没有)。
 */
export type MaybeZoomGrip = ZoomGrip | null

/**
 * 舞台尺寸(CSS 像素;平移上限按它算)。
 */
export type ZoomBox = {
  /**
   * 宽。
   */
  w: number

  /**
   * 高。
   */
  h: number
}

/**
 * 视图收进合法范围(clampViewOf)的入参。
 */
export type ZoomClampIn = {
  /**
   * 待收的视图。
   */
  view: ZoomView

  /**
   * 舞台尺寸。
   */
  box: ZoomBox
}

/**
 * 以某点为中心缩放(zoomAtOf)的入参。
 */
export type ZoomAtIn = {
  /**
   * 缩放前的视图。
   */
  view: ZoomView

  /**
   * 乘上的倍率。
   */
  factor: number

  /**
   * 不动点(相对舞台中心;鼠标位置或舞台中心)。
   */
  at: ZoomXY

  /**
   * 舞台尺寸。
   */
  box: ZoomBox
}

/**
 * 拖动 / 捏合算视图(gripViewOf)的入参。
 */
export type GripViewIn = {
  /**
   * 这次手势。
   */
  grip: ZoomGrip

  /**
   * 舞台尺寸。
   */
  box: ZoomBox
}

/**
 * 两点(distOf / midOf)的入参。
 */
export type PtPairIn = {
  /**
   * 第一点。
   */
  a: ZoomXY

  /**
   * 第二点。
   */
  b: ZoomXY
}

/**
 * 手势三件(makeGripDown / makeGripMove / makeGripUp)的入参。
 */
export type GripIn = {
  /**
   * 当前视图(按下时记成起点)。
   */
  view: ZoomView

  /**
   * 当前手势。
   */
  grip: MaybeZoomGrip

  /**
   * 改视图。
   */
  setView: ZoomViewSet

  /**
   * 改手势。
   */
  setGrip: (g: MaybeZoomGrip) => void
}

/**
 * 滚轮缩放挂件(makeWheelBind)的入参。
 */
export type WheelBindIn = {
  /**
   * 舞台。
   */
  stage: HTMLDivElement

  /**
   * 改视图。
   */
  setView: ZoomViewSet
}

/**
 * 「+ / −」钮(makeZoomStep)的入参。
 */
export type ZoomStepIn = {
  /**
   * 舞台(没挂上时钮不动)。
   */
  stage: HTMLDivElement | null

  /**
   * 改视图。
   */
  setView: ZoomViewSet

  /**
   * 乘上的倍率(放大 > 1,缩小 < 1)。
   */
  factor: number
}

/**
 * 回整页(makeZoomHome)的入参。
 */
export type ZoomHomeIn = {
  /**
   * 改视图。
   */
  setView: ZoomViewSet
}

/**
 * 翻页(makePageTurn)的入参。
 */
export type PageTurnIn = {
  /**
   * 改第几页。
   */
  setIndex: (p: number) => void

  /**
   * 改视图(翻页回整页)。
   */
  setView: ZoomViewSet
}

/**
 * 把视图套到放页容器上(applyViewTo)的入参。
 */
export type ApplyViewIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 视图。
   */
  view: ZoomView
}

/**
 * 按新倍数重画当前页(renderPdfZoom / makeZoomRedraw)的入参。
 */
export type PdfZoomDrawIn = {
  /**
   * 文档。
   */
  doc: PdfDoc

  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 第几页(从 0 数)。
   */
  index: number

  /**
   * 倍数。
   */
  zoom: number
}

/**
 * ResumeViewer 的 props(预览弹框里那一块:舞台 + 翻页条 + 缩放钮组)。
 */
export type ResumeViewerIn = {
  /**
   * 原件地址(PDF)。
   */
  src: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumeStage 的 props(预览舞台;挂载回调逐格收,理由同 me 桶 resume 的 ResumeInput)。
 */
export type ResumeStageIn = {
  /**
   * 舞台挂上 / 卸下的回调。
   */
  onMount: (el: HTMLDivElement | null) => void

  /**
   * 放大了吗(换抓手光标)。
   */
  zoomed: boolean

  /**
   * 按下。
   */
  onPointerDown: (e: DivPointerEvent) => void

  /**
   * 移动。
   */
  onPointerMove: (e: DivPointerEvent) => void

  /**
   * 抬起 / 被打断。
   */
  onPointerUp: (e: DivPointerEvent) => void

  /**
   * 双击回整页。
   */
  onDoubleClick: () => void

  /**
   * 舞台里的东西(占位纸与放页容器)。
   */
  children: React.ReactNode
}

/**
 * ResumeZoom 的 props(翻页条旁「− 百分比 +」)。
 */
export type ResumeZoomIn = {
  /**
   * 百分比字样。
   */
  pct: string

  /**
   * 还能放大吗。
   */
  canIn: boolean

  /**
   * 还能缩小吗。
   */
  canOut: boolean

  /**
   * 点「+」。
   */
  onIn: () => void

  /**
   * 点「−」。
   */
  onOut: () => void

  /**
   * 点百分比:回整页。
   */
  onReset: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 舞台上的指针事件(库类型起本地名)。
 */
export type DivPointerEvent = React.PointerEvent<HTMLDivElement>

/**
 * ResumePages 的 props(放页的容器;回调逐格收,理由同 me 桶 resume 的 ResumeInput)。
 */
export type ResumePagesIn = {
  /**
   * 容器挂上 / 卸下的回调。
   */
  onMount: (el: HTMLDivElement | null) => void
}

/**
 * 懒加载 pdf.js 的返回(模块类型由库定,不透明地交给调用方)。
 */
// eslint-disable-next-line local/no-bare-strings -- 动态导入的模块类型只能写包名取;本行是类型,不产生运行时依赖(外部库形状)
export type PdfjsOut = Promise<typeof import('pdfjs-dist')>

/**
 * pdf.js 打开的文档(库类型起本地名;缩放后重画要留着它)。
 */
// eslint-disable-next-line local/no-bare-strings -- 库类型只能写包名取;本行是类型,不产生运行时依赖(外部库形状)
export type PdfDoc = import('pdfjs-dist').PDFDocumentProxy

/**
 * 文档(没打开 = null)。
 */
export type MaybePdfDoc = PdfDoc | null
