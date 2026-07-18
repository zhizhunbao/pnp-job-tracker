/**
 * POST /api/news-translate {slug, lang: 'zh'|'ko'} — 新闻正文懒翻译(E12-06 P1e,Frank 终版拍板「线上实时」)。
 * 命中 DB 缓存(body_zh/body_ko)直接回;缺则调朋友的模型服务(qwen3.6,TRANSLATE_API_* env)按
 * **编号对位协议**翻译:原文逐段 [1..N] 喂入 → 译文按号解析 → 缺号=整条拒收不缓存(宁可失败不出错位页)
 * → 校验过写回 news 表=永久缓存(第二个读者秒开)。
 * 防线:IP 日限(进程内 rateLimit)+ 只认库里存在的 slug + env 未配置返回 503(前端按钮隐藏错误态)。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
const BODY_CAP = 10000        // 与 ETL 同口径:超长稿只翻前 N 整段,尾段只显英文不错位
const IP_DAILY = 60           // 每 IP 每日翻译调用上限(缓存命中不计)

const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\*\*/g, '')

// 按编号解析译文(镜像 etl/news 的 parse_numbered_body):缺号/空段 → null(拒收)
function parseNumbered(out: string, n: number): string | null {
  const parts = out.split(/\n?\[(\d+)\]\s*/)
  const d = new Map<number, string>()
  for (let i = 1; i + 1 < parts.length + 1; i += 2) {
    const t = stripMd(parts[i + 1] ?? '').trim()
    if (t) d.set(Number(parts[i]), t)
  }
  for (let k = 1; k <= n; k++) if (!d.get(k)) return null
  return Array.from({ length: n }, (_, i) => d.get(i + 1)).join('\n\n')
}

export async function POST(req: Request) {
  if (!BASE || !KEY) return Response.json({ ok: false, error: 'translate not configured' }, { status: 503 })
  let slug = '', lang = ''
  try {
    const b = await req.json()
    slug = String(b.slug || ''); lang = String(b.lang || '')
  } catch { /* fallthrough */ }
  if (!slug || (lang !== 'zh' && lang !== 'ko')) return Response.json({ ok: false, error: 'bad request' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const col = lang === 'zh' ? 'body_zh' : 'body_ko'
  const r = await pool.query(`SELECT body_en AS en, ${col} AS cached FROM news WHERE slug = $1 LIMIT 1`, [slug])
  const row = r.rows[0]
  if (!row?.en) return Response.json({ ok: false, error: 'not found' }, { status: 404 })
  if (row.cached) return Response.json({ ok: true, body: row.cached, cached: true })

  if (!checkLimit([[`ntr:${ipOf(req)}`, IP_DAILY]])) return Response.json({ ok: false, error: 'rate limited' }, { status: 429 })

  // 逐段编号(整段计预算,不截半段)
  const paras: string[] = []
  let used = 0
  for (const p of row.en.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean)) {
    if (used + p.length > BODY_CAP && paras.length) break
    paras.push(p); used += p.length
  }
  const numbered = paras.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    const resp = await fetch(`${BASE}/api/translate`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
      body: JSON.stringify({ text: numbered, source_lang: 'en', target_lang: lang }),
    })
    if (!resp.ok) throw new Error(`upstream ${resp.status}`)
    const out = String((await resp.json()).translated_text || '')
    const body = parseNumbered(out, paras.length)
    if (!body) throw new Error('paragraph alignment failed')
    await pool.query(`UPDATE news SET ${col} = $1 WHERE slug = $2`, [body, slug])
    return Response.json({ ok: true, body, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
