// /jobs 前端筛选 state(json 原样)→ SQL where,两个消费方两种模式(E5-03/E7-04):
//   'alert'(默认,alerts run 用):诚实解释——只翻译能映射到列的键,翻不动的(vs 中位档、
//     directOnly 的中介判定等)忽略并在 skipped 里报出,宁可多发不漏发。
//   'full'(/api/jobs 与 /jobs SSR 用):全键翻译,语义与 JobsTable 客户端谓词逐条对齐
//     (对照表见 docs/implementation/E7-运维与增长/04_jobs列表服务端分页.md)。
// 注意:列名是 Payload snake_case(老坑 5):改 Jobs schema 记得同步这里与 lib/jobsList.ts。

const PROV_CODE: Record<string, string> = {
  'Ontario': 'ON', 'British Columbia': 'BC', 'Alberta': 'AB', 'Quebec': 'QC', 'Manitoba': 'MB',
  'Saskatchewan': 'SK', 'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
  'Prince Edward Island': 'PE',
}
// 省码→全称(与前端 parseLoc/PROV_NAMES 一致;q 宽搜索、省名排序、searchParams 解析用)
export const PROV_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(PROV_CODE).map(([name, code]) => [code, name]),
)

// 省码→全称的 SQL 版(排序/宽搜索里与前端显示序一致)
export const PROV_NAME_SQL = `(CASE j.province ${Object.entries(PROV_NAME)
  .map(([code, name]) => `WHEN '${code}' THEN '${name}'`)
  .join(' ')} ELSE j.province END)`

// 经验档显示标签(与前端 accLabel 一致;q 宽搜索用)
const ACC_LABEL_SQL = `(CASE j.accessibility WHEN 'co-op' THEN 'co-op' WHEN 'junior' THEN '初级' WHEN 'intermediate' THEN '中级' WHEN 'senior' THEN '高级' ELSE '—' END)`

// q 宽搜索特征串:字段清单与 JobsTable.searchHay 一致(职位/公司/来源/NOC/薪资/分类/省市区/地址/经验/评分/TEER)
const HAY_SQL = `concat_ws(' ', j.title, c.name, j.source_label, j.source, j.noc, j.salary,
  j.broad, j.mid, j.fine, ${PROV_NAME_SQL}, j.city, j.district, j.address,
  ${ACC_LABEL_SQL}, j.accessibility, j.score::text, 'TEER ' || j.teer)`

// 直接雇主(与前端 isDirect 一致):Job Bank 渠道仅雇主直发算第一方,其余聚合转贴
export const DIRECT_SQL = `NOT (j.apply_url ~* 'jobbank\\.gc\\.ca' AND j.source <> 'Job Bank')`

export type JobsWhere = { sql: string; params: unknown[]; skipped: string[] }
export type JobsWhereOpts = { mode?: 'alert' | 'full'; pro?: boolean }

