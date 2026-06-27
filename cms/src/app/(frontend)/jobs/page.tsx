import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import JobsTable, { type JobRow } from './JobsTable'
import { COLS_COOKIE } from './i18n'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const payload = await getPayload({ config: await config })
  // 列表读取走原始 SQL:payload.find 会把每个 doc 过一遍读取管线(access/hooks),2000+ 行要十几秒。
  // 公开只读列表直接 select + join 公司名,<0.5s。(列名是 Payload 的 snake_case;schema 改了要同步)
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(`
    SELECT j.id, j.title, c.name AS company_name, c.address AS company_address,
      j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip,
      j.country, j.province, j.city, j.district, j.address, j.region,
      j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
      j.wage_med_hourly, j.wage_med_annual,
      j.source, j.source_label, j.origin, j.date_posted, j.last_seen, j.status, j.closed_at
    FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
    ORDER BY j.date_posted DESC NULLS LAST LIMIT 20000`)

  // 维度表小,继续走 payload.find
  const [provDocs, cityDocs, distDocs, nocDocs, srcDocs, expDocs, pnpDocs, eeDocs] = await Promise.all([
    payload.find({ collection: 'provinces', limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 1000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'noc-categories', limit: 1000, depth: 0 }),
    payload.find({ collection: 'sources', limit: 200, depth: 0, sort: 'name' }),
    payload.find({ collection: 'experience-levels', limit: 50, depth: 0 }),
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
  ])
  const dims = {
    provinces: provDocs.docs.map((p: any) => ({ code: p.code, name: p.name })),
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
    nocCategories: nocDocs.docs.map((c: any) => ({ broad: c.broad, mid: c.mid, fine: c.fine, teer: typeof c.teer === 'number' ? c.teer : null })),
    sources: srcDocs.docs.map((s: any) => ({ name: s.name })),
    experienceLevels: expDocs.docs.map((e: any) => ({ name: e.name })),
    pnpOccupations: pnpDocs.docs.map((r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })),
    eeCategories: eeDocs.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched })),
  }

  const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
  const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字
  const jobs: JobRow[] = rows.map((j: any) => ({
    id: j.id,
    title: j.title ?? '',
    company: j.company_name ?? '',
    address: j.address ?? j.company_address ?? '',
    source: j.source ?? '',
    sourceLabel: j.source_label ?? '',
    origin: j.origin ?? '',
    country: j.country ?? '',
    province: j.province ?? '',
    city: j.city ?? '',
    district: j.district ?? '',
    noc: j.noc ?? '',
    category: j.category ?? '',
    teer: num(j.teer),
    broad: j.broad ?? '未分类',
    mid: j.mid ?? '未分类',
    fine: j.fine ?? '未分类',
    accessibility: j.accessibility ?? '',
    score: num(j.score),
    pnpEligible: !!j.pnp_eligible,
    pnpStream: j.pnp_stream ?? '',
    eeCategory: j.ee_category ?? '',
    aip: !!j.aip,
    salary: j.salary ?? '',
    salaryAnnual: num(j.salary_annual),
    salaryText: j.salary_text ?? '',
    wageMedHourly: num(j.wage_med_hourly),
    wageMedAnnual: num(j.wage_med_annual),
    officialUrl: j.official_url ?? '',
    applyUrl: j.apply_url ?? '',
    datePosted: iso(j.date_posted),
    lastSeen: iso(j.last_seen),
    status: j.status ?? 'open',
    closedAt: iso(j.closed_at),
  }))

  const updatedAt = rows.reduce((m: string, j: any) => { const ls = iso(j.last_seen); return ls > m ? ls : m }, '')

  // 列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,零闪烁。客户端选列时写这个 cookie。
  let initialCols: string[] | undefined
  try {
    const raw = (await cookies()).get(COLS_COOKIE)?.value
    if (raw) { const arr = JSON.parse(decodeURIComponent(raw)); if (Array.isArray(arr)) initialCols = arr.filter((x) => typeof x === 'string') }
  } catch { /* 无 cookie/解析失败 → 用默认列 */ }

  return <JobsTable jobs={jobs} updatedAt={updatedAt} dims={dims} initialCols={initialCols} />
}
