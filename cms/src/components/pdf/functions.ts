/**
 * pdf 桶的行为:懒加载 pdf.js、把原件逐页画进容器、翻页、缩放(滚轮 / 捏合 / 拖动 / 「+ −」)、
 * 停下后按新倍数重画。2026-11-07 自 account 桶在新域重写(Frank「全部在新域重写」),逐个照抄原函数,行为不变;
 * 「我的简历」预览弹框与投递框的首页预览共用这一台。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import {
  CANVAS_TAG, CENTER_DIV, CLS_SEP, EV_WHEEL, PCT_SIGN, PX, TEXT_NONE, TF_HEAD, TF_MID, TF_SCALE, TF_TAIL,
  THUMB_BASE_SCALE, THUMB_PAGE, WHEEL_OPTS, ZOOM_HOME, ZOOM_MAX, ZOOM_MIN, ZOOM_PCT, ZOOM_PINCH_K, ZOOM_PX_MAX,
  ZOOM_SETTLE_MS, ZOOM_WHEEL_K,
} from './constants'
import type {
  ApplyViewIn, DivPointerEvent, GripIn, GripViewIn, PageTurnIn, PdfDoc, PdfjsOut, PdfPagesIn, PdfZoomDrawIn, PtPairIn,
  ShowPageIn, WheelBindIn, ZoomAtIn, ZoomBox, ZoomClampIn, ZoomHomeIn, ZoomPt, ZoomStepIn, ZoomView, ZoomXY,
} from './types'
import css from './pdf.module.css'

/**
 * 懒加载 pdf.js 并指好 worker(只有真要画 PDF 时才下载;worker 跑在独立线程,解析大文件不卡页面)。
 *
 * @returns pdf.js 模块。
 */
export async function loadPdfjs(): PdfjsOut {
  const pdfjs = await import('pdfjs-dist')
  if (pdfjs.GlobalWorkerOptions.workerSrc === TEXT_NONE) {
    // eslint-disable-next-line local/no-bare-strings -- 打包器只认 new URL 里的字面量路径(换成常量就找不到 worker 文件)
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  }
  return pdfjs
}

/**
 * 预览弹框:把原件逐页画进容器。每页按「容器里放得下的整页」缩放(宽、高取小者,不出滚动条;
 * 高清屏按设备像素比画),只露第一页,其余藏着等翻页。容器是本函数独占的一块(React 不往里放子节点),
 * 所以直接往里追加画布。画不出来(加密、损坏)拨「画不了」,弹框出一句改下载。
 * 2026-10-06 加缩放:画布显示尺寸写死成整页大小(放大时重画只换像素,不改版面),文档不再画完即销毁,
 * 交给弹框留着(按新倍数重画要用),弹框关掉时销毁。
 *
 * @param x 容器、地址与三个落格。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfPages(x: PdfPagesIn): Promise<void> {
  try {
    const pdfjs = await loadPdfjs()
    const task = pdfjs.getDocument({ url: x.src })
    const doc = await task.promise
    const boxW = x.box.clientWidth
    const boxH = x.box.clientHeight
    const canvases: HTMLCanvasElement[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: THUMB_BASE_SCALE })
      const fit = Math.min(boxW / base.width, boxH / base.height)
      const viewport = page.getViewport({ scale: fit * window.devicePixelRatio })
      const canvas = document.createElement(CANVAS_TAG)
      canvas.className = cssOf(css.page)
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = Math.floor(base.width * fit) + PX
      canvas.style.height = Math.floor(base.height * fit) + PX
      canvas.hidden = i !== THUMB_PAGE
      await page.render({ canvas, viewport }).promise
      canvases.push(canvas)
    }
    x.box.replaceChildren(...canvases)
    x.setDoc(doc)
    x.setCount(doc.numPages)
    x.setReady(true)
  } catch {
    x.setFailed(true)
  }
}

/**
 * 只露第 index 页(翻页时调;容器里的画布按顺序就是页序)。
 *
 * @param x 容器与第几页。
 * @returns 无。
 */
