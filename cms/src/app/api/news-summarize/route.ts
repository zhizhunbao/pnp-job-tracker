/**
 * POST /api/news-summarize {slug, lang: 'zh'|'ko'|'en'} — 新闻 AI 速读按需生成(E12-06 P1f,Frank 拍板)。
 * 命中 DB 缓存(summary_zh/ko/en)直接回;缺则调朋友的 qwen /api/chat(定向语言,无联网)→ 写回=永久缓存。
 * 与 news-translate 同防线:IP 日限 / 只认库内 slug / env 未配置 503。seed 对缓存列不清(专用 upsert 块)。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
const IP_DAILY = 60

const COL: Record<string, string> = { zh: 'summary_zh', ko: 'summary_ko', en: 'summary_en' }
const INSTR: Record<string, [string, string]> = {
  zh: ['用中文 2-3 句总结这篇加拿大官方移民新闻,讲清「发生了什么、对谁有影响」;只依据原文,不要任何开场白或 Markdown 记号。', 'Always answer in Chinese.'],
  ko: ['이 캐나다 공식 이민 뉴스를 한국어 2-3문장으로 요약하세요: 무엇이 일어났고 누구에게 영향이 있는지. 원문에만 근거하고 서두나 Markdown 기호 없이.', 'Always answer in Korean.'],
  en: ['Summarize this official Canadian immigration news in 2-3 sentences: what happened and who is affected. Base it only on the text; no preamble, no Markdown.', 'Always answer in English.'],
}

export async function POST(req: Request) {
  if (!BASE || !KEY) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
  let slug = '', lang = ''
  try {
    const b = await req.json()
    slug = String(b.slug || ''); lang = String(b.lang || '')
  } catch { /* fallthrough */ }
  if (!slug || !COL[lang]) return Response.json({ ok: false, error: 'bad request' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const col = COL[lang]
  const r = await pool.query(`SELECT title, body_en AS en, ${col} AS cached FROM news WHERE slug = $1 LIMIT 1`, [slug])
  const row = r.rows[0]
  if (!row?.en) return Response.json({ ok: false, error: 'not found' }, { status: 404 })
  if (row.cached) return Response.json({ ok: true, summary: row.cached, cached: true })

  if (!checkLimit([[`nsum:${ipOf(req)}`, IP_DAILY]])) return Response.json({ ok: false, error: 'rate limited' }, { status: 429 })

  const [instr, system] = INSTR[lang]
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    const resp = await fetch(`${BASE}/api/chat`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
      body: JSON.stringify({ prompt: `${instr}\n\n标题:${row.title}\n\n正文:\n${String(row.en).slice(0, 8000)}`, web_search: false, system }),
    })
    if (!resp.ok) throw new Error(`upstream ${resp.status}`)
    const summary = String((await resp.json()).answer || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').trim()
    if (summary.length < 10) throw new Error('empty summary')
    await pool.query(`UPDATE news SET ${col} = $1 WHERE slug = $2`, [summary, slug])
    return Response.json({ ok: true, summary, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
