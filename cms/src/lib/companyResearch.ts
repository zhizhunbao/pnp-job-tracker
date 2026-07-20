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
  const [r, wd] = await Promise.all([
    friendChat({
      prompt: `Company: ${name} (Canada). What does this company do?`,
      system: SYSTEM,
      webSearch: true,
      searchQuery: `${name} company Canada`,
      timeoutMs: 60_000,
    }),
    wikidataLookup(name),
  ])
  // Wikidata 懒查回填(2026-07-20 Frank 拍板批量退役「公司详情全懒」):调查同时并行查一次,
  // 命中回填别名/知名列(COALESCE 不覆盖已有值);没命中/失败不重试——一家公司一生一次,宁缺勿滥。
  if (wd) {
    await pool.query(
      'UPDATE companies SET alias_zh = COALESCE(alias_zh, $1), alias_ko = COALESCE(alias_ko, $2), wiki_url = COALESCE(wiki_url, $3) WHERE id = $4',
      [wd.zh || null, wd.ko || null, wd.wiki, id],
    ).catch(() => {})
  }
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

// ── Wikidata 严格名称匹配(移植 etl/clean/_enrich_company_facts.py,批量脚本退役后这是唯一查询点)──
// 门槛与批量版一致:en 标签/别名归一后全等 + 有英文维基条目才算知名;不机翻,别名只收官方跨语言标签。
const WD = 'https://www.wikidata.org/w/api.php'
const SUFFIX = /\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|holdings?)\b\.?/gi
const norm = (s: string) => s.toLowerCase().replace(/[.,]/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim()

async function wdGet(params: Record<string, string>, signal: AbortSignal): Promise<any> {
  const r = await fetch(WD + '?' + new URLSearchParams({ ...params, format: 'json' }), {
    signal, headers: { 'User-Agent': 'offer2pr-company-facts/1.0 (lazy enrichment; contact via site)' },
  })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

async function wikidataLookup(name: string): Promise<{ zh: string; ko: string; wiki: string } | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const hits = (await wdGet({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: '3' }, ctrl.signal)).search || []
    const ids: string[] = hits.map((h: any) => h.id).filter(Boolean)
    if (!ids.length) return null
    const ents = (await wdGet({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|aliases|sitelinks', languages: 'en|zh|ko' }, ctrl.signal)).entities || {}
    const target = norm(name)
    for (const id of ids) {
      const e = ents[id] || {}
      const labels = e.labels || {}
      const names = [labels.en?.value || '', ...(e.aliases?.en || []).map((a: any) => a?.value || '')]
      if (!names.some((x: string) => x && norm(x) === target)) continue
      const title = e.sitelinks?.enwiki?.title
      if (!title) continue // 无英文维基条目=不算知名,别名也不收(与批量版同门槛)
      return { zh: labels.zh?.value || '', ko: labels.ko?.value || '', wiki: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')) }
    }
    return null
  } catch {
    return null // 超时/掉线静默,不重试(下次这家公司永不再查——ai_brief 已缓存就不会再进 investigate)
  } finally {
    clearTimeout(timer)
  }
}
