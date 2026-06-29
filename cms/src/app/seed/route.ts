/**
 * Seed/load: GET /seed   (add ?reset=1 to wipe & rebuild)
 * 纯加载器 — 只读 data/mart/(由 etl/09_build_mart.py 产出的最终表)直接灌库。
 * 拼装/清洗/评分关联/中介过滤/去重 全在 ETL 完成,这里不做。
 * 性能:并发分批写(POOL)+ reset 时跳过存在性查询(表已清空,直接 create)。
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POOL = 10 // 并发度(与 pg 连接池匹配)

const isoDate = (s?: string) => {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

// 分批并发执行:每批 POOL 个一起 await,显著快于逐个串行
async function pool<T>(items: T[], fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += POOL) {
    await Promise.all(items.slice(i, i + POOL).map(fn))
  }
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

  // ── 维度表:每次全量重建(清空 + 并发插入) ──
  const dims: [string, string, (r: any) => Record<string, unknown>][] = [
    ['provinces', 'provinces', (r) => ({ code: r.code, name: r.name })],
    ['cities', 'cities', (r) => ({ name: r.name, province: r.province })],
    ['districts', 'districts', (r) => ({ name: r.name, city: r.city, province: r.province })],
    ['designated_employers', 'designated-employers',
      (r) => ({ name: r.name, province: r.province, location: r.location, isTech: r.isTech, source: r.source })],
    ['noc_categories', 'noc-categories', (r) => ({ broad: r.broad, mid: r.mid, fine: r.fine, teer: r.teer })],
    ['sources', 'sources', (r) => ({ name: r.name })],
    ['experience_levels', 'experience-levels', (r) => ({ name: r.name })],
    ['pnp_occupations', 'pnp-occupations', (r) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted, url: r.url, fetched: r.fetched })],
    ['ee_categories', 'ee-categories', (r) => ({ category: r.category, label: r.label, noc: r.noc, teer: r.teer, title: r.title, url: r.url, fetched: r.fetched, drawCrs: r.drawCrs, drawDate: r.drawDate, drawSize: r.drawSize })],
  ]
  for (const [file, slug, map] of dims) {
    await payload.delete({ collection: slug as any, where: { id: { exists: true } } })
    const rows = mart(file).map(map).filter((d) => Object.values(d).some((v) => v !== undefined && v !== null && v !== ''))
    await pool(rows, (data) => payload.create({ collection: slug as any, data: data as any }).then(() => {}))
    counts[slug] = rows.length
  }

  // ── 事实表:companies ──
  if (reset) {
    await payload.delete({ collection: 'jobs', where: { externalId: { exists: true } } })
    await payload.delete({ collection: 'companies', where: { slug: { exists: true } } })
  }
  const companyId: Record<string, string | number> = {}
  const companyRows = mart('companies')
  await pool(companyRows, async (c) => {
    if (!reset) {
      const ex = await payload.find({ collection: 'companies', where: { slug: { equals: c.slug } }, limit: 1, depth: 0 })
      if (ex.docs[0]) { companyId[c.slug] = ex.docs[0].id; await payload.update({ collection: 'companies', id: ex.docs[0].id, data: c as any }); return }
    }
    const doc = await payload.create({ collection: 'companies', data: c as any })
    companyId[c.slug] = doc.id
  })
  counts.companies = companyRows.length

  // ── 事实表:jobs(company 按 companySlug 关联) ──
  const seenIds = new Set<string>()
  const jobRows = mart('jobs')
  await pool(jobRows, async (j) => {
    seenIds.add(j.externalId)
    const { companySlug, datePosted, ...rest } = j
    const data: Record<string, unknown> = {
      ...rest, company: companyId[companySlug], datePosted: isoDate(datePosted),
      lastSeen: now, status: 'open', closedAt: null,
    }
    if (!reset) {
      const ex = await payload.find({ collection: 'jobs', where: { externalId: { equals: j.externalId } }, limit: 1, depth: 0 })
      if (ex.docs[0]) { await payload.update({ collection: 'jobs', id: ex.docs[0].id, data: data as any }); return }
    }
    await payload.create({ collection: 'jobs', data: { ...data, firstSeen: now } as any })
  })
  counts.jobs = jobRows.length

  // ── 下架(非 reset):只下架「本次未见 且 发布已超 EXPIRE_DAYS 天」的岗 ──
  // 不再用「本次没出现就 closed」对账:增量抓取只含最近几天,会误杀大量仍在招的旧岗
  // (实测一次误杀 805 个,见 docs/source-framework.md)。改按发布日期过期(JB 帖约 30 天):
  // 近期未见的岗先留着,等真正过龄才下架。
  const EXPIRE_DAYS = 30
  let closed = 0
  if (!reset) {
    const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400000).toISOString()
    const open = await payload.find({ collection: 'jobs', where: { status: { equals: 'open' } }, limit: 100000, depth: 0 })
    const stale = open.docs.filter((d) => !seenIds.has(d.externalId as string)
      && typeof d.datePosted === 'string' && (d.datePosted as string) < cutoff)
    await pool(stale, (d) => payload.update({ collection: 'jobs', id: d.id, data: { status: 'closed', closedAt: now } }).then(() => {}))
    closed = stale.length
  }

  return Response.json({ ok: true, reset, counts, closed, updatedAt: now })
}
