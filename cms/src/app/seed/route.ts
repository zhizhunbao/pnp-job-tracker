/**
 * Seed/refresh: GET /seed   (add ?reset=1 to wipe & rebuild)
 * Loads ATS company-folder jobs + Job Bank (all-occupation) jobs into Payload,
 * applying per-category scores (08_score.py → all-scored.json). Skips agencies,
 * de-dups, stamps lastSeen. Temporary — to be replaced by etl/09_load.py.
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REGION = 'ottawa-kanata-north'
const SKIP_SLUGS = new Set(['cmc-microsystems'])
const AGENCY = /recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad|source code/i
const guessProv = (loc: string) => (/\b(on|ontario)\b/i.test(loc) ? 'ON' : '')
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'company'
const isoDate = (s?: string) => {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

export async function GET(req: Request) {
  const payload = await getPayload({ config: await config })
  if (new URL(req.url).searchParams.get('reset')) {
    await payload.delete({ collection: 'jobs', where: { externalId: { exists: true } } })
    await payload.delete({ collection: 'companies', where: { slug: { exists: true } } })
  }

  const dataRoot = path.resolve(process.cwd(), '..', 'data')
  const scored: Record<string, any> = {}
  const sp = path.join(dataRoot, 'output', 'all-scored.json')
  if (fs.existsSync(sp)) for (const s of JSON.parse(fs.readFileSync(sp, 'utf8'))) scored[s.externalId] = s

  const now = new Date().toISOString()
  const seen = new Set<string>()
  const companyCache: Record<string, string | number> = {}
  let companies = 0
  let jobs = 0
  let skipped = 0

  const ensureCompany = async (name: string, slug: string, extra: Record<string, unknown> = {}) => {
    if (companyCache[slug]) return companyCache[slug]
    const ex = await payload.find({ collection: 'companies', where: { slug: { equals: slug } }, limit: 1 })
    let id = ex.docs[0]?.id
    if (!id) {
      const c = await payload.create({ collection: 'companies', data: { name, slug, ...extra } })
      id = c.id
      companies++
    }
    companyCache[slug] = id
    return id
  }

  const addJob = async (data: Record<string, unknown> & { externalId: string }) => {
    const sc = scored[data.externalId] || {}
    const full = {
      ...data, lastSeen: now, status: 'open',
      noc: sc.noc || undefined, category: sc.category || undefined,
      score: sc.score, accessibility: sc.accessibility || undefined,
    }
    const dup = await payload.find({ collection: 'jobs', where: { externalId: { equals: data.externalId } }, limit: 1 })
    if (dup.docs.length) {
      await payload.update({ collection: 'jobs', id: dup.docs[0].id, data: full })
    } else {
      await payload.create({ collection: 'jobs', data: { ...full, firstSeen: now } })
      jobs++
    }
  }

  // 1) ATS 公司目录(科技,第一方)
  const regionDir = path.join(dataRoot, 'companies', REGION)
  if (fs.existsSync(regionDir)) {
    for (const slug of fs.readdirSync(regionDir).filter((f) => fs.statSync(path.join(regionDir, f)).isDirectory())) {
      if (SKIP_SLUGS.has(slug)) continue
      const dir = path.join(regionDir, slug)
      if (!fs.existsSync(path.join(dir, 'jobs.json')) || !fs.existsSync(path.join(dir, 'profile.json'))) continue
      const prof = JSON.parse(fs.readFileSync(path.join(dir, 'profile.json'), 'utf8'))
      const jd = JSON.parse(fs.readFileSync(path.join(dir, 'jobs.json'), 'utf8'))
      if (!jd.jobs?.length) continue
      const cid = await ensureCompany(prof.name, slug, {
        website: prof.website || undefined, email: prof.email || undefined,
        region: prof.region || REGION, sectors: prof.sectors || undefined,
        address: prof.address || undefined, // 公司精确地址(目录已抓)
      })
      for (const j of jd.jobs) {
        const key = `${slug}|${norm(j.title || '')}`
        if (seen.has(key)) { skipped++; continue }
        seen.add(key)
        await addJob({
          title: j.title, company: cid, source: jd.ats || 'ats',
          city: j.location || '', province: guessProv(j.location || ''), region: REGION,
          applyUrl: j.url || '', officialUrl: prof.website || '', externalId: j.url || key,
        })
      }
    }
  }

  // 2) Job Bank(全职业,含非IT)
  const jbPath = path.join(dataRoot, 'raw', 'jobbank', 'jobbank-on.json')
  if (fs.existsSync(jbPath)) {
    for (const j of JSON.parse(fs.readFileSync(jbPath, 'utf8'))) {
      if (AGENCY.test(j.employer || '')) { skipped++; continue } // 跳过中介/派遣
      const cslug = slugify(j.employer || 'unknown')
      const key = `${cslug}|${norm(j.title || '')}`
      if (seen.has(key)) { skipped++; continue }
      seen.add(key)
      const cid = await ensureCompany(j.employer || '—', cslug, { region: 'Ottawa', source: 'jobbank' })
      await addJob({
        title: j.title, company: cid, source: j.source || 'Job Bank',
        city: j.city || '', province: j.province || guessProv(j.city || ''), region: REGION,
        applyUrl: j.url || '', externalId: j.url || key,
        salary: j.salary || undefined, datePosted: isoDate(j.date),
      })
    }
  }

  return Response.json({ ok: true, companies, created: jobs, deduped: skipped, updatedAt: now })
}
