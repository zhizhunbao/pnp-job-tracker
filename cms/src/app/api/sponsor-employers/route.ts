/**
 * GET /api/sponsor-employers — 把脉页(/start)橱窗三分表(lmia/named/aip)全量。
 * #313(LCP 7.15s 真因):三表 16,430 行全量序列化进 /start 的 RSC payload,SSR 文档 6.92MB ——
 * 拆法照 /api/market-stats 拆 occ 大表的先例:SSR 只带每表前 SE_SSR_ROWS 行 + total,
 * 全量改挂载后后台拉本端点;「全量可翻页/可筛选」的 Frank 08-08 拍板不动,只换运输方式。
 * 行数据与三表构建都走 lib/sponsorEmployers 的单一来源(fetchSponsorEmployers 自带 10 分钟
 * 进程缓存 + in-flight 去重,聚合不站在请求路径上排队);浏览器侧再叠 5 分钟 + SWR。
 * 挂了回三张空表(total 0),前端保底继续用 SSR 的 50 行,绝不 500。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { buildSponsorBoards, fetchSponsorEmployers, type SponsorBoards } from '@/lib/sponsorEmployers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cache: { v: SponsorBoards; ts: number } | null = null
const TTL = 10 * 60_000

export async function GET() {
  if (!cache || Date.now() - cache.ts >= TTL) {
    try {
      const payload = await getPayload({ config: await config })
      const rows = await fetchSponsorEmployers((payload.db as any).pool)
      cache = { v: buildSponsorBoards(rows), ts: Date.now() }
    } catch {
      const empty = { top: [], total: 0 }
      return Response.json({ lmia: empty, named: empty, aip: empty })
    }
  }
  return Response.json(cache.v, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } })
}
