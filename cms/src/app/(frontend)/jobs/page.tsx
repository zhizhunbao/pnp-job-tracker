import { getPayload } from 'payload'

import config from '@/payload.config'
import JobsTable, { type JobRow } from './JobsTable'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'jobs',
    depth: 1,
    limit: 2000,
    sort: '-datePosted',
  })

  // 联动筛选的选项来源:维度表(provinces/cities/districts),不再从 job 行现推
  const [provDocs, cityDocs, distDocs] = await Promise.all([
    payload.find({ collection: 'provinces', limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 1000, depth: 0, sort: 'name' }),
  ])
  const dims = {
    provinces: provDocs.docs.map((p: any) => ({ code: p.code, name: p.name })),
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
  }

  const jobs: JobRow[] = docs.map((j: any) => ({
    id: j.id,
    title: j.title ?? '',
    company: j.company && typeof j.company === 'object' ? j.company.name : (j.company ?? ''),
    address: j.address ?? (j.company && typeof j.company === 'object' ? (j.company.address ?? '') : ''),
    source: j.source ?? '',
    origin: j.origin ?? '',
    country: j.country ?? '',
    province: j.province ?? '',
    city: j.city ?? '',
    district: j.district ?? '',
    noc: j.noc ?? '',
    category: j.category ?? '',
    accessibility: j.accessibility ?? '',
    score: typeof j.score === 'number' ? j.score : null,
    pnpEligible: !!j.pnpEligible,
    aip: !!j.aip,
    salary: j.salary ?? '',
    salaryAnnual: typeof j.salaryAnnual === 'number' ? j.salaryAnnual : null,
    salaryText: j.salaryText ?? '',
    officialUrl: j.officialUrl ?? '',
    applyUrl: j.applyUrl ?? '',
    datePosted: j.datePosted ?? '',
    lastSeen: j.lastSeen ?? '',
    status: j.status ?? 'open',
    closedAt: j.closedAt ?? '',
  }))

  const updatedAt = docs.reduce((m: string, j: any) => (j.lastSeen && j.lastSeen > m ? j.lastSeen : m), '')

  return <JobsTable jobs={jobs} updatedAt={updatedAt} dims={dims} />
}
