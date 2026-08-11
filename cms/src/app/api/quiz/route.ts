/**
 * GET /api/quiz — 入口三问的两个只读端点(付费漏斗重设计-20260726)。
 *   ?q=厨师          → 第 2 题的职业搜索(NOC 候选 ≤8)
 *   ?noc=63200       → 答完三题的**免费结果**(该职业在招/可提名/命中清单/按省分布/中位薪资)
 * 匿名可用(结果本就免费,注册闸在结果之后);SQL 一律在 lib/jobsSql,本文件只做参数与形状。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchBroadNocs, fetchNocOpenCounts, fetchQuizFacts, searchNocByTitle } from '@/lib/jobsSql'
import { getTopNocsCached } from '@/lib/quizTop'

// 热门清单缓存挪进 lib/quizTop(SWR + 启动预热共用一份;冷启动首访 8.4s 的账见那边注释)
const TOP_TTL = 10 * 60_000
// ?noc= 的事实卡缓存(实测 1.0s/次;决策页分值上下文与职业名回显都在打它)
const factsCache = new Map<string, { at: number; facts: unknown }>()
const countsCache = new Map<string, { at: number; rows: Record<string, { open: number; eligible: number }> }>()
const broadCache = new Map<string, { at: number; rows: unknown[] }>()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const q = (sp.get('q') || '').slice(0, 40)
  const noc = (sp.get('noc') || '').trim()
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool

  if (q) return Response.json({ candidates: await searchNocByTitle(pool, q) })
  // ?broad=技工 → 用户点中大类后才取该类职业。比每次打开控件都查 top=200 更快、更省。
  const broad = (sp.get('broad') || '').trim().slice(0, 24)
  if (broad) {
    const hit = broadCache.get(broad)
    if (hit && Date.now() - hit.at < TOP_TTL) return Response.json({ top: hit.rows })
    const rows = await fetchBroadNocs(pool, broad)
    if (broadCache.size >= 40) broadCache.clear()
    broadCache.set(broad, { at: Date.now(), rows })
    return Response.json({ top: rows })
  }
  // ?top=N → 按在招量排的热门职业(清单本身不手写)。进程内缓存 10 分钟:
  // 这条要对 4 万多在招岗做 GROUP BY,实测 3.6s;选职业控件每次打开都等它是不可接受的,
  // 而它一天也变不了几次(同 /api/market-stats、homeCache 的手法)。
  if (sp.get('top')) {
    const n = Number(sp.get('top')) || 24
    return Response.json({ top: await getTopNocsCached(pool, n) })
  }
  // ?counts=21232,63200 → 这些 NOC 的在招/可提名数(第 2 题热门职业按钮挂真数)
  const counts = (sp.get('counts') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30)
  if (counts.length) {
    const key = counts.slice().sort().join(',')
    const hit = countsCache.get(key)
    if (hit && Date.now() - hit.at < TOP_TTL) return Response.json({ counts: hit.rows })
    const rows = await fetchNocOpenCounts(pool, counts)
    if (countsCache.size >= 100) countsCache.clear()
    countsCache.set(key, { at: Date.now(), rows })
    return Response.json({ counts: rows })
  }
  if (!noc) return Response.json({ error: 'noc or q required' }, { status: 400 })

  // 同款 SWR:命中(含过期)先回,过期后台刷;上限防无界增长(职业总数 ~500,600 封顶纯保险)
  const fHit = factsCache.get(noc)
  if (fHit) {
    if (Date.now() - fHit.at >= TOP_TTL) {
      factsCache.delete(noc)
      fetchQuizFacts(pool, noc).then((facts) => { if (factsCache.size < 600) factsCache.set(noc, { at: Date.now(), facts }) }).catch(() => { /* 下次再试 */ })
    }
    return Response.json({ facts: fHit.facts })
  }
  const facts = await fetchQuizFacts(pool, noc)
  if (facts && factsCache.size < 600) factsCache.set(noc, { at: Date.now(), facts })
  if (!facts) return Response.json({ facts: null }, { status: 200 })   // 该职业当前零在招=正常,不是错误
  return Response.json({ facts })
}
