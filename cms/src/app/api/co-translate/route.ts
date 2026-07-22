/**
 * POST /api/co-translate {name, lang:'zh'|'ko'} — 公司 AI 检索简介懒翻译(公司弹框「显示中文对照」用)。
 * 只翻库内 companies.ai_brief(五节标记 [WHAT]/[BASE]/[SIZE]/[FOUNDED]/[NOTE];不收任意文本,防开放代理)。
 * 翻译=lib/lineTranslate 共享层(#181:分块+重试+部分容错保留英文)。节标记与 (not stated) 原样保留,
 * 输出与原文行结构完全一致——前端按节配对,英文下显中文(#185 Frank「点了才在下面显示中文」)。进程缓存 name+lang。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'
import { translateLinesAligned, translateReady } from '@/lib/lineTranslate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IP_DAILY = 60
const cache = new Map<string, string>()

// 五节整理版按行拆:节标记([WHAT] 等,可独占行或与正文同行)/(not stated)/空行不进翻译,译完按原行位拼回。
async function translateBrief(text: string, lang: string, signal: AbortSignal): Promise<{ text: string; full: boolean }> {
  const lines = text.split('\n')
  const jobs: { idx: number; prefix: string; body: string }[] = []
  lines.forEach((raw, idx) => {
    let l = raw.trim()
    let prefix = ''
    const mk = l.match(/^(\[(?:WHAT|BASE|SIZE|FOUNDED|NOTE)\]\s*)(.*)$/)
    if (mk) { prefix = mk[1]; l = mk[2].trim() }
    if (!l || /^\(not stated\)$/i.test(l)) return   // 纯标记行/缺节行原样保留
    jobs.push({ idx, prefix, body: l })
  })
  if (!jobs.length) return { text, full: true }
  const translated = await translateLinesAligned(jobs.map((j) => j.body), lang, signal)
  if (translated.every((t) => t == null)) throw new Error('translate unavailable')
  const result = [...lines]
  let full = true
  jobs.forEach((j, i) => { if (translated[i]) result[j.idx] = j.prefix + translated[i]; else full = false })
  return { text: result.join('\n'), full }
}

export async function POST(req: Request) {
  if (!translateReady()) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
  let name = '', lang = ''
  try { const b = await req.json(); name = String(b.name || '').trim(); lang = String(b.lang || '') } catch { /* fallthrough */ }
  if (!name || (lang !== 'zh' && lang !== 'ko')) return Response.json({ ok: false, error: 'bad request' }, { status: 400 })

  const ck = `${name.toLowerCase()}:${lang}`
  const hit = cache.get(ck)
  if (hit) return Response.json({ ok: true, text: hit, cached: true })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const r = await pool.query('SELECT ai_brief FROM companies WHERE lower(name) = lower($1) AND ai_brief IS NOT NULL LIMIT 1', [name])
  const brief = r.rows[0]?.ai_brief
  if (!brief) return Response.json({ ok: false, error: 'not found' }, { status: 404 })

  if (!checkLimit([[`cotr:${ipOf(req)}`, IP_DAILY]])) return Response.json({ ok: false, error: 'rate limited' }, { status: 429 })

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    const { text, full } = await translateBrief(brief, lang, ctl.signal)
    if (full) cache.set(ck, text)
    return Response.json({ ok: true, text, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
