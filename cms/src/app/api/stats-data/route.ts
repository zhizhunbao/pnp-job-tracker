// GET /api/stats-data —— 地区统计全量行 + 用户分层态(E8-02 弹窗化:/jobs 统计弹窗一次拉全,
// 省/大类/对比各级在弹窗内 state 导航;/stats/* 页面保留给 SEO/直链,同一查询层 stats/lib.ts)。
// isPro/myNocs 给「跨省对比」段用(与 /stats/compare 页同一分层语义:gate 展示层,Pro 数据行本就全量公开聚合)。
import { headers } from 'next/headers'

import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile } from '@/lib/match'
import { loadStats, loadStatSources } from '@/app/(frontend)/stats/lib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getUser(await headers())
  const profile = normalizeProfile((user as any)?.profile)
  const [rows, srcs] = await Promise.all([loadStats(), loadStatSources()])
  return Response.json({ rows, srcs, isPro: isPro(user), loggedIn: !!user, myNocs: profile.nocCodes })
}
