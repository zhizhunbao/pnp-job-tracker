// GET /api/rankings-data?slug= —— 榜单数据 JSON(E8-02 弹窗化:/jobs 站内榜单弹窗按需拉;
// 页面版 /rankings/[slug] 保留给 SEO/直链,两边走 lib/rankings.ts 同一查询)。公开只读,零计算。
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchRankingRows, RANKING_SLUGS } from '@/lib/rankings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || ''
  if (!RANKING_SLUGS.has(slug)) return new Response('', { status: 400 })
  const payload = await getPayload({ config: await config })
  const items = await fetchRankingRows((payload.db as any).pool, slug)
  return Response.json({ items })
}
