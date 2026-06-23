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

  return <JobsTable jobs={jobs} updatedAt={updatedAt} />
}
