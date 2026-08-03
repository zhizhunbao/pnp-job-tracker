// 简历文件 → 纯文本(内存解析,不落盘不入库;E11-07 首用,G3 上传复用)。
// 只管 pdf/docx —— md/txt 是文本文件,前端 FileReader 直读,不必进服务端。
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

// pdfjs 5.x 模块初始化引用 DOM 全局(DOMMatrix 等)。本机/Windows 由 @napi-rs/canvas 原生包顶上;
// 生产 Linux 上它加载不成 → 「Failed to load external module pdf-parse: DOMMatrix is not defined」
// (2026-08-03 生产实撞,detail 探针抓到)。文本抽取不做矩阵运算,垫最小 stub 让模块能初始化即可。
function shimPdfGlobals() {
  const g = globalThis as any
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      constructor(init?: number[]) {
        if (Array.isArray(init) && init.length === 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init
      }
      translate() { return this } scale() { return this } multiply() { return this }
      inverse() { return this } transformPoint(p: unknown) { return p }
    }
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class ImageData { width = 0; height = 0; data: Uint8ClampedArray
      constructor(w: number, h: number) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4) } }
  }
  if (typeof g.Path2D === 'undefined') { g.Path2D = class Path2D { addPath() {} moveTo() {} lineTo() {} } }
}

export async function extractText(name: string, buf: Buffer): Promise<{ text: string | null; err: string }> {
  const ext = name.toLowerCase().split('.').pop() || ''
  try {
    if (ext === 'pdf') {
      shimPdfGlobals()
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(buf) })
      try { return { text: (await parser.getText())?.text ?? '', err: '' } } finally { await parser.destroy().catch(() => {}) }
    }
    if (ext === 'docx') {
      const mammoth = (await import('mammoth')).default
      return { text: (await mammoth.extractRawText({ buffer: buf }))?.value ?? '', err: '' }
    }
  } catch (e) {
    // 加密 PDF/损坏文件等 → 统一走 parse 失败回退;真实错误必须留痕 ——
    // 2026-08-03 生产 PDF 必败查了两轮才发现 catch 把 module/引擎错误也吞了
    const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    console.log(`[resumeExtract] ${ext} fail: ${err.slice(0, 300)}`)
    return { text: null, err }
  }
  return { text: null, err: 'unsupported' }
}
