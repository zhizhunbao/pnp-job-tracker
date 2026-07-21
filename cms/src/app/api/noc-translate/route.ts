/**
 * POST /api/noc-translate {noc, lang:'zh'|'ko'} — NOC 官方职责/任职要求懒翻译(分类弹框「显示中文对照」用)。
 * 数据层只存英文(NocDescriptions.duties/requirements 单语),这里按需调朋友的 qwen(TRANSLATE_API_*,
 * 与 news-translate 同服务)按**行编号对位**翻:缺号=整块拒收(宁可回英文,不出错行)。
 * 进程内缓存(一个 NOC 全站翻一次;NOC 集小且静态,重启后按需重暖)——刻意不动 DB schema(不碰生产列)。
 * 防线:IP 日限 + 只认库内 NOC + env 未配置 503(前端按钮吞错误态)。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
const IP_DAILY = 80

const cache = new Map<string, { duties: string; requirements: string }>()

const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\*\*/g, '')

// 按编号对位解析(镜像 news-translate 的 parseNumbered):缺号/空段 → null(整块拒收)
function parseNumbered(out: string, n: number): string | null {
  const parts = out.split(/\n?\[(\d+)\]\s*/)
  const d = new Map<number, string>()
  for (let i = 1; i + 1 < parts.length + 1; i += 2) {
    const t = stripMd(parts[i + 1] ?? '').trim()
    if (t) d.set(Number(parts[i]), t)
  }
  for (let k = 1; k <= n; k++) if (!d.get(k)) return null
  return Array.from({ length: n }, (_, i) => d.get(i + 1)).join('\n')
}

// duties/requirements 是**逐行**(一行一条,与 NocDutiesView 的 split('\n') 同口径)——按行编号翻,原样回行
async function translateLines(text: string, lang: string, signal: AbortSignal): Promise<string> {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return ''
  const numbered = lines.map((l, i) => `[${i + 1}] ${l}`).join('\n')
  const resp = await fetch(`${BASE}/api/translate`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify({ text: numbered, source_lang: 'en', target_lang: lang }),
  })
  if (!resp.ok) throw new Error(`upstream ${resp.status}`)
  const out = String((await resp.json()).translated_text || '')
  const body = parseNumbered(out, lines.length)
  if (!body) throw new Error('alignment failed')
  return body
}

export async function POST(req: Request) {
  if (!BASE || !KEY) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
  let noc = '', lang = ''
  try { const b = await req.json(); noc = String(b.noc || ''); lang = String(b.lang || '') } catch { /* fallthrough */ }
  if (!noc || (lang !== 'zh' && lang !== 'ko')) return Response.json({ ok: false, error: 'bad request' }, { status: 400 })

  const ck = `${noc}:${lang}`
  const hit = cache.get(ck)
  if (hit) return Response.json({ ok: true, ...hit, cached: true })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const r = await pool.query('SELECT duties, requirements FROM noc_descriptions WHERE noc = $1 LIMIT 1', [noc])
  const row = r.rows[0]
  if (!row || (!row.duties && !row.requirements)) return Response.json({ ok: false, error: 'not found' }, { status: 404 })

  if (!checkLimit([[`noctr:${ipOf(req)}`, IP_DAILY]])) return Response.json({ ok: false, error: 'rate limited' }, { status: 429 })

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    const duties = row.duties ? await translateLines(row.duties, lang, ctl.signal) : ''
    const requirements = row.requirements ? await translateLines(row.requirements, lang, ctl.signal) : ''
    const val = { duties, requirements }
    cache.set(ck, val)
    return Response.json({ ok: true, ...val, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
