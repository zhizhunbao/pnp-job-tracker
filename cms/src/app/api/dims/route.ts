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
    nocDescriptions: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.titleZh ?? '', titleKo: r.titleKo ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
  }
  // 2026-07-28 实测:这份 1.4MB(压缩后 302KB)每次进职位板都白拉一遍,TTFB 1.2s。
  // 内容是维度表(城市/区/AIP 雇主/NOC 描述),ETL 一小时才可能动一次,且**与用户无关** —— 给浏览器缓存 5 分钟,
  // 过期后先用旧的再后台换新(stale-while-revalidate),返回/翻页不再重付这 1.2 秒。
  return Response.json({ dims }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } })
}
