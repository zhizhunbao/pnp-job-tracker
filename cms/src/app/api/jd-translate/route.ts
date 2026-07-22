/**
 * POST /api/jd-translate {url, lang:'zh'|'ko'} — JD 五节整理版懒翻译(职位弹框「显示中文对照」用)。
 * 只翻库内 jobs.jd_formatted(整理版就绪才可翻;不收任意文本,防开放代理)。
 * 翻译=lib/lineTranslate 共享层(#181):分块编号对位+失败块重试+部分容错(没翻到的行保留英文)。
 * [ROLE] 等节标记与 (not stated) 原样保留,输出与原文**行结构完全一致**——前端按节内行号逐句配对。
 * 进程内缓存 url+lang(只缓存全量翻齐的;部分翻齐直接返回不缓存,下次点重试补齐)。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'
import { translateLinesAligned, translateReady } from '@/lib/lineTranslate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IP_DAILY = 60

const cache = new Map<string, string>()

// 整理版按行拆:节标记/(not stated)/空行不进翻译,译完按原行位拼回。
// ⚠️ 标记可与正文**同行**(实际数据大量是「[ROLE] Store Supervisor …」,#180 教训),
// 标记/「- 」前缀剥下保管、只翻正文。
async function translateFormatted(text: string, lang: string, signal: AbortSignal): Promise<{ text: string; full: boolean }> {
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
  if (!jobs.length) return { text, full: true }
  const translated = await translateLinesAligned(jobs.map((j) => j.body), lang, signal)
  if (translated.every((t) => t == null)) throw new Error('translate unavailable')
  const result = [...lines]
  let full = true
  jobs.forEach((j, i) => {
    if (translated[i]) result[j.idx] = j.prefix + translated[i]
    else full = false                                // 没翻到的行保留英文(前端同文不重复渲)
  })
  return { text: result.join('\n'), full }
}

export async function POST(req: Request) {
  if (!translateReady()) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
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
    const { text, full } = await translateFormatted(fmt, lang, ctl.signal)
    if (full) cache.set(ck, text)
    return Response.json({ ok: true, text, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
