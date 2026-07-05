// 匹配用维度加载(pnp/ee 清单)进程内缓存 1h —— advisor 档案注入与 alerts run 共用(E5-00/E5-03)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { MatchDims } from './match'

let cache: { at: number; dims: MatchDims } | null = null

export async function loadMatchDims(): Promise<MatchDims> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.dims
  const payload = await getPayload({ config: await config })
  const [pnp, ee] = await Promise.all([
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
  ])
  const dims: MatchDims = {
    pnpOccupations: pnp.docs.map((r: any) => ({ province: r.province, label: r.label, type: r.type, noc: r.noc, url: r.url, fetched: r.fetched })),
    eeCategories: ee.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', url: r.url, fetched: r.fetched })),
  }
  cache = { at: Date.now(), dims }
  return dims
}
