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
      // 韩文职业名从 noc_descriptions 借(485/489 有值);stats_occupation 不另存一列 —— 名字的家在那张表。
      // 英文用 title_en(NOC 官方名,引用依据);中文用 title_zh_short(本站 04f/04g 译名)。
      `SELECT s.noc, s.province, s.title_zh, s.title_zh_short, s.title_en, d.title_ko, s.teer, s.broad, s.mid, s.fine,
              s.open_jobs, s.new7d, s.median_wage_annual, s.wage_low_annual, s.wage_high_annual, s.median_salary_annual, s.salary_n, s.named_jobs
       FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc
       ORDER BY s.open_jobs DESC NULLS LAST`)).rows
    return rows.map((r: any) => ({
      noc: r.noc ?? '', province: r.province ?? '', titleZh: r.title_zh ?? '',
      titleZhShort: r.title_zh_short ?? '', titleEn: r.title_en ?? '', titleKo: r.title_ko ?? '',
      teer: num(r.teer), broad: r.broad ?? '', mid: r.mid ?? '', fine: r.fine ?? '',
      openJobs: num(r.open_jobs), new7d: num(r.new7d),
      medianWageAnnual: num(r.median_wage_annual),
      wageLowAnnual: num(r.wage_low_annual), wageHighAnnual: num(r.wage_high_annual),
      medianSalaryAnnual: num(r.median_salary_annual),
      salaryN: num(r.salary_n), namedJobs: num(r.named_jobs),
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
      // 城市译名同样借 cities 维度表(48 个主要城市有中/韩名,小镇留空 → 前端回退英文原名)
      `SELECT s.city, s.province, c.name_zh, c.name_ko, s.open_jobs, s.new7d, s.median_wage_annual, s.median_salary_annual, s.salary_n, s.named_jobs
       FROM stats_city s LEFT JOIN cities c ON c.name = s.city AND c.province = s.province
       ORDER BY s.open_jobs DESC NULLS LAST LIMIT $1`, [limit])).rows
    return rows.map((r: any) => ({
      city: r.city ?? '', cityZh: r.name_zh ?? '', cityKo: r.name_ko ?? '',
      province: r.province ?? '', openJobs: num(r.open_jobs), new7d: num(r.new7d),
      medianWageAnnual: num(r.median_wage_annual), medianSalaryAnnual: num(r.median_salary_annual),
      salaryN: num(r.salary_n), namedJobs: num(r.named_jobs),
    }))
  } catch (e: any) {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e
    return []
  }
}

// E8-14 ⑥ 通道筛选(Frank 2026-07-28:「哪些能走 ee pnp aip qc 的单独通道也需要筛选」):
// 只取**职业粒度能判定**的两条 —— 省提名具名清单(pnp_occupations)与联邦 EE 类别(ee_categories)。
// AIP 只有雇主级名单(职业粒度要先给统计表补列),QC 数据层没有职业清单 —— 两者不在此列,不假装能筛。
export async function loadChannelNocs(): Promise<{ pnp: string[]; ee: string[] }> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const one = async (sql: string) => {
    try { return (await pool.query(sql)).rows.map((r: any) => String(r.noc || '')).filter(Boolean) }
    catch (e: any) { if (e?.code === '42P01' || e?.code === '42703') return []; throw e }
  }
  const [pnp, ee] = await Promise.all([
    one(`SELECT DISTINCT noc FROM pnp_occupations WHERE noc <> '' AND COALESCE(program,'PNP') = 'PNP'`),
    one(`SELECT DISTINCT noc FROM ee_categories WHERE noc <> ''`),
  ])
  return { pnp, ee }
}
