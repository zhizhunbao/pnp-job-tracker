/**
 * POST /api/companyinfo {name} — 公司信息懒探索(K,2026-07-19 Frank 批「点开没链接 AI 现去查」)。
 * 命中 companies.ai_brief 直接回;缺则 friendChat + web_search 联网调查 → 存 ai_* 四列=永久缓存。
 * 红线:出处列表随答案返回(citation 惯例);查不到如实回空;检索官网与 directory 官网分开存;掉线静默 204。
 */
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { friendChat, friendLlmReady } from '@/lib/friendLlm'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM = 'You are a factual company researcher. Answer ONLY from the web search results. 2-3 short sentences: what the company does, where it is based, rough size if stated. If results are unclear or about a different company, reply exactly: NOT_FOUND. Finally on its own line output [SITE]=<official website url or NONE>. No other commentary.'

const inflight = new Map<string, Promise<Record<string, unknown> | null>>()

async function investigate(pool: any, id: number, name: string): Promise<Record<string, unknown> | null> {
  const r = await friendChat({
    prompt: `Company: ${name} (Canada). What does this company do?`,
    system: SYSTEM,
    webSearch: true,
    searchQuery: `${name} company Canada`,
    timeoutMs: 60_000,
  })
  if (!r) return null
  let brief = r.answer.replace(/\[SITE\]=[^\n]*/g, '').trim()
  const site = r.answer.match(/\[SITE\]=\s*(\S+)/)?.[1] || ''
  const website = /^https?:\/\/\S+$/i.test(site) ? site : ''
  if (!brief || /NOT_FOUND/.test(brief) || brief.length < 20 || brief.length > 800) return null
  const sources = r.sources
  await pool.query(
    'UPDATE companies SET ai_brief = $1, ai_website = $2, ai_sources = $3, ai_fetched = now() WHERE id = $4',
    [brief, website || null, JSON.stringify(sources), id],
  )
  return { brief, website, sources, fetched: new Date().toISOString().slice(0, 10) }
}

export async function POST(req: NextRequest) {
  if (!friendLlmReady()) return Response.json({ ok: false }, { status: 204 })
  let name = ''
  try { name = String((await req.json())?.name || '').trim() } catch { /* fallthrough */ }
  if (!name || name.length > 200) return Response.json({ ok: false }, { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(
    'SELECT id, ai_brief, ai_website, ai_sources, ai_fetched FROM companies WHERE lower(name) = lower($1) LIMIT 1',
    [name],
  )
  let row = rows[0]
  if (!row) {
    // Job Bank 大量雇主不在 companies 维度表(表原是 directory 来源)——懒建最小行给缓存落脚,source 标 ai-lazy
    const ins = await pool.query(
      `INSERT INTO companies (name, source, updated_at, created_at) VALUES ($1, 'ai-lazy', now(), now()) RETURNING id`,
      [name],
    ).catch(() => null)
    if (!ins?.rows?.[0]) return new Response('', { status: 204 })
    row = { id: ins.rows[0].id, ai_brief: null }
  }
  if (row.ai_brief) {
    let sources: string[] = []
    try { sources = JSON.parse(row.ai_sources || '[]') } catch { /* ignore */ }
    return Response.json({ brief: row.ai_brief, website: row.ai_website || '', sources, fetched: String(row.ai_fetched || '').slice(0, 10) })
  }
  if (!checkLimit([[`coai:${ipOf(req)}`, Number(process.env.COMPANYINFO_IP_DAILY || 30)]])) return new Response('', { status: 204 })
  let p = inflight.get(name)
  if (!p) {
    p = investigate(pool, row.id, name).finally(() => inflight.delete(name))
    inflight.set(name, p)
  }
  const out = await p
  if (!out) return new Response('', { status: 204 })
  return Response.json(out)
}
