/**
 * POST /api/companyinfo {name} — 公司信息懒探索(K,2026-07-19 Frank 批「点开没链接 AI 现去查」)。
 * 命中 companies.ai_brief 直接回;缺则 friendChat + web_search 联网调查 → 存 ai_* 四列=永久缓存。
 * 查询/调查逻辑在 lib/companyResearch(#107 与顾问公司初判共享,一家公司全站只查一次)。
 * 红线:出处列表随答案返回(citation 惯例);查不到如实回空;检索官网与 directory 官网分开存;掉线静默 204。
 */
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { friendLlmReady } from '@/lib/friendLlm'
import { companyRow, investigateCompany } from '@/lib/companyResearch'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!friendLlmReady()) return Response.json({ ok: false }, { status: 204 })
  let name = ''
  try { name = String((await req.json())?.name || '').trim() } catch { /* fallthrough */ }
  if (!name || name.length > 200) return Response.json({ ok: false }, { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const row = await companyRow(pool, name)
  if (!row) return new Response('', { status: 204 })
  if (row.cached) return Response.json(row.cached)
  if (!checkLimit([[`coai:${ipOf(req)}`, Number(process.env.COMPANYINFO_IP_DAILY || 30)]])) return new Response('', { status: 204 })
  const out = await investigateCompany(pool, row.id, name)
  if (!out) return new Response('', { status: 204 })
  return Response.json(out)
}
