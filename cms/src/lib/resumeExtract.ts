// 简历文件 → 纯文本(内存解析,不落盘不入库;E11-07 首用,G3 上传复用)。
// 只管 pdf/docx —— md/txt 是文本文件,前端 FileReader 直读,不必进服务端。
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

export async function extractText(name: string, buf: Buffer): Promise<{ text: string | null; err: string }> {
  const ext = name.toLowerCase().split('.').pop() || ''
  try {
    if (ext === 'pdf') {
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
