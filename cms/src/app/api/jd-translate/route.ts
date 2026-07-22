/**
 * POST /api/jd-translate {url, lang:'zh'|'ko'} — JD 五节整理版懒翻译(职位弹框「显示中文对照」用)。
 * 只翻库内 jobs.jd_formatted(整理版就绪才可翻;不收任意文本,防开放代理),按**行编号对位**翻:
 * 缺号=整块拒收(宁可回英文,不出错行;镜像 noc-translate)。[ROLE] 等节标记与 (not stated) 原样保留,
 * 输出与原文**行结构完全一致** —— 前端按节内行号逐句配对。进程内缓存 url+lang;刻意不动 DB schema。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
const IP_DAILY = 60

const cache = new Map<string, string>()

const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\*\*/g, '')

// 按编号对位解析(镜像 noc-translate 的 parseNumbered):缺号/空段 → null(整块拒收)
function parseNumbered(out: string, n: number): string[] | null {
  const parts = out.split(/\n?\[(\d+)\]\s*/)
  const d = new Map<number, string>()
  for (let i = 1; i + 1 < parts.length + 1; i += 2) {
    const t = stripMd(parts[i + 1] ?? '').trim()
    if (t) d.set(Number(parts[i]), t)
  }
  for (let k = 1; k <= n; k++) if (!d.get(k)) return null
  return Array.from({ length: n }, (_, i) => d.get(i + 1)!)
}

// 整理版按行翻:节标记/(not stated)/空行不进翻译,译完按原行位拼回。
// ⚠️ 标记可与正文**同行**(实际数据大量是「[ROLE] Store Supervisor …」),标记/「- 」前缀都要剥下来
// 保管、只翻正文——首版只认独占行,标记被 qwen 翻成「[职位]」,前端按 [ROLE] 解析归零=「对照不显示」。
async function translateFormatted(text: string, lang: string, signal: AbortSignal): Promise<string> {
  const lines = text.split('\n')
  const jobs: { idx: number; prefix: string; body: string }[] = []
  lines.forEach((raw, idx) => {
    let l = raw.trim()
    let prefix = ''
    const mk = l.match(/^(\[(?:ROLE|REQS|PAY|WORKHOURS|APPLY)\]\s*)(.*)$/)
    if (mk) { prefix = mk[1]; l = mk[2].trim() }
    if (!l || /^\(not stated\)$/i.test(l)) return   // 纯标记行/缺节行原样保留
    const b = l.match(/^(-\s+)(.*)$/)
    if (b) { prefix += '- '; l = b[2] }
    jobs.push({ idx, prefix, body: l })
  })
  if (!jobs.length) return text
  const numbered = jobs.map((j, i) => `[${i + 1}] ${j.body}`).join('\n')
  const resp = await fetch(`${BASE}/api/translate`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify({ text: numbered, source_lang: 'en', target_lang: lang }),
  })
  if (!resp.ok) throw new Error(`upstream ${resp.status}`)
  const out = String((await resp.json()).translated_text || '')
  const translated = parseNumbered(out, jobs.length)
  if (!translated) throw new Error('alignment failed')
  const result = [...lines]
  jobs.forEach((j, i) => { result[j.idx] = j.prefix + translated[i] })
  return result.join('\n')
}

export async function POST(req: Request) {
  if (!BASE || !KEY) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
  let url = '', lang = ''
  try { const b = await req.json(); url = String(b.url || '').trim(); lang = String(b.lang || '') } catch { /* fallthrough */ }
  if (!url || (lang !== 'zh' && lang !== 'ko')) return Response.json({ ok: false, error: 'bad request' }, { status: 400 })

  const ck = `${url}:${lang}`
  const hit = cache.get(ck)
  if (hit) return Response.json({ ok: true, text: hit, cached: true })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const r = await pool.query('SELECT jd_formatted FROM jobs WHERE apply_url = $1 LIMIT 1', [url])
  const fmt = r.rows[0]?.jd_formatted
  if (!fmt) return Response.json({ ok: false, error: 'not found' }, { status: 404 })

  if (!checkLimit([[`jdtr:${ipOf(req)}`, IP_DAILY]])) return Response.json({ ok: false, error: 'rate limited' }, { status: 429 })

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    const text = await translateFormatted(fmt, lang, ctl.signal)
    cache.set(ck, text)
    return Response.json({ ok: true, text, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
