/**
 * Seed/load: GET /seed   (add ?reset=1 to wipe & rebuild)
 * 纯加载器 — 只读 data/mart/(由 etl/09_build_mart.py 产出的最终表)直接灌库。
 * 拼装/清洗/评分关联/中介过滤/去重 全在 ETL 完成,这里不做。
 * mart 每个文件 = 一张表:companies/jobs(事实) + provinces/cities/districts/designated_employers(维度)。
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isoDate = (s?: string) => {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

export async function GET(req: Request) {
  const payload = await getPayload({ config: await config })
  const reset = !!new URL(req.url).searchParams.get('reset')
  const martDir = path.resolve(process.cwd(), '..', 'data', 'mart')
  const mart = (name: string): any[] => {
    const p = path.join(martDir, `${name}.json`)
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : []
  }

  const now = new Date().toISOString()
  const counts: Record<string, number> = {}

  // ── 维度表:每次全量重建(参考数据,小) ──
  const dims: [string, string, (r: any) => Record<string, unknown>][] = [
    ['provinces', 'provinces', (r) => ({ code: r.code, name: r.name })],
    ['cities', 'cities', (r) => ({ name: r.name, province: r.province })],
    ['districts', 'districts', (r) => ({ name: r.name, city: r.city, province: r.province })],
    ['designated_employers', 'designated-employers',
      (r) => ({ name: r.name, province: r.province, location: r.location, isTech: r.isTech, source: r.source })],
  ]
  for (const [file, slug, map] of dims) {
    await payload.delete({ collection: slug as any, where: { id: { exists: true } } })
    let k = 0
    for (const r of mart(file)) {
      if (!r.name && !r.code) continue
      await payload.create({ collection: slug as any, data: map(r) as any })
      k++
    }
    counts[slug] = k
  }

  // ── 事实表:companies(按 slug upsert) ──
  if (reset) {
    await payload.delete({ collection: 'jobs', where: { externalId: { exists: true } } })
    await payload.delete({ collection: 'companies', where: { slug: { exists: true } } })
  }
  const companyId: Record<string, string | number> = {}
  for (const c of mart('companies')) {
    const ex = await payload.find({ collection: 'companies', where: { slug: { equals: c.slug } }, limit: 1, depth: 0 })
    if (ex.docs[0]) {
      companyId[c.slug] = ex.docs[0].id
      await payload.update({ collection: 'companies', id: ex.docs[0].id, data: c as any })
    } else {
      const doc = await payload.create({ collection: 'companies', data: c as any })
      companyId[c.slug] = doc.id
      counts.companies = (counts.companies || 0) + 1
    }
  }

  // ── 事实表:jobs(按 externalId upsert,company 按 companySlug 关联) ──
  const seenIds = new Set<string>()
  for (const j of mart('jobs')) {
    seenIds.add(j.externalId)
    const { companySlug, datePosted, ...rest } = j
    const data: Record<string, unknown> = {
      ...rest, company: companyId[companySlug], datePosted: isoDate(datePosted),
      lastSeen: now, status: 'open', closedAt: null,
    }
    const ex = await payload.find({ collection: 'jobs', where: { externalId: { equals: j.externalId } }, limit: 1, depth: 0 })
    if (ex.docs[0]) {
      await payload.update({ collection: 'jobs', id: ex.docs[0].id, data: data as any })
    } else {
      await payload.create({ collection: 'jobs', data: { ...data, firstSeen: now } as any })
      counts.jobs = (counts.jobs || 0) + 1
    }
  }

  // ── 下架对账(非 reset):本次没出现的 open 岗 → closed ──
  let closed = 0
  if (!reset) {
    const open = await payload.find({ collection: 'jobs', where: { status: { equals: 'open' } }, limit: 100000, depth: 0 })
    for (const d of open.docs) {
      if (!seenIds.has(d.externalId as string)) {
        await payload.update({ collection: 'jobs', id: d.id, data: { status: 'closed', closedAt: now } })
        closed++
      }
    }
  }

  return Response.json({ ok: true, reset, counts, closed, updatedAt: now })
}