export function showPdfPage(x: ShowPageIn): void {
  for (const [i, el] of Array.from(x.box.children).entries()) {
    if (el instanceof HTMLElement) {
      el.hidden = i !== x.index
    }
  }
}

/**
 * 预览视图收进合法范围:倍数夹在上下限之间;平移最多拖到页边贴舞台边(倍数 1 时归零)。
 *
 * @param x 视图与舞台尺寸。
 * @returns 合法视图。
 */
export function clampViewOf(x: ZoomClampIn): ZoomView {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, x.view.zoom))
  const maxX = (x.box.w * (zoom - ZOOM_MIN)) / CENTER_DIV
  const maxY = (x.box.h * (zoom - ZOOM_MIN)) / CENTER_DIV
  return { zoom, x: Math.min(maxX, Math.max(-maxX, x.view.x)), y: Math.min(maxY, Math.max(-maxY, x.view.y)) }
}

/**
 * 以某点为不动点缩放:那一点下面的内容缩放前后待在原处(滚轮以鼠标位置为中心、「+ / −」以舞台中心)。
 *
 * @param x 视图、倍率、不动点与舞台尺寸。
 * @returns 缩放后的合法视图。
 */
export function zoomAtOf(x: ZoomAtIn): ZoomView {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, x.view.zoom * x.factor))
  const k = zoom / x.view.zoom
  return clampViewOf({
    view: { zoom, x: x.at.x - k * (x.at.x - x.view.x), y: x.at.y - k * (x.at.y - x.view.y) },
    box: x.box,
  })
}

/**
 * 两点距离。
 *
 * @param x 两点。
 * @returns 距离。
 */
export function distOf(x: PtPairIn): number {
  return Math.hypot(x.a.x - x.b.x, x.a.y - x.b.y)
}

/**
 * 两点中点。
 *
 * @param x 两点。
 * @returns 中点。
 */
export function midOf(x: PtPairIn): ZoomXY {
  return { x: (x.a.x + x.b.x) / CENTER_DIV, y: (x.a.y + x.b.y) / CENTER_DIV }
}

/**
 * 拖动 / 捏合中的视图:一指 = 平移(跟手);两指 = 按两指距离比缩放,开始时两指中点下的内容跟着现在的中点走。
 *
 * @param x 这次手势与舞台尺寸。
 * @returns 合法视图。
 */
export function gripViewOf(x: GripViewIn): ZoomView {
  const g = x.grip
  const [f0, f1] = g.from
  const [n0, n1] = g.now
  if (f0 == null || n0 == null) {
    return g.start
  }
  if (f1 == null || n1 == null) {
    return clampViewOf({
      view: { zoom: g.start.zoom, x: g.start.x + n0.x - f0.x, y: g.start.y + n0.y - f0.y },
      box: x.box,
    })
  }
  const d0 = distOf({ a: f0, b: f1 })
  if (d0 === 0) {
    return g.start
  }
  const m0 = midOf({ a: f0, b: f1 })
  const m1 = midOf({ a: n0, b: n1 })
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (g.start.zoom * distOf({ a: n0, b: n1 })) / d0))
  const k = zoom / g.start.zoom
  return clampViewOf({
    view: { zoom, x: m1.x - k * (m0.x - g.start.x), y: m1.y - k * (m0.y - g.start.y) },
    box: x.box,
  })
}

/**
 * 倍数的百分比字样。
 *
 * @param view 视图。
 * @returns 如「150%」。
 */
export function zoomPctOf(view: ZoomView): string {
  return Math.round(view.zoom * ZOOM_PCT) + PCT_SIGN
}

/**
 * 视图的 CSS transform 串(以放页容器中心为原点:先平移再缩放)。
 *
 * @param view 视图。
 * @returns transform 串。
 */
export function transformOf(view: ZoomView): string {
  return TF_HEAD + view.x + TF_MID + view.y + TF_SCALE + view.zoom + TF_TAIL
}

/**
 * 把视图套到放页容器上(容器归 pdf.js 独占,React 不管它的样式,这里直接写)。
 *
 * @param x 容器与视图。
 * @returns 无。
 */
