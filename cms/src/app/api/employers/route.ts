/**
 * GET /api/employers — 雇主板懒取端点(2026-08-16,雇主页照职位板重做那批)。
 * #313 同款拆法:名录 6,680 行**不进 SSR/RSC payload** —— SSR 只带第一页 + total,
 * 换筛选/翻页由前端打本端点。筛选/分页口径全在 lib/designatedEmployers 的纯函数里(单一来源,不 fork)。
 *
 * 参数:mode=designated|hiring · program=AIP|RCIP|FCIP · prov=XX · city=<名录社区原值>
 *      · noc=12345 · q=<雇主名> · page=0.. · pageSize=1..100
 * 🔴 noc 口径:名录**没写职业**的行照常保留(空 = 官方没列清单,不是「不招这个职业」)。
 * 挂了回空表(total 0),前端保底继续用 SSR 那一页,绝不 500。
 */
import { getDb } from '@/lib/db/server'
import { EMP_PAGE_SIZE, loadEmployerPage, normalizeEmployerFilters } from '@/lib/employers/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const f = normalizeEmployerFilters({ get: function get(k: string) { return sp.get(k) }, defMode: 'designated' })
  const sizeRaw = Number(sp.get('pageSize'))
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(Math.floor(sizeRaw), 100) : EMP_PAGE_SIZE
  try {
    const data = await loadEmployerPage({ db: await getDb(), filters: f, pageSize })
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=600' } })
  } catch {
    return Response.json({
      mode: f.mode, rows: [], total: 0, page: f.page, pageSize,
      facets: { provs: [], programs: [], cities: [], nocs: [] }, fetched: '', nocTitles: {},
    })
  }
}
