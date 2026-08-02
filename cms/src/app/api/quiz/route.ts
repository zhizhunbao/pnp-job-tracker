/**
 * GET /api/quiz — 入口三问的两个只读端点(付费漏斗重设计-20260726)。
 *   ?q=厨师          → 第 2 题的职业搜索(NOC 候选 ≤8)
 *   ?noc=63200       → 答完三题的**免费结果**(该职业在招/可提名/命中清单/按省分布/中位薪资)
 * 匿名可用(结果本就免费,注册闸在结果之后);SQL 一律在 lib/jobsSql,本文件只做参数与形状。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchKinNocs, fetchNocOpenCounts, fetchQuizFacts, fetchTopNocs, searchNocByTitle } from '@/lib/jobsSql'

// 热门职业清单的进程内缓存(键=limit);Render 单实例,重启即失效,不需要额外依赖
const topCache = new Map<number, { at: number; rows: unknown[] }>()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const q = (sp.get('q') || '').slice(0, 40)
  const noc = (sp.get('noc') || '').trim()
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool

  if (q) return Response.json({ candidates: await searchNocByTitle(pool, q) })
  // ?top=N → 按在招量排的热门职业(清单本身不手写)。进程内缓存 10 分钟:
  // 这条要对 4 万多在招岗做 GROUP BY,实测 3.6s;选职业控件每次打开都等它是不可接受的,
  // 而它一天也变不了几次(同 /api/market-stats、homeCache 的手法)。
  if (sp.get('top')) {
    const n = Number(sp.get('top')) || 24
    const hit = topCache.get(n)
    if (hit && Date.now() - hit.at < 10 * 60_000) return Response.json({ top: hit.rows })
    const rows = await fetchTopNocs(pool, n)
    topCache.set(n, { at: Date.now(), rows })
    return Response.json({ top: rows })
  }
  // ?kin=21232 → 同族职业(NOC 前 4 位相同)。**不拿前端已有的热门 200 条筛** ——
  // 那 200 条只覆盖 41% 的职业,冷门职业的同族根本不在里面,靠它筛会**静默失效**(看着像「没有同族」)。
  const kin = (sp.get('kin') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3)
  if (kin.length) return Response.json({ kin: await fetchKinNocs(pool, kin) })
  // ?counts=21232,63200 → 这些 NOC 的在招/可提名数(第 2 题热门职业按钮挂真数)
  const counts = (sp.get('counts') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30)
  if (counts.length) return Response.json({ counts: await fetchNocOpenCounts(pool, counts) })
  if (!noc) return Response.json({ error: 'noc or q required' }, { status: 400 })

  const facts = await fetchQuizFacts(pool, noc)
  if (!facts) return Response.json({ facts: null }, { status: 200 })   // 该职业当前零在招=正常,不是错误
  return Response.json({ facts })
}
