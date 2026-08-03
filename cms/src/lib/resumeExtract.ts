// 简历文件 → 纯文本(内存解析,不落盘不入库;E11-07 首用,G3 上传复用)。
// 只管 pdf/docx —— md/txt 是文本文件,前端 FileReader 直读,不必进服务端。
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

export async function extractText(name: string, buf: Buffer): Promise<string | null> {
  const ext = name.toLowerCase().split('.').pop() || ''
  try {
    if (ext === 'pdf') {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(buf) })
      try { return (await parser.getText())?.text ?? '' } finally { await parser.destroy().catch(() => {}) }
    }
    if (ext === 'docx') {
      const mammoth = (await import('mammoth')).default
      return (await mammoth.extractRawText({ buffer: buf }))?.value ?? ''
    }
  } catch { return null }  // 加密 PDF/损坏文件等 → 统一走 parse 失败回退
  return null
}
