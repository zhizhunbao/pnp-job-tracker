// 简历上传解析(E11-07):PDF/DOCX → 文本 → LLM 抽取(职名/年限/语言) → NOC 候选(在库职位标题 trgm 匹配)。
// 隐私红线:原件不落盘不入库(内存 Buffer 解析完即弃),日志不含简历文本;抽取结果=预填建议,入库走用户确认后的 /api/users PATCH。
// 免费口径:登录可用,#124 起走统一免费池(FREE_DAILY_TRIES/日,四端点同池);付费仍在匹配列,不在这。
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { FREE_DAILY_TRIES } from '@/lib/plan'
import { freeGate } from '@/lib/freeQuota'
import { completeText, LlmError } from '@/lib/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_CHARS = 12000   // 送 LLM 的正文上限(简历超长截断,前两页信息足够)

// IELTS(G 类)→ CLB:四技能各自换算取最小(IRCC 官方对照;简历极少直接写 CLB)
const IELTS_CLB: { clb: number; l: number; r: number; w: number; s: number }[] = [
  { clb: 10, l: 8.5, r: 8.0, w: 7.5, s: 7.5 },
  { clb: 9, l: 8.0, r: 7.0, w: 7.0, s: 7.0 },
  { clb: 8, l: 7.5, r: 6.5, w: 6.5, s: 6.5 },
  { clb: 7, l: 6.0, r: 6.0, w: 6.0, s: 6.0 },
  { clb: 6, l: 5.5, r: 5.0, w: 5.5, s: 5.5 },
  { clb: 5, l: 5.0, r: 4.0, w: 5.0, s: 5.0 },
]
function ieltsToClb(b: { listening?: number; reading?: number; writing?: number; speaking?: number } | null): number | null {
  if (!b || [b.listening, b.reading, b.writing, b.speaking].some((v) => typeof v !== 'number')) return null
  for (const row of IELTS_CLB) {
    if (b.listening! >= row.l && b.reading! >= row.r && b.writing! >= row.w && b.speaking! >= row.s) return row.clb
  }
  return null
}

async function extractText(name: string, buf: Buffer): Promise<string | null> {
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

// LLM 输出容错解析:剥 ```json 围栏,取首尾大括号段
function parseJson(raw: string): any | null {
  const cleaned = raw.replace(/```json|```/g, '')
  const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(cleaned.slice(a, b + 1)) } catch { return null }
}

const EXTRACT_SYSTEM =
  'You extract structured facts from a resume. Reply with ONLY a JSON object, no prose, no markdown fence:\n' +
  '{"titles":[{"title_en":"<job title in English, generic occupational phrasing>","years":<number|null>}],' +
  '"ielts":{"listening":<n>,"reading":<n>,"writing":<n>,"speaking":<n>}|null,"clb":<number|null>}\n' +
  'Rules: titles = up to 3 most recent/representative OCCUPATIONS (translate to English if needed; strip company/level noise, e.g. "高级Java开发" -> "software developer"). ' +
  'years = years of experience in that occupation if stated or clearly inferable, else null. ' +
  'ielts/clb ONLY if the resume explicitly states test scores — never guess; absent = null.'

export async function POST(req: NextRequest) {
  const user = await getUser(req.headers)
  if (!user) return Response.json({ error: 'login' }, { status: 401 })
  // #124 统一免费额度池:与 jobtext/advisor/scoredetail 同池同数;对 wizard 保持旧契约({error:'limit'} 429)
  const g = freeGate(user, req)
  if (g.block) return Response.json({ error: 'limit' }, { status: 429 })
  const freeLeft = g.left ?? FREE_DAILY_TRIES

  let file: File | null = null
  try { file = (await req.formData()).get('file') as File | null } catch { /* 非 multipart */ }
  if (!file || typeof file === 'string') return Response.json({ error: 'nofile' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'size' }, { status: 413 })

  const buf = Buffer.from(await file.arrayBuffer())
  const text = (await extractText(file.name || '', buf))?.replace(/\s+/g, ' ').trim() ?? null
  if (text == null) return Response.json({ error: 'parse', freeLeft }, { status: 422 })
  if (text.length < 120) return Response.json({ error: 'scan', freeLeft }, { status: 422 })  // 扫描件/空文件:无文本层

  let data: any
  try {
    const raw = await completeText([
      { role: 'system', content: EXTRACT_SYSTEM },
      { role: 'user', content: text.slice(0, MAX_CHARS) },
    ], { maxTokens: 500 })
    data = parseJson(raw)
  } catch (e) {
    if (e instanceof LlmError) return Response.json({ error: 'llm', freeLeft }, { status: 502 })
    throw e
  }
  if (!data || !Array.isArray(data.titles)) return Response.json({ error: 'llm', freeLeft }, { status: 502 })

  // 职名 → NOC 候选:在库职位标题 pg_trgm 相似度(真实在招岗位的 title→noc 映射,比官方类名更贴简历用语)
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const seen = new Set<string>()
  const nocCandidates: { noc: string; title: string }[] = []
  for (const t of data.titles.slice(0, 3)) {
    const q = String(t?.title_en || '').slice(0, 80)
    if (q.length < 3) continue
    const { rows } = await pool.query(
      `SELECT j.noc, max(similarity(j.title, $1)) AS sim, count(*) AS n
       FROM jobs j WHERE j.noc IS NOT NULL AND j.noc <> '' AND similarity(j.title, $1) > 0.3
       GROUP BY j.noc ORDER BY sim DESC, n DESC LIMIT 3`, [q])
    for (const r of rows) {
      if (seen.has(r.noc) || nocCandidates.length >= 5) continue
      seen.add(r.noc)
      nocCandidates.push({ noc: r.noc, title: '' })
    }
  }
  if (nocCandidates.length) {
    const { rows } = await pool.query(
      `SELECT noc, title FROM noc_descriptions WHERE noc = ANY($1)`, [nocCandidates.map((c) => c.noc)])
    const byNoc = new Map(rows.map((r: any) => [r.noc, r.title]))
    for (const c of nocCandidates) c.title = String(byNoc.get(c.noc) ?? '')
  }

  const clb = typeof data.clb === 'number' && data.clb >= 4 && data.clb <= 10 ? Math.round(data.clb) : ieltsToClb(data.ielts)
  return Response.json({ nocCandidates, clb, freeLeft })
}
