/**
 * GET /api/city?city=Ottawa&prov=ON[&district=Kanata] — E8-12b 市/区情报(懒查询:弹框打开才拉)。
 * 全部现算自库内既有表,零新抓取零 AI:
 *   jobs 聚合(在招/近 7 日/帖面中位年薪/热门大分类,本站口径)+ dli(PGWP 可申院校)+ designated_employers(AIP)。
 * district 传了 → 另附整套区级统计(在招/近 7 日/中位薪资/热门方向/主要雇主)——「点区看区」(Frank 2026-07-23)。
 * 市级 2,346 城不预计算(懒化透镜:不进筛选/排序的数据不进 ETL)。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { SQL } from '@/lib/db'   // SQL 文本全在那儿,本文件只管取数与组装

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const city = (sp.get('city') || '').trim()
  const prov = (sp.get('prov') || '').toUpperCase()
  const district = (sp.get('district') || '').trim()
  if (!city || city.length > 80 || !/^[A-Z]{2}$/.test(prov)) return Response.json({ ok: false }, { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const open = `COALESCE(j.status,'open') = 'open'`
  const [agg, broads, dli, aip, dist] = await Promise.all([
    pool.query(
      SQL.cityTotals(open), [city, prov]),
    pool.query(
      SQL.cityByBroad(open), [city, prov]),
    pool.query(
      SQL.CITY_DLI, [city, prov]),
    pool.query(
      SQL.CITY_DESIGNATED_COUNT, [city, prov]),
    district
      ? pool.query(
        SQL.districtTotals(open), [city, prov, district])
      : Promise.resolve(null),
  ])
  const [dliCount, distBroads, distEmployers] = await Promise.all([
    pool.query(SQL.CITY_DLI_COUNT, [city, prov]),
    district
      ? pool.query(
        SQL.districtByBroad(open), [city, prov, district])
      : Promise.resolve(null),
    district
      ? pool.query(
        SQL.districtEmployers(open), [city, prov, district])
      : Promise.resolve(null),
  ])
  const a = agg.rows[0] || {}
  const da = dist?.rows[0]
  return Response.json({
    ok: true,
    openJobs: a.open_jobs ?? 0,
    new7d: a.new7d ?? 0,
    medSalary: a.med_salary != null ? Math.round(Number(a.med_salary)) : null,
    topBroads: broads.rows.map((r: any) => ({ broad: r.broad, n: r.n })),
    dli: { count: dliCount.rows[0]?.n ?? 0, top: dli.rows.map((r: any) => ({ name: r.name, isPublic: !!r.is_public })) },
    aipEmployers: aip.rows[0]?.n ?? 0,
    district: da ? {
      openJobs: da.open_jobs ?? 0,
      new7d: da.new7d ?? 0,
      medSalary: da.med_salary != null ? Math.round(Number(da.med_salary)) : null,
      topBroads: (distBroads?.rows || []).map((r: any) => ({ broad: r.broad, n: r.n })),
      topEmployers: (distEmployers?.rows || []).map((r: any) => ({ name: r.name, slug: r.slug || '', n: r.n })),
    } : null,
  })
}
