// 地区统计服务端共用(E5-04):SELECT stats/field-sources → 行(零计算,页面只渲染)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { StatRow, SrcRow } from './shared'

export async function loadStats(where = '', params: any[] = []): Promise<StatRow[]> {
  const payload = await getPayload({ config: await config })
  const num = (v: any) => (v == null ? null : Number(v))
  const { rows } = await (payload.db as any).pool.query(
    `SELECT province, broad, open_jobs, new7d, median_wage_annual, median_salary_annual,
            named_jobs, stream_labels, aip_jobs, top_cities, fetched
     FROM stats ${where} ORDER BY open_jobs DESC NULLS LAST`, params)
  return rows.map((r: any) => ({
    province: r.province ?? '', broad: r.broad ?? '',
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
