/**
 * One-off seed: load already-scraped Ottawa ATS jobs into Payload so the /jobs page
 * has real data. Run from cms/:  npx payload run src/seed.ts
 * (Later replaced by the proper ETL loader etl/09_load.py via the REST API.)
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

process.on('unhandledRejection', (e) => console.error('UNHANDLED', e))
process.on('uncaughtException', (e) => console.error('UNCAUGHT', e))
const keepAlive = setInterval(() => {}, 1000) // 防止 payload run 提前退出事件循环

const REGION = 'ottawa-kanata-north'
const REGION_DIR = path.resolve(process.cwd(), '..', 'data', 'companies', REGION)

const guessProv = (loc: string) => (/\b(on|ontario)\b/i.test(loc) ? 'ON' : '')

const run = async () => {
  console.log('SEED START, data dir =', REGION_DIR, 'exists =', fs.existsSync(REGION_DIR))
  const payload = await getPayload({ config: await config })
  console.log('payload ready')
  if (!fs.existsSync(REGION_DIR)) {
    throw new Error('No data dir: ' + REGION_DIR)
  }
  const folders = fs
    .readdirSync(REGION_DIR)
    .filter((f) => fs.statSync(path.join(REGION_DIR, f)).isDirectory())

  let companies = 0
  let jobs = 0
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
      const dup = await payload.find({
        collection: 'jobs',
        where: { externalId: { equals: externalId } },
        limit: 1,
      })
      if (dup.docs.length) continue
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
        },
      })
      jobs++
    }
  }
  console.log(`Seeded ${companies} companies, ${jobs} jobs.`)
}

run()
  .then(() => {
    clearInterval(keepAlive)
    console.log('SEED DONE')
    setTimeout(() => process.exit(0), 200)
  })
  .catch((e) => {
    clearInterval(keepAlive)
    console.error('SEED ERROR:', e)
    setTimeout(() => process.exit(1), 200)
  })
