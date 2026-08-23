/**
 * GET /api/jobs/competition?noc=63200 — **该职业**在各省的竞争面(2026-08-12 Frank:「还需要加相关职业
 * 各省市的竞争比」)。
 *
 * 🔴 **职业级的「几人抢一个」算不出来,本站不编**:那需要「该职业该省的求职者人数」,没有任何官方源发布它。
 *    这里给的是三个能代表紧俏度的**实数**,各自说清是什么:
 *      · 在招岗数 / 近 30 天新增   —— 本站职位库(每日抓)
 *      · 平均在招天数              —— 岗位挂多久被撤下:越短越抢手,越长越缺人
 *      · 该省名额竞争              —— 省级(临时居民 ÷ 省提名名额,IRCC 开放数据),与职业无关但决定分母
 *    三者不合成一个分数 —— 合成就等于替用户拿主意,而且没有一个官方口径支持那种合成。
 *
 * 2026-08-22 收拢:取数与组装并进 lib/jobs 的 `fetchOccCompetition`(与 profile-pathways 的
 * 服务端排序同一份,口径不许分叉)。本路由原先残留的单 noc 版还在读 stats_occupation 日快照,
 * 与 2026-08-16 Frank「在招是显示多少就查多少」的实时口径已经岔开 —— 随收拢一并对齐实时口径。
 */
import { NextRequest } from 'next/server'

import { getDb } from '@/lib/db/server'
import { fetchOccCompetition } from '@/lib/jobs/server'
export type { OccCompetitionRow } from '@/lib/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const noc = (req.nextUrl.searchParams.get('noc') || '').trim()
  if (!/^\d{5}$/.test(noc)) return Response.json({ error: 'noc required' }, { status: 400 })
  const rows = await fetchOccCompetition({ db: await getDb(), nocs: [noc] })
  return Response.json({ noc, rows })
}
