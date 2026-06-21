/**
 * One-time seed/refresh: GET /seed   (add ?reset=1 to wipe & rebuild)
 * Runs inside the dev server (getPayload works here), reads scraped Ottawa ATS jobs
 * from ../data, applies scores (08_score.py output), de-dups, stamps lastSeen.
 * Temporary — superseded later by the ETL REST loader (etl/09_load.py).
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REGION = 'ottawa-kanata-north'
const SKIP_SLUGS = new Set(['cmc-microsystems']) // token 抓错(huaweicanada/Markham),整源跳过
const guessProv = (loc: string) => (/\b(on|ontario)\b/i.test(loc) ? 'ON' : '')
const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')

export async function GET(req: Request) {
  const payload = await getPayload({ config: await config })
  const reset = new URL(req.url).searchParams.get('reset')
  if (reset) {
    await payload.delete({ collection: 'jobs', where: { externalId: { exists: true } } })
    await payload.delete({ collection: 'companies', where: { slug: { exists: true } } })
  }

  const REGION_DIR = path.resolve(process.cwd(), '..', 'data', 'companies', REGION)
  if (!fs.existsSync(REGION_DIR)) {
    return Response.json({ error: 'no data dir', REGION_DIR }, { status: 500 })
  }

  const scoredPath = path.resolve(process.cwd(), '..', 'data', 'output', `${REGION}-scored.json`)
  const scored: Record<string, { noc?: string; score?: number; accessibility?: string }> = {}
  if (fs.existsSync(scoredPath)) {
    for (const s of JSON.parse(fs.readFileSync(scoredPath, 'utf8'))) scored[s.externalId] = s
  }

  const now = new Date().toISOString()
  const seenTitles = new Set<string>() // company-slug|normTitle → 近似去重
  let companies = 0
  let jobs = 0
  let updated = 0
  let skipped = 0

  for (const slug of fs.readdirSync(REGION_DIR).filter((f) => fs.statSync(path.join(REGION_DIR, f)).isDirectory())) {
    if (SKIP_SLUGS.has(slug)) continue
    const dir = path.join(REGION_DIR, slug)
    const jobsPath = path.join(dir, 'jobs.json')
    const profilePath = path.join(dir, 'profile.json')
    if (!fs.existsSync(jobsPath) || !fs.existsSync(profilePath)) continue

    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
    const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf8'))
    if (!jobsData.jobs?.length) continue

    const existing = await payload.find({ collection: 'companies', where: { slug: { equals: slug } }, limit: 1 })
    let companyId = existing.docs[0]?.id
    if (!companyId) {
      const c = await payload.create({
        collection: 'companies',
        data: {
          name: profile.name, slug,
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
      const dupKey = `${slug}|${normTitle(j.title || '')}`
      if (seenTitles.has(dupKey)) { skipped++; continue }
      seenTitles.add(dupKey)

      const externalId = j.url || dupKey
      const sc = scored[externalId] || {}
      const data: any = {
        title: j.title, company: companyId, source,
        city: j.location || '', province: guessProv(j.location || ''),
        region: REGION, applyUrl: j.url || '', officialUrl: profile.website || '',
        externalId, status: 'open', lastSeen: now,
        noc: sc.noc || undefined, score: sc.score, accessibility: (sc.accessibility as any) || undefined,
      }
      const dup = await payload.find({ collection: 'jobs', where: { externalId: { equals: externalId } }, limit: 1 })
      if (dup.docs.length) {
        await payload.update({ collection: 'jobs', id: dup.docs[0].id, data })
        updated++
      } else {
        data.firstSeen = now
        await payload.create({ collection: 'jobs', data })
        jobs++
      }
    }
  }
  return Response.json({ ok: true, reset: !!reset, companies, created: jobs, updated, deduped: skipped, updatedAt: now })
}
