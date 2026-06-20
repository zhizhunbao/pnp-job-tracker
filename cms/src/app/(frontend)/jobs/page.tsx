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
    sort: '-createdAt',
  })

  const jobs: JobRow[] = docs.map((j: any) => ({
    id: j.id,
    title: j.title ?? '',
    company: j.company && typeof j.company === 'object' ? j.company.name : (j.company ?? ''),
    source: j.source ?? '',
    province: j.province ?? '',
    city: j.city ?? '',
    noc: j.noc ?? '',
    score: typeof j.score === 'number' ? j.score : null,
    applyUrl: j.applyUrl ?? '',
    datePosted: j.datePosted ?? '',
  }))

  return <JobsTable jobs={jobs} />
}
