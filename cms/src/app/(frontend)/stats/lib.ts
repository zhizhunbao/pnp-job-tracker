// 地区统计服务端共用(E5-04):SELECT stats/field-sources → 行(零计算,页面只渲染)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { StatRow, SrcRow, ProvExtra, ProvVol, OccRow, CityRow } from './shared'

// withMid=true 才带中类行(仅图表下钻用);默认只回大类层——既有页面(省页/对比/表格)口径不变不重复计数。
// 缺列容错(E12-06 教训):mid 列 DDL 未落地时自动降级为无 mid 查询,行回退 mid='all',页面照常。
export async function loadStats(where = '', params: any[] = [], opts?: { withMid?: boolean }): Promise<StatRow[]> {
  const payload = await getPayload({ config: await config })
  const num = (v: any) => (v == null ? null : Number(v))
  const baseCond = opts?.withMid ? '' : `${where ? `${where} AND` : 'WHERE'} (mid = 'all' OR mid IS NULL)`
  let rows: any[]
  try {
    rows = (await (payload.db as any).pool.query(
      `SELECT province, broad, mid, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched, difficulty
       FROM stats ${opts?.withMid ? where : baseCond} ORDER BY open_jobs DESC NULLS LAST`, params)).rows
  } catch (e: any) {
    if (e?.code !== '42703') throw e  // 42703=列不存在 → 降级;其余照抛
    rows = (await (payload.db as any).pool.query(
      `SELECT province, broad, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched
       FROM stats ${where} ORDER BY open_jobs DESC NULLS LAST`, params)).rows
  }
  return rows.map((r: any) => ({
    province: r.province ?? '', broad: r.broad ?? '', mid: r.mid ?? 'all',
    openJobs: num(r.open_jobs), new7d: num(r.new7d),
    medianWageAnnual: num(r.median_wage_annual), medianSalaryAnnual: num(r.median_salary_annual),
    namedJobs: num(r.named_jobs), streamLabels: r.stream_labels ?? '', aipJobs: num(r.aip_jobs),
    topCities: r.top_cities ?? '[]', fetched: r.fetched ?? '',
    difficulty: r.difficulty ?? null,
  }))
}

// 批B(#133):省卡 IRCC 体量+难度 tier——info=provinces.info jsonb(学签/工签/PR,scrape_ircc_stats 产),
// tier=stats.difficulty(broad=all 行)的 tier 字段;两者与 E8-12 省弹框同源,不另造口径
export async function loadProvExtra(): Promise<Record<string, ProvExtra>> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const out: Record<string, ProvExtra> = {}
  for (const r of (await pool.query('SELECT code, info FROM provinces')).rows) {
    let info: ProvVol | null = null
    try { info = typeof r.info === 'string' ? JSON.parse(r.info) : r.info } catch { /* 保留 null */ }
    out[r.code] = { info, tier: null }
  }
  for (const r of (await pool.query(`SELECT province, difficulty FROM stats WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`)).rows) {
    const d = typeof r.difficulty === 'string' ? (() => { try { return JSON.parse(r.difficulty) } catch { return null } })() : r.difficulty
    if (out[r.province]) out[r.province].tier = d?.tier ?? null
    else out[r.province] = { info: null, tier: d?.tier ?? null }
  }
  return out
}

// citation 来源(复用 E4-04 field-sources 维度):岗量=Job Bank、薪资=ESDC、通道=省清单
export async function loadStatSources(): Promise<SrcRow[]> {
  const payload = await getPayload({ config: await config })
  const res = await payload.find({ collection: 'field-sources', where: { field: { in: ['title', 'wageMedYr', 'pnp'] } }, limit: 10, depth: 0 })
  return res.docs.map((r: any) => ({ field: r.field ?? '', publisher: r.publisher ?? '', url: r.url ?? '', fetched: r.fetched ?? '' }))
}

// E8-14 统计主图:职业粒度与城市粒度(mart 算好的表,这里只 SELECT)。
// 缺表容错(同 loadStats 的 42703 先例):DDL 未落地时回空数组,主图整块不渲,页面照常。
export async function loadOccStats(): Promise<OccRow[]> {
  const payload = await getPayload({ config: await config })
  const num = (v: any) => (v == null ? null : Number(v))
  try {
    const rows = (await (payload.db as any).pool.query(
      `SELECT noc, province, title_zh, title_zh_short, title_en, teer, broad,
              open_jobs, new7d, median_salary_annual, named_jobs
       FROM stats_occupation ORDER BY open_jobs DESC NULLS LAST`)).rows
    return rows.map((r: any) => ({
      noc: r.noc ?? '', province: r.province ?? '', titleZh: r.title_zh ?? '',
      titleZhShort: r.title_zh_short ?? '', titleEn: r.title_en ?? '',
      teer: num(r.teer), broad: r.broad ?? '', openJobs: num(r.open_jobs), new7d: num(r.new7d),
      medianSalaryAnnual: num(r.median_salary_annual), namedJobs: num(r.named_jobs),
    }))
  } catch (e: any) {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e
    return []
  }
}

export async function loadCityStats(limit = 400): Promise<CityRow[]> {
  const payload = await getPayload({ config: await config })
  const num = (v: any) => (v == null ? null : Number(v))
  try {
    const rows = (await (payload.db as any).pool.query(
      `SELECT city, province, open_jobs, new7d, median_salary_annual, named_jobs
       FROM stats_city ORDER BY open_jobs DESC NULLS LAST LIMIT $1`, [limit])).rows
    return rows.map((r: any) => ({
      city: r.city ?? '', province: r.province ?? '', openJobs: num(r.open_jobs), new7d: num(r.new7d),
      medianSalaryAnnual: num(r.median_salary_annual), namedJobs: num(r.named_jobs),
    }))
  } catch (e: any) {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e
    return []
  }
}