export function buildJobsWhere(filters: Record<string, unknown>, startIndex = 1, opts: JobsWhereOpts = {}): JobsWhere {
  const full = opts.mode === 'full'
  const conds: string[] = []
  const params: unknown[] = []
  const skipped: string[] = []
  const p = () => `$${startIndex + params.length}`
  const s = (k: string) => (typeof filters[k] === 'string' ? (filters[k] as string).trim() : '')

  if (s('q')) {
    // full=宽搜索(与前端 searchHay 全字段一致);alert=窄(职位/公司),提醒语义历来如此
    if (full) { conds.push(`${HAY_SQL} ILIKE ${p()}`); params.push(`%${s('q')}%`) }
    else { conds.push(`(j.title ILIKE ${p()} OR c.name ILIKE ${p()})`); const like = `%${s('q')}%`; params.push(like, like) }
  }
  if (s('fProv')) { conds.push(`j.province = ${p()}`); params.push(PROV_CODE[s('fProv')] || s('fProv')) }
  if (s('fCity')) { conds.push(`j.city = ${p()}`); params.push(s('fCity')) }
  if (s('fDistrict')) { conds.push(`j.district = ${p()}`); params.push(s('fDistrict')) }
  // 大中小类:full 模式下 NULL 行前端显示为「未分类」参与相等比较 → COALESCE 对齐
  for (const [k, col] of [['fBroad', 'j.broad'], ['fMid', 'j.mid'], ['fFine', 'j.fine']] as const) {
    if (s(k)) { conds.push(`${full ? `COALESCE(${col},'未分类')` : col} = ${p()}`); params.push(s(k)) }
  }
  if (s('fTeer')) {
    // 前端值形如 'TEER 3' / '未分类'(修复:此前 Number('TEER 3')=NaN,保存筛选带 TEER 永不命中)
    const v = s('fTeer')
    const m = v.match(/\d/)
    if (v === '未分类') conds.push(`j.teer IS NULL`)
    else if (m) { conds.push(`j.teer = ${p()}`); params.push(Number(m[0])) }
    else skipped.push('fTeer')
  }
  if (s('fAcc')) { conds.push(`j.accessibility = ${p()}`); params.push(s('fAcc')) }
  if (s('fOrigin')) { conds.push(`j.origin = ${p()}`); params.push(s('fOrigin')) }
  if (s('fPnp') === 'yes') conds.push(`j.pnp_eligible = true`)
  // 前端「不符合」额外排除魁省(QC 独立体系显示 N/A);alert 模式保持宽(多发不漏发)
  if (s('fPnp') === 'no') conds.push(full ? `(j.pnp_eligible = false AND j.province <> 'QC')` : `j.pnp_eligible = false`)
  if (s('fAip') === 'yes') conds.push(`j.aip = true`)
  if (s('fAip') === 'no') conds.push(`j.aip = false`)
  if (s('fScore') === 'high') conds.push(`j.score >= 75`)
  if (s('fScore') === 'mid') conds.push(`j.score >= 50 AND j.score < 75`)
  if (s('fScore') === 'low') conds.push(`j.score < 50`)
  if (s('fSal') === 'ge100') conds.push(`j.salary_annual >= 100000`)
  if (s('fSal') === '80') conds.push(`j.salary_annual >= 80000 AND j.salary_annual < 100000`)
  if (s('fSal') === '60') conds.push(`j.salary_annual >= 60000 AND j.salary_annual < 80000`)
  if (s('fSal') === 'u60') conds.push(`j.salary_annual < 60000`)

  if (full) {
    if (filters['directOnly']) conds.push(DIRECT_SQL)
    if (s('fSource')) { conds.push(`COALESCE(NULLIF(j.source_label,''),'—') = ${p()}`); params.push(s('fSource')) }
    if (s('fStatus')) { conds.push(`COALESCE(NULLIF(j.status,''),'open') = ${p()}`); params.push(s('fStatus')) }
    if (s('fCountry')) {
      // 前端语义:country || (有省 → 'Canada')
      if (s('fCountry') === 'Canada') conds.push(`(j.country = 'Canada' OR (COALESCE(j.country,'') = '' AND COALESCE(j.province,'') <> ''))`)
      else { conds.push(`j.country = ${p()}`); params.push(s('fCountry')) }
    }
    if (s('fVs')) {
      // vs 中位:Pro 数据维度(免费用户 wage 列已剥离,前端该筛选恒空)→ 非 Pro 保持空结果
      if (!opts.pro) conds.push(`FALSE`)
      else if (s('fVs') === 'above') conds.push(`j.wage_med_annual > 0 AND j.salary_annual >= j.wage_med_annual`)
      else if (s('fVs') === 'above20') conds.push(`j.wage_med_annual > 0 AND j.salary_annual >= 1.2 * j.wage_med_annual`)
      else if (s('fVs') === 'below') conds.push(`j.wage_med_annual > 0 AND j.salary_annual < j.wage_med_annual`)
    }
  } else {
    for (const k of ['fVs', 'directOnly', 'fSource', 'fStatus', 'fCountry']) {
      if (filters[k]) skipped.push(k)  // alert 模式翻不动/不适合提醒语义的键:忽略并报出
    }
  }
  return { sql: conds.length ? conds.join(' AND ') : 'TRUE', params, skipped }
}
