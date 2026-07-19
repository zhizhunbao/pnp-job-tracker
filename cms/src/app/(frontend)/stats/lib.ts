// 地区统计服务端共用(E5-04):SELECT stats/field-sources → 行(零计算,页面只渲染)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { StatRow, SrcRow } from './shared'

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
              named_jobs, stream_labels, aip_jobs, top_cities, fetched
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
  }))
}

// citation 来源(复用 E4-04 field-sources 维度):岗量=Job Bank、薪资=ESDC、通道=省清单
export async function loadStatSources(): Promise<SrcRow[]> {
  const payload = await getPayload({ config: await config })
  const res = await payload.find({ collection: 'field-sources', where: { field: { in: ['title', 'wageMedYr', 'pnp'] } }, limit: 10, depth: 0 })
  return res.docs.map((r: any) => ({ field: r.field ?? '', publisher: r.publisher ?? '', url: r.url ?? '', fetched: r.fetched ?? '' }))
}
