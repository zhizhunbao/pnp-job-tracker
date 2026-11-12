/**
 * pdf 桶的形状:打开原件、按容器的宽逐页画、各件的 props(本桶自声明)。
 * 2026-11-07 自 account 桶在新域重写。
 * 2026-11-12 撤掉翻页、缩放视图(倍数 + 平移)与手势一族的形状
 * (Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」)。
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
   * 画不出来(加密、损坏;出一句改下载)。
   */
  failed: boolean
}

/**
 * 打开原件(openPdfDoc)的入参。
 */
export type PdfOpenIn = {
  /**
   * 原件地址。
   */
  src: string

  /**
   * 打开后交出文档(容器变宽后重画要用;预览区卸下时销毁)。
   */
  setDoc: (v: MaybePdfDoc) => void

  /**
   * 打不开时拨「画不了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 一页的画布缩放(pageScaleOf)的入参。
 */
export type PageScaleIn = {
  /**
   * 容器宽(CSS 像素)。
   */
  width: number

  /**
   * 页的原始宽(PDF 点)。
   */
  pageW: number

  /**
   * 页的原始高(PDF 点)。
   */
  pageH: number
}

/**
 * 已有画面够不够清楚(isSharpEnough)的入参。
 */
export type SharpIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 这次第一页要画的像素宽。
   */
  px: number
}

/**
 * 逐页画 PDF(renderPdfPages)的入参。
 */
export type PdfPagesIn = {
  /**
   * 文档。
   */
  doc: PdfDoc

  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 容器宽(CSS 像素;每页铺满它)。
   */
  width: number

  /**
   * 取消信号(容器又变宽、预览区卸下时叫停这一批)。
   */
  signal: AbortSignal

  /**
   * 画完时拨「画完了」。
   */
  setReady: (v: boolean) => void

  /**
   * 画不出来时拨「画不了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 排一次画页(makePagesDraw)的入参。
 */
export type PagesDrawIn = {
  /**
   * 文档。
   */
  doc: PdfDoc

  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 容器宽(CSS 像素)。
   */
  width: number

  /**
   * 画完时拨「画完了」。
   */
  setReady: (v: boolean) => void

  /**
   * 画不出来时拨「画不了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 盯容器的宽(makeWidthWatch)的入参。
 */
export type WidthWatchIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 报容器宽(CSS 像素)。
   */
  setWidth: (v: number) => void
}

/**
 * ResumeViewer 的 props(预览区:原件每一页铺满宽、从上到下排)。
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
 * pdf.js 打开的文档(库类型起本地名;容器变宽后重画要留着它)。
 */
// eslint-disable-next-line local/no-bare-strings -- 库类型只能写包名取;本行是类型,不产生运行时依赖(外部库形状)
export type PdfDoc = import('pdfjs-dist').PDFDocumentProxy

/**
 * 文档(没打开 = null)。
 */
export type MaybePdfDoc = PdfDoc | null
