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
  // 鉴权:SEED_TOKEN 已设置则必须匹配(生产必设 —— ?reset=1 可清库,公网裸奔=事故;本地 dev 未设则放行)
  const url = new URL(req.url)
  const token = process.env.SEED_TOKEN
  if (token && req.headers.get('x-seed-token') !== token && url.searchParams.get('token') !== token) {
    return new Response('unauthorized', { status: 401 })
  }
  const payload = await getPayload({ config: await config })
  const reset = !!url.searchParams.get('reset')
  // mart 双模式(R3):SUPABASE_* 已设 → 从 Supabase Storage 拉(Render 上 cms 无共享盘);
  // 否则读本地 data/mart/(本地 dev / VPS compose 不变)。缺表两模式同义:返回 []。
  const sbUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const sbKey = process.env.SUPABASE_SERVICE_KEY
  const martDir = path.resolve(process.cwd(), '..', 'data', 'mart')
  const mart = async (name: string): Promise<any[]> => {
    if (sbUrl && sbKey) {
      const r = await fetch(`${sbUrl}/storage/v1/object/mart/${name}.json`, {
        headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey }, cache: 'no-store', // 双头兼容 sb_secret_/legacy JWT
      })
      return r.ok ? await r.json() : []
    }
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
    ['noc_descriptions', 'noc-descriptions', (r) => ({ noc: r.noc, title: r.title, duties: r.duties, requirements: r.requirements, fetched: r.fetched })],
    // E4-04 字段级来源 / E5-02 榜单 / E5-04 地区统计(坑 2:白名单必须显式列全字段)
    ['field_sources', 'field-sources', (r) => ({ field: r.field, kind: r.kind, publisher: r.publisher, url: r.url, title: r.title, description: r.description, status: r.status, fetched: r.fetched, note: r.note })],
    ['rankings', 'rankings', (r) => ({ slug: r.slug, rank: r.rank, kind: r.kind, externalId: r.externalId, title: r.title, company: r.company, companySlug: r.companySlug, city: r.city, province: r.province, noc: r.noc, teer: r.teer, score: r.score, salaryText: r.salaryText, salaryAnnual: r.salaryAnnual, pnpStream: r.pnpStream, eeCategory: r.eeCategory, datePosted: r.datePosted, applyUrl: r.applyUrl, officialUrl: r.officialUrl, openJobs: r.openJobs, namedJobs: r.namedJobs, avgScore: r.avgScore })],
    ['stats', 'stats', (r) => ({ province: r.province, broad: r.broad, openJobs: r.openJobs, new7d: r.new7d, medianWageAnnual: r.medianWageAnnual, medianSalaryAnnual: r.medianSalaryAnnual, namedJobs: r.namedJobs, streamLabels: r.streamLabels, aipJobs: r.aipJobs, topCities: r.topCities, fetched: r.fetched })],
  ]
  for (const [file, slug, map] of dims) {
    await payload.delete({ collection: slug as any, where: { id: { exists: true } } })
    const rows = (await mart(file)).map(map).filter((d) => Object.values(d).some((v) => v !== undefined && v !== null && v !== ''))
    await pool(rows, (data) => payload.create({ collection: slug as any, data: data as any }).then(() => {}))
    counts[slug] = rows.length
  }

  // ── 事实表:companies ──
  if (reset) {
    await payload.delete({ collection: 'jobs', where: { externalId: { exists: true } } })
    await payload.delete({ collection: 'companies', where: { slug: { exists: true } } })
  }
  const companyId: Record<string, string | number> = {}
  const companyRows = await mart('companies')
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
  const jobRows = await mart('jobs')
  await pool(jobRows, async (j) => {
    seenIds.add(j.externalId)
    const { companySlug, datePosted, lastSeen, ...rest } = j
    // lastSeen = 数据抓取时刻(ETL 下沉,mart 透传),不再用 seed 时间——重新入库不推动「抓取时间」。
    // mart 没给(老帖未再被抓到)→ 更新时不带该键,保留库里旧值;仅新建才兜底 now。
    const data: Record<string, unknown> = {
      ...rest, company: companyId[companySlug], datePosted: isoDate(datePosted),
      status: 'open', closedAt: null, ...(lastSeen ? { lastSeen } : {}),
    }
    if (!reset) {
      const ex = await payload.find({ collection: 'jobs', where: { externalId: { equals: j.externalId } }, limit: 1, depth: 0 })
      if (ex.docs[0]) { await payload.update({ collection: 'jobs', id: ex.docs[0].id, data: data as any }); return }
    }
    await payload.create({ collection: 'jobs', data: { ...data, lastSeen: lastSeen || now, firstSeen: now } as any })
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
