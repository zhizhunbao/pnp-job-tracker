/**
 * POST /api/noc-translate {noc, lang:'zh'|'ko'} — NOC 官方职责/任职要求懒翻译(分类弹框「显示中文对照」用)。
 * 数据层只存英文(NocDescriptions.duties/requirements 单语),这里按需调朋友的 qwen(TRANSLATE_API_*,
 * 与 news-translate 同服务)按**行编号对位**翻(lib/lineTranslate 共享层:分块+重试+部分容错)。
 * 进程内缓存(一个 NOC 全站翻一次;NOC 集小且静态,重启后按需重暖)——刻意不动 DB schema(不碰生产列)。
 * 防线:IP 日限 + 只认库内 NOC + env 未配置 503(前端按钮吞错误态)。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf } from '@/lib/rateLimit'
import { translateLinesAligned, translateReady } from '@/lib/lineTranslate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IP_DAILY = 80

const cache = new Map<string, { duties: string; requirements: string }>()

// duties/requirements 是**逐行**(一行一条,与 NocDutiesView 的 split('\n') 同口径)。
// 翻译=lib/lineTranslate 共享层(#181):分块对位+重试+部分容错(没翻到的行保留英文,前端同文不重复渲);
// 全 null=服务不可用才报错。返回 {text, full}——full 才进缓存,部分翻齐下次点重试补齐。
async function translateLines(text: string, lang: string, signal: AbortSignal): Promise<{ text: string; full: boolean }> {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return { text: '', full: true }
  const translated = await translateLinesAligned(lines, lang, signal)
  if (translated.every((t) => t == null)) throw new Error('translate unavailable')
  return { text: lines.map((l, i) => translated[i] || l).join('\n'), full: translated.every((t) => t != null) }
}

export async function POST(req: Request) {
  if (!translateReady()) return Response.json({ ok: false, error: 'not configured' }, { status: 503 })
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
    const duties = row.duties ? await translateLines(row.duties, lang, ctl.signal) : { text: '', full: true }
    const requirements = row.requirements ? await translateLines(row.requirements, lang, ctl.signal) : { text: '', full: true }
    const val = { duties: duties.text, requirements: requirements.text }
    if (duties.full && requirements.full) cache.set(ck, val)
    return Response.json({ ok: true, ...val, cached: false })
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