export function applyViewTo(x: ApplyViewIn): void {
  x.box.style.transform = transformOf(x.view)
}

/**
 * 指针在舞台里的位置(相对舞台中心)。
 *
 * @param e 指针事件。
 * @returns 位置。
 */
export function gripPtOf(e: DivPointerEvent): ZoomPt {
  const r = e.currentTarget.getBoundingClientRect()
  return { id: e.pointerId, x: e.clientX - r.left - r.width / CENTER_DIV, y: e.clientY - r.top - r.height / CENTER_DIV }
}

/**
 * 舞台尺寸。
 *
 * @param el 舞台。
 * @returns 宽高。
 */
export function stageBoxOf(el: HTMLDivElement): ZoomBox {
  const r = el.getBoundingClientRect()
  return { w: r.width, h: r.height }
}

/**
 * 手指 / 鼠标按下:抓住指针(移出舞台也收得到),以当前视图与各指位置重新起算这次手势。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 按下手柄。
 */
export function makeGripDown(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripDown(e: DivPointerEvent): void {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pts: ZoomPt[] = []
    if (x.grip != null) {
      pts.push(...x.grip.now)
    }
    pts.push(gripPtOf(e))
    x.setGrip({ start: x.view, from: pts, now: pts })
  }
}

/**
 * 手指 / 鼠标移动:更新这根指的位置,按手势算视图(没按着就不管)。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 移动手柄。
 */
export function makeGripMove(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripMove(e: DivPointerEvent): void {
    const g = x.grip
    if (g == null) {
      return
    }
    const pt = gripPtOf(e)
    const now: ZoomPt[] = []
    for (const p of g.now) {
      if (p.id === pt.id) {
        now.push(pt)
      } else {
        now.push(p)
      }
    }
    const next = { start: g.start, from: g.from, now }
    x.setGrip(next)
    x.setView(gripViewOf({ grip: next, box: stageBoxOf(e.currentTarget) }))
  }
}

/**
 * 手指 / 鼠标抬起或被打断:去掉这根指;还剩手指就以当前视图重新起算(两指变一指时不跳)。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 抬起手柄。
 */
export function makeGripUp(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripUp(e: DivPointerEvent): void {
    const g = x.grip
    if (g == null) {
      return
    }
    const rest: ZoomPt[] = []
    for (const p of g.now) {
      if (p.id !== e.pointerId) {
        rest.push(p)
      }
    }
    if (rest.length === 0) {
      x.setGrip(null)
      return
    }
    x.setGrip({ start: x.view, from: rest, now: rest })
  }
}

/**
 * 滚轮系数:触控板捏合(带 ctrlKey)用大系数,鼠标滚轮用小系数。
 *
 * @param ctrl 带 ctrlKey 吗。
 * @returns 系数。
 */
export function wheelKOf(ctrl: boolean): number {
  if (ctrl) {
    return ZOOM_PINCH_K
  }
  return ZOOM_WHEEL_K
}

/**
 * 在舞台上挂滚轮缩放(以鼠标位置为中心;拦掉浏览器默认的滚动与整页缩放)。
 * 要非被动监听才能拦,React 的 onWheel 是被动的,所以原生挂;按上一刻视图算,连滚几格不丢。
 *
 * @param x 舞台与改视图。
 * @returns 解绑函数。
 */
export function makeWheelBind(x: WheelBindIn): () => void {
  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    const r = x.stage.getBoundingClientRect()
    const at = { x: e.clientX - r.left - r.width / CENTER_DIV, y: e.clientY - r.top - r.height / CENTER_DIV }
    const factor = Math.exp(-e.deltaY * wheelKOf(e.ctrlKey))
    x.setView(function nextView(v: ZoomView): ZoomView {
      return zoomAtOf({ view: v, factor, at, box: { w: r.width, h: r.height } })
    })
  }
  x.stage.addEventListener(EV_WHEEL, onWheel, WHEEL_OPTS)
  return function unbindWheel(): void {
    x.stage.removeEventListener(EV_WHEEL, onWheel)
  }
}

