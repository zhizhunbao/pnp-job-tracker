/**
 * 公司联网调查共享层(#107):K 懒探索(/api/companyinfo)与顾问公司初判(/api/advisor)同源,
 * 一家公司全站只查一次,缓存=companies.ai_* 四列(永久)。
 * 红线:查不到如实回 null(反编);同名并发合流;掉线/超时静默降级由 friendChat 兜。
 */
import { friendChat } from './friendLlm'

export type CompanyResearch = { brief: string; website: string; sources: string[]; fetched: string }

const SYSTEM = 'You are a factual company researcher. Answer ONLY from the web search results. 2-3 short sentences: what the company does, where it is based, rough size if stated. If results are unclear or about a different company, reply exactly: NOT_FOUND. Finally on its own line output [SITE]=<official website url or NONE>. No other commentary.'

const inflight = new Map<string, Promise<CompanyResearch | null>>()

// 按公司名取缓存行;不在 companies 的雇主(Job Bank 大量)懒建最小行给缓存落脚,source 标 ai-lazy
export async function companyRow(pool: any, name: string): Promise<{ id: number; cached: CompanyResearch | null } | null> {
  const { rows } = await pool.query(
    'SELECT id, ai_brief, ai_website, ai_sources, ai_fetched FROM companies WHERE lower(name) = lower($1) LIMIT 1',
    [name],
  )
  let row = rows[0]
  if (!row) {
    const ins = await pool.query(
      `INSERT INTO companies (name, source, updated_at, created_at) VALUES ($1, 'ai-lazy', now(), now()) RETURNING id`,
      [name],
    ).catch(() => null)
    if (!ins?.rows?.[0]) return null
    row = { id: ins.rows[0].id, ai_brief: null }
  }
  let cached: CompanyResearch | null = null
  if (row.ai_brief) {
    let sources: string[] = []
    try { sources = JSON.parse(row.ai_sources || '[]') } catch { /* ignore */ }
    cached = { brief: row.ai_brief, website: row.ai_website || '', sources, fetched: String(row.ai_fetched || '').slice(0, 10) }
  }
  return { id: row.id, cached }
}

export async function investigateCompany(pool: any, id: number, name: string): Promise<CompanyResearch | null> {
  let p = inflight.get(name)
  if (!p) {
    p = investigate(pool, id, name).finally(() => inflight.delete(name))
    inflight.set(name, p)
  }
  return p
}

async function investigate(pool: any, id: number, name: string): Promise<CompanyResearch | null> {
  const r = await friendChat({
    prompt: `Company: ${name} (Canada). What does this company do?`,
    system: SYSTEM,
    webSearch: true,
    searchQuery: `${name} company Canada`,
    timeoutMs: 60_000,
  })
  if (!r) return null
  const brief = r.answer.replace(/\[SITE\]=[^\n]*/g, '').trim()
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
