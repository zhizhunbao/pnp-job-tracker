/**
 * GET /api/quiz — 入口三问的两个只读端点(付费漏斗重设计-20260726)。
 *   ?q=厨师          → 第 2 题的职业搜索(NOC 候选 ≤8)
 *   ?noc=63200       → 答完三题的**免费结果**(该职业在招/可提名/命中清单/按省分布/中位薪资)
 * 匿名可用(结果本就免费,注册闸在结果之后);SQL 一律在 lib/jobsSql,本文件只做参数与形状。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchNocOpenCounts, fetchQuizFacts, searchNocByTitle } from '@/lib/jobsSql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const q = (sp.get('q') || '').slice(0, 40)
  const noc = (sp.get('noc') || '').trim()
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool

  if (q) return Response.json({ candidates: await searchNocByTitle(pool, q) })
  // ?counts=21232,63200 → 这些 NOC 的在招/可提名数(第 2 题热门职业按钮挂真数)
  const counts = (sp.get('counts') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30)
  if (counts.length) return Response.json({ counts: await fetchNocOpenCounts(pool, counts) })
  if (!noc) return Response.json({ error: 'noc or q required' }, { status: 400 })

  const facts = await fetchQuizFacts(pool, noc)
  if (!facts) return Response.json({ facts: null }, { status: 200 })   // 该职业当前零在招=正常,不是错误
  return Response.json({ facts })
}