/**
 * 「+ / −」钮:以舞台中心为不动点乘一个倍率。
 *
 * @param x 舞台、改视图与倍率。
 * @returns 点击手柄。
 */
export function makeZoomStep(x: ZoomStepIn): () => void {
  return function onZoomStep(): void {
    const stage = x.stage
    if (stage == null) {
      return
    }
    x.setView(function nextView(v: ZoomView): ZoomView {
      return zoomAtOf({ view: v, factor: x.factor, at: { x: 0, y: 0 }, box: stageBoxOf(stage) })
    })
  }
}

/**
 * 回整页(点百分比、双击舞台)。
 *
 * @param x 改视图。
 * @returns 点击手柄。
 */
export function makeZoomHome(x: ZoomHomeIn): () => void {
  return function onZoomHome(): void {
    x.setView(ZOOM_HOME)
  }
}

/**
 * 翻页:换页并回整页(放大的位置对下一页没意义)。
 *
 * @param x 两个落格。
 * @returns 翻页手柄。
 */
export function makePageTurn(x: PageTurnIn): (p: number) => void {
  return function onPage(p: number): void {
    x.setIndex(p)
    x.setView(ZOOM_HOME)
  }
}

/**
 * 按新倍数重画当前页:新画布显示尺寸不变、像素按「整页大小 × 倍数 × 设备像素比」(长边封顶),
 * 画好后替换旧画布 —— 缩放中先拉伸旧画面,停下后字变清楚。已经够清楚(缩小回来)就不画。
 * 画挂了留着拉伸的旧画面(看得见、只是糊一点),由 keepStretched 点名静默。
 *
 * @param x 文档、容器、第几页与倍数。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfZoom(x: PdfZoomDrawIn): Promise<void> {
  try {
    const old = x.box.children[x.index]
    if (old instanceof HTMLCanvasElement === false) {
      return
    }
    const page = await x.doc.getPage(x.index + 1)
    const base = page.getViewport({ scale: THUMB_BASE_SCALE })
    const want = (old.clientWidth / base.width) * x.zoom * window.devicePixelRatio
    const scale = Math.min(want, ZOOM_PX_MAX / Math.max(base.width, base.height))
    if (Math.floor(base.width * scale) <= old.width) {
      return
    }
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement(CANVAS_TAG)
    canvas.className = old.className
    canvas.style.width = old.style.width
    canvas.style.height = old.style.height
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    canvas.hidden = old.hidden
    old.replaceWith(canvas)
  } catch {
    keepStretched()
  }
}

/**
 * 放大后重画清楚那一步挂了的静默口:旧画布照旧在原位(拉伸着、只是糊一点),不出话术、不拨「画不了」——
 * 静默是**点名的**(原 account 桶 ignoreWriteErr 的同一口径),不是忘了处理。
 *
 * @returns 无。
 */
export function keepStretched(): void {
  return
}

/**
 * 缩放停下 ZOOM_SETTLE_MS 后再重画(倍数一直在变时不画;effect 清理时取消没开始的那次)。
 *
 * @param x 文档、容器、第几页与倍数。
 * @returns 取消函数。
 */
export function makeZoomRedraw(x: PdfZoomDrawIn): () => void {
  function redraw(): void {
    void renderPdfZoom(x)
  }
  const timer = window.setTimeout(redraw, ZOOM_SETTLE_MS)
  return function cancelRedraw(): void {
    window.clearTimeout(timer)
  }
}

/**
 * 弹框关掉(或换文件)时销毁文档,放掉 worker 里的内存。
 *
 * @param doc 文档。
 * @returns 销毁函数。
 */
export function makeDocDrop(doc: PdfDoc): () => void {
  return function dropDoc(): void {
    void doc.loadingTask.destroy()
  }
}

/**
 * 预览舞台的类名:基座 + 放大后的抓手光标。
 *
 * @param zoomed 放大了吗。
 * @returns 拼好的 className。
 */
export function stageClsOf(zoomed: boolean): string {
  if (zoomed) {
    return cssOf(css.stage) + CLS_SEP + cssOf(css.stageZoomed)
  }
  return cssOf(css.stage)
}
