/**
 * GET /api/dims — 筛选下拉/顾问弹窗要用的大维度(E10-01 P3):cities/districts/designated_employers/noc_descriptions。
 * 从旧 /api/jobs-data 拆出来:维度独立加载,不再随 20k 职位 blob(blob 已由 /api/jobs 分页取代)。
 * 省/来源/经验等小维度仍走 SSR(page.tsx),这里只补首屏未内联的四个大维度。
 */
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const payload = await getPayload({ config: await config })
  const [cityDocs, distDocs, aipDocs, nocDescDocs] = await Promise.all([
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'designated-employers', limit: 5000, depth: 0 }),
    payload.find({ collection: 'noc-descriptions', limit: 2000, depth: 0 }),
  ])
  const dims = {
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
    designatedEmployers: aipDocs.docs.map((r: any) => ({ name: r.name, province: r.province, location: r.location, isTech: !!r.isTech })),
    nocDescriptions: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
  }
  return Response.json({ dims })
}
