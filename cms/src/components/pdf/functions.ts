/**
 * pdf 桶的行为:懒加载 pdf.js、打开原件、把每一页按容器的宽画进容器、容器变宽后重画清楚。
 * 2026-11-07 自 account 桶在新域重写(Frank「全部在新域重写」);全站看 PDF 原件(我的简历、查看附件弹框、投递框)共用这一台。
 * 2026-11-12 改成连续阅读:每页铺满容器的宽、从上到下排,撤掉翻页、缩放(滚轮 / 捏合 / 「+ −」)、拖动与双击回整页
 * (Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import {
  CANVAS_TAG, DRAW_NOW_MS, PAGE_BASE_SCALE, PAGE_PX_MAX, REDRAW_RATIO, REDRAW_SETTLE_MS, TEXT_NONE,
} from './constants'
import type { PageScaleIn, PagesDrawIn, PdfDoc, PdfjsOut, PdfOpenIn, PdfPagesIn, SharpIn, WidthWatchIn } from './types'
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
 * 打开原件,把文档交给预览机留着(容器变宽后重画要用,预览区卸下时销毁)。打不开(加密、损坏)拨「画不了」。
 *
 * @param x 地址与两个落格。
 * @returns 打开(或放弃)时 resolve。
 */
export async function openPdfDoc(x: PdfOpenIn): Promise<void> {
  try {
    const pdfjs = await loadPdfjs()
    const task = pdfjs.getDocument({ url: x.src })
    x.setDoc(await task.promise)
  } catch {
    x.setFailed(true)
  }
}

/**
 * 一页的画布缩放:容器宽 / 页宽 × 设备像素比(铺满宽、高清屏字不糊),最长边不过像素上限。
 *
 * @param x 容器宽与页的原始宽高。
 * @returns 缩放。
 */
export function pageScaleOf(x: PageScaleIn): number {
  const want = (x.width / x.pageW) * window.devicePixelRatio
  return Math.min(want, PAGE_PX_MAX / Math.max(x.pageW, x.pageH))
}

/**
 * 已有的画面够清楚吗:容器里第一张画布的像素宽,离这次要画的像素宽不到 REDRAW_RATIO 倍就算够(变窄、只宽一点都算够)。
 * 容器还空着 = 不够,要画。
 *
 * @param x 容器与这次第一页要画的像素宽。
 * @returns 够清楚 = true。
 */
export function isSharpEnough(x: SharpIn): boolean {
  const first = x.box.firstElementChild
  if (first instanceof HTMLCanvasElement) {
    return x.px <= first.width * REDRAW_RATIO
  }
  return false
}

/**
 * 把原件每一页画进容器:每页按「容器宽 / 页宽 × 设备像素比」画,显示尺寸由样式铺满容器的宽、高随比例,
 * 从上到下排。容器是本函数独占的一块(React 不往里放子节点),所以整批画好后一次换进去,换之前旧画面照旧看得见。
 * 已有画面够清楚就不画;画到一半被取消(容器又变宽、预览区卸下)就丢掉这一批。画不出来拨「画不了」。
 *
 * @param x 文档、容器、容器宽、取消信号与两个落格。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfPages(x: PdfPagesIn): Promise<void> {
  try {
    const canvases: HTMLCanvasElement[] = []
    for (let i = 1; i <= x.doc.numPages; i++) {
      const page = await x.doc.getPage(i)
      const base = page.getViewport({ scale: PAGE_BASE_SCALE })
      const viewport = page.getViewport({
        scale: pageScaleOf({ width: x.width, pageW: base.width, pageH: base.height }),
      })
      if (canvases.length === 0 && isSharpEnough({ box: x.box, px: Math.floor(viewport.width) })) {
        return
      }
      const canvas = document.createElement(CANVAS_TAG)
      canvas.className = cssOf(css.page)
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      await page.render({ canvas, viewport }).promise
      if (x.signal.aborted) {
        return
      }
      canvases.push(canvas)
    }
    x.box.replaceChildren(...canvases)
    x.setReady(true)
  } catch {
    if (x.signal.aborted === false) {
      x.setFailed(true)
    }
  }
}

/**
 * 这次画之前等多久:容器还空着(头一次)马上画;已有画面(容器变宽后重画)等宽度停下。
 *
 * @param box 放页的容器。
 * @returns 毫秒。
 */
export function drawDelayOf(box: HTMLDivElement): number {
  if (box.childElementCount === 0) {
    return DRAW_NOW_MS
  }
  return REDRAW_SETTLE_MS
}

/**
 * 排一次画页(effect 用):到点才画;effect 清理时(容器宽又变了、预览区卸下)取消没开始的那次,
 * 已经在画的那次也叫停,免得旧宽度的画面盖掉新的。
 *
 * @param x 文档、容器、容器宽与两个落格。
 * @returns 取消函数。
 */
export function makePagesDraw(x: PagesDrawIn): () => void {
  const ctl = new AbortController()
  function draw(): void {
    void renderPdfPages({
      doc: x.doc, box: x.box, width: x.width, signal: ctl.signal, setReady: x.setReady, setFailed: x.setFailed,
    })
  }
  const timer = window.setTimeout(draw, drawDelayOf(x.box))
  return function cancelDraw(): void {
    window.clearTimeout(timer)
    ctl.abort()
  }
}

/**
 * 盯着放页容器的宽(effect 用):挂上先报一次,之后宽度一变就报(拉窗口、收侧栏、转屏);
 * 浏览器没有 ResizeObserver 时只报头一次。
 *
 * @param x 容器与落格。
 * @returns 解绑函数。
 */
export function makeWidthWatch(x: WidthWatchIn): () => void {
  function onBoxResize(): void {
    x.setWidth(x.box.clientWidth)
  }
  onBoxResize()
  if (typeof ResizeObserver === 'undefined') {
    return function stopNothing(): void {
      return
    }
  }
  const ro = new ResizeObserver(onBoxResize)
  ro.observe(x.box)
  return function stopWidthWatch(): void {
    ro.disconnect()
  }
}

/**
 * 预览区卸下(或换文件)时销毁文档,放掉 worker 里的内存。
 *
 * @param doc 文档。
 * @returns 销毁函数。
 */
export function makeDocDrop(doc: PdfDoc): () => void {
  return function dropDoc(): void {
    void doc.loadingTask.destroy()
  }
}
