/**
 * GET /api/occ-competition?noc=63200 — **该职业**在各省的竞争面(2026-08-12 Frank:「还需要加相关职业
 * 各省市的竞争比」)。
 *
 * 🔴 **职业级的「几人抢一个」算不出来,本站不编**:那需要「该职业该省的求职者人数」,没有任何官方源发布它。
 *    这里给的是三个能代表紧俏度的**实数**,各自说清是什么:
 *      · 在招岗数 / 近 30 天新增   —— 本站职位库(每日抓)
 *      · 平均在招天数              —— 岗位挂多久被撤下:越短越抢手,越长越缺人
 *      · 该省名额竞争              —— 省级(临时居民 ÷ 省提名名额,IRCC 开放数据),与职业无关但决定分母
 *    三者不合成一个分数 —— 合成就等于替用户拿主意,而且没有一个官方口径支持那种合成。
 */
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type OccCompetitionRow = {
  province: string
  openJobs: number
  new30d: number | null
  /** 平均在招天数(本站库内该省该职业);null = 样本不足未算 */
  avgDaysOpen: number | null
  /** 该省名额竞争(省级,与职业无关) */
  ratio: number | null
  /** 该省 AIP 指定雇主在招的本职业岗数(2026-08-15 Frank「aip 别四个省放一起了,分开来算」) */
  aipJobs: number
}

const num = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const noc = (req.nextUrl.searchParams.get('noc') || '').trim()
  if (!/^\d{5}$/.test(noc)) return Response.json({ error: 'noc required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
  if (!pool) return Response.json({ noc, rows: [] })

  const [occ, comp, aip] = await Promise.all([
    pool.query(
      `SELECT province, open_jobs, new30d, avg_days_open
         FROM stats_occupation
        WHERE noc = $1 AND province <> 'all' AND COALESCE(open_jobs, 0) > 0
        ORDER BY open_jobs DESC`, [noc],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    pool.query(
      `SELECT province, difficulty FROM stats
        WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`,
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    // AIP 指定雇主在招的本职业岗:走 idx_jobs_noc,口径与列表页 fAip=yes 同一条(COALESCE(aip,false))
    pool.query(
      `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE status = 'open' AND COALESCE(aip, false) = true AND noc = $1 AND province <> ''
        GROUP BY province`, [noc],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
  ])

  const ratioOf: Record<string, number> = {}
  for (const r of comp.rows) {
    let d: { factors?: { key?: string; value?: number }[] } | null = null
    try { d = typeof r.difficulty === 'string' ? JSON.parse(r.difficulty as string) : (r.difficulty as typeof d) } catch { d = null }
    const v = Number(d?.factors?.find((x) => x?.key === 'comp')?.value)
    if (Number.isFinite(v)) ratioOf[String(r.province)] = v
  }

  const aipOf: Record<string, number> = {}
  for (const r of aip.rows) aipOf[String(r.province ?? '')] = num(r.n) ?? 0

  const rows: OccCompetitionRow[] = occ.rows.map((r) => ({
    province: String(r.province ?? ''),
    openJobs: num(r.open_jobs) ?? 0,
    new30d: num(r.new30d),
    avgDaysOpen: num(r.avg_days_open),
    ratio: ratioOf[String(r.province ?? '')] ?? null,
    aipJobs: aipOf[String(r.province ?? '')] ?? 0,
  }))

  return Response.json({ noc, rows })
}
