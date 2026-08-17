/**
 * GET /api/statsfine?prov=ON&broad=服务&mid=餐饮 — 统计下钻 L3(#127 批A):
 * 单省×大类×中类的在招岗按小类计数。小类级不进 stats 表(行数爆炸),现查现算;
 * 只支持计数(在招岗),中位类小类级无预聚合数据,前端在 L2 直达职位板不进本端点。
 */
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import * as SQL from '@/lib/db/sql'   // SQL 文本全在那儿,本文件只管取数与组装

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_PARAM_LEN = 80
const MAX_FINE_ROWS = 60

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const prov = (sp.get('prov') || '').trim()
  const broad = (sp.get('broad') || '').trim()
  const mid = (sp.get('mid') || '').trim()
  if (!prov || !broad || !mid || [prov, broad, mid].some((v) => v.length > MAX_PARAM_LEN)) {
    return new Response('', { status: 400 })
  }
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(
    SQL.fineCounts(MAX_FINE_ROWS),
    [prov, broad, mid])
  return Response.json({ rows })
}
