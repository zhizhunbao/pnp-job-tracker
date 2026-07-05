// 弹框维度懒加载(E7-04 D7):仅 AdvisorModal 用的 6 个维度不进 /jobs 首字节,
// hydration 后 idle 预取。映射与原 page.tsx 一致;全部免费信号数据,公开可缓存。
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getPayload({ config: await config })
  const [pnpDocs, pnpDrawDocs, eeDocs, aipDocs, nocDescDocs, fieldSrcDocs] = await Promise.all([
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
    payload.find({ collection: 'designated-employers', limit: 5000, depth: 0 }),
    payload.find({ collection: 'noc-descriptions', limit: 2000, depth: 0 }),
    payload.find({ collection: 'field-sources', limit: 200, depth: 0 }),
  ])
  const body = {
    pnpOccupations: pnpDocs.docs.map((r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })),
    pnpDraws: pnpDrawDocs.docs.map((r: any) => ({ province: r.province, kind: r.kind, drawDate: r.drawDate ?? '', stream: r.stream ?? '', score: typeof r.score === 'number' ? r.score : null, scale: r.scale ?? '', invitations: typeof r.invitations === 'number' ? r.invitations : null, note: r.note ?? '', label: r.label ?? '', url: r.url ?? '', fetched: r.fetched ?? '' })),
    eeCategories: eeDocs.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })),
    designatedEmployers: aipDocs.docs.map((r: any) => ({ name: r.name, province: r.province, location: r.location, isTech: !!r.isTech })),
    nocDescriptions: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
    fieldSources: fieldSrcDocs.docs.map((r: any) => ({ field: r.field ?? '', kind: r.kind ?? '', publisher: r.publisher ?? '', url: r.url ?? '', title: r.title ?? '', description: r.description ?? '', status: r.status ?? '', fetched: r.fetched ?? '', note: r.note ?? '' })),
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=1800' } })
}
