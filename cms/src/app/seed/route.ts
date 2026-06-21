/**
 * One-time seed endpoint: GET /seed
 * Runs inside the dev server (where getPayload works), reads already-scraped
 * Ottawa ATS jobs from ../data and upserts companies + jobs into Payload.
 * Temporary — superseded later by the ETL REST loader (etl/09_load.py).
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REGION = 'ottawa-kanata-north'
const guessProv = (loc: string) => (/\b(on|ontario)\b/i.test(loc) ? 'ON' : '')

export async function GET() {
  const payload = await getPayload({ config: await config })
  const REGION_DIR = path.resolve(process.cwd(), '..', 'data', 'companies', REGION)
  if (!fs.existsSync(REGION_DIR)) {
    return Response.json({ error: 'no data dir', REGION_DIR }, { status: 500 })
  }

  // 评分(08_score.py 产出),按 externalId 关联
  const scoredPath = path.resolve(process.cwd(), '..', 'data', 'output', `${REGION}-scored.json`)
  const scored: Record<string, { noc?: string; score?: number; accessibility?: string }> = {}
  if (fs.existsSync(scoredPath)) {
    for (const s of JSON.parse(fs.readFileSync(scoredPath, 'utf8'))) scored[s.externalId] = s
  }

  const folders = fs
    .readdirSync(REGION_DIR)
    .filter((f) => fs.statSync(path.join(REGION_DIR, f)).isDirectory())

  let companies = 0
  let jobs = 0
  let updated = 0
  for (const slug of folders) {
    const dir = path.join(REGION_DIR, slug)
    const jobsPath = path.join(dir, 'jobs.json')
    const profilePath = path.join(dir, 'profile.json')
    if (!fs.existsSync(jobsPath) || !fs.existsSync(profilePath)) continue

    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
    const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf8'))
    if (!jobsData.jobs?.length) continue

    const existing = await payload.find({
      collection: 'companies',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    let companyId = existing.docs[0]?.id
    if (!companyId) {
      const c = await payload.create({
        collection: 'companies',
        data: {
          name: profile.name,
          slug,
          website: profile.website || undefined,
          email: profile.email || undefined,
          region: profile.region || REGION,
          sectors: profile.sectors || undefined,
        },
      })
      companyId = c.id
      companies++
    }

    const source = jobsData.ats || 'ats'
    for (const j of jobsData.jobs) {
      const externalId = j.url || `${slug}:${j.title}`
      const sc = scored[externalId] || {}
      const dup = await payload.find({
        collection: 'jobs',
        where: { externalId: { equals: externalId } },
        limit: 1,
      })
      if (dup.docs.length) {
        await payload.update({
          collection: 'jobs',
          id: dup.docs[0].id,
          data: { noc: sc.noc || undefined, score: sc.score, accessibility: (sc.accessibility as any) || undefined },
        })
        updated++
        continue
      }
      await payload.create({
        collection: 'jobs',
        data: {
          title: j.title,
          company: companyId,
          source,
          city: j.location || '',
          province: guessProv(j.location || ''),
          region: REGION,
          applyUrl: j.url || '',
          officialUrl: profile.website || '',
          externalId,
          status: 'open',
          noc: sc.noc || undefined,
          score: sc.score,
          accessibility: (sc.accessibility as any) || undefined,
        },
      })
      jobs++
    }
  }
  return Response.json({ ok: true, companies, jobs, updated })
}
