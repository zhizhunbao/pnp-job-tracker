// 读「真实抓取的职位描述文本」:按职位投递 URL 找对应 .md(05b/04 抓的),去掉 frontmatter 返回正文。
// 给前端「职位描述」弹框用。只读、无大模型。索引未命中(重抓后改名)→ 重建一次重试。
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_ROOT = path.resolve(process.cwd(), '..', 'data')

let idx: Map<string, string> | null = null
function buildIndex(): Map<string, string> {
  const m = new Map<string, string>()
  const walk = (dir: string) => {
    let entries: fs.Dirent[] = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) {
        try {
          const head = fs.readFileSync(p, 'utf8').slice(0, 600)
          const u = head.match(/^url:\s*(.+)$/m)
          if (u) m.set(u[1].trim(), p)
        } catch { /* ignore */ }
      }
    }
  }
  walk(path.join(DATA_ROOT, 'processed', 'jobbank', 'details'))
  walk(path.join(DATA_ROOT, 'processed', 'ats'))
  return m
}
function readBody(file?: string): string | null {
  if (!file) return null
  try {
    const raw = fs.readFileSync(file, 'utf8')
    return raw.replace(/^---[\s\S]*?\n---\s*/m, '').trim()  // 去 frontmatter → 正文
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url) return new Response('', { status: 400 })
  if (!idx) idx = buildIndex()
  let body = readBody(idx.get(url))
  if (body === null) { idx = buildIndex(); body = readBody(idx.get(url)) }  // 索引过期 → 重建重试
  return new Response(body ?? '', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
