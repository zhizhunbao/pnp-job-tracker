// 保存筛选 → SQL where(E5-03):alerts run 用它解释 /jobs 前端筛选 state(json 原样存)。
// 诚实解释:只翻译能映射到列的键(q/省/市/区/大中小类/TEER/PNP/AIP/渠道/经验/薪资档/评分档),
// 翻不动的(vs 中位档、directOnly 的中介正则)忽略并在 skipped 里报出 —— 宁可多发不漏发。
// ⚠️ 列名是 Payload snake_case(老坑 5):改 Jobs schema 记得同步这里。

const PROV_CODE: Record<string, string> = {
  'Ontario': 'ON', 'British Columbia': 'BC', 'Alberta': 'AB', 'Quebec': 'QC', 'Manitoba': 'MB',
  'Saskatchewan': 'SK', 'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
  'Prince Edward Island': 'PE',
}

export type JobsWhere = { sql: string; params: unknown[]; skipped: string[] }

export function buildJobsWhere(filters: Record<string, unknown>, startIndex = 1): JobsWhere {
  const conds: string[] = []
  const params: unknown[] = []
  const skipped: string[] = []
  const p = () => `$${startIndex + params.length}`
  const s = (k: string) => (typeof filters[k] === 'string' ? (filters[k] as string).trim() : '')

  if (s('q')) { conds.push(`(j.title ILIKE ${p()} OR c.name ILIKE ${p()})`); const like = `%${s('q')}%`; params.push(like, like) }
  if (s('fProv')) { conds.push(`j.province = ${p()}`); params.push(PROV_CODE[s('fProv')] || s('fProv')) }
  if (s('fCity')) { conds.push(`j.city = ${p()}`); params.push(s('fCity')) }
  if (s('fDistrict')) { conds.push(`j.district = ${p()}`); params.push(s('fDistrict')) }
  if (s('fBroad')) { conds.push(`j.broad = ${p()}`); params.push(s('fBroad')) }
  if (s('fMid')) { conds.push(`j.mid = ${p()}`); params.push(s('fMid')) }
  if (s('fFine')) { conds.push(`j.fine = ${p()}`); params.push(s('fFine')) }
  if (s('fTeer')) { conds.push(`j.teer = ${p()}`); params.push(Number(s('fTeer'))) }
  if (s('fAcc')) { conds.push(`j.accessibility = ${p()}`); params.push(s('fAcc')) }
  if (s('fOrigin')) { conds.push(`j.origin = ${p()}`); params.push(s('fOrigin')) }
  if (s('fPnp') === 'yes') conds.push(`j.pnp_eligible = true`)
  if (s('fPnp') === 'no') conds.push(`j.pnp_eligible = false`)
  if (s('fAip') === 'yes') conds.push(`j.aip = true`)
  if (s('fAip') === 'no') conds.push(`j.aip = false`)
  if (s('fScore') === 'high') conds.push(`j.score >= 75`)
  if (s('fScore') === 'mid') conds.push(`j.score >= 50 AND j.score < 75`)
  if (s('fScore') === 'low') conds.push(`j.score < 50`)
  if (s('fSal') === 'ge100') conds.push(`j.salary_annual >= 100000`)
  if (s('fSal') === '80') conds.push(`j.salary_annual >= 80000 AND j.salary_annual < 100000`)
  if (s('fSal') === '60') conds.push(`j.salary_annual >= 60000 AND j.salary_annual < 80000`)
  if (s('fSal') === 'u60') conds.push(`j.salary_annual < 60000`)
  for (const k of ['fVs', 'directOnly', 'fSource', 'fStatus', 'fCountry']) {
    if (filters[k]) skipped.push(k)  // 翻不动/不适合提醒语义的键:忽略并报出
  }
  return { sql: conds.length ? conds.join(' AND ') : 'TRUE', params, skipped }
}
