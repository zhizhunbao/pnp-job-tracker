/**
 * GET /api/jobs-data — 职位全量数据(首屏拆分的后半:page.tsx SSR 只带最近 50 行秒开,
 * 前端水合后从这里后台拉全量再换入;同一查询层 lib/jobsList.ts,同一排序,换入无跳变)。
 * 分层语义与 SSR 完全一致:Pro 列免费用户置空、匹配免费只算前 N 岗 —— 数据不进浏览器。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { hasProfile, normalizeProfile, type MatchDims } from '@/lib/match'
import { fetchJobRows, mapEeCat, mapPnpOcc } from '@/lib/jobsList'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const payload = await getPayload({ config: await config })
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  // 匹配维度只在建了档才需要(未登录/未建档 = 全部 match null,省两次查询)
  let matchDims: MatchDims = { pnpOccupations: [], eeCategories: [] }
  if (profileOk) {
    const [pnp, ee] = await Promise.all([
      payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
      payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
    ])
    matchDims = { pnpOccupations: pnp.docs.map(mapPnpOcc), eeCategories: ee.docs.map(mapEeCat) }
  }

  const { jobs, updatedAt, matchHigh, matchMid } = await fetchJobRows((payload.db as any).pool, { pro, profile, profileOk, matchDims, limit: 20000 })
  // 大维度表(SSR 瘦身,2026-07-17):cities/districts/designated_employers/noc_descriptions 首屏不内联(~1.25MB),
  // 随本端点后台拉、客户端并入 dims;它们只在筛选下拉/顾问弹窗才用,晚一两秒到达无碍。
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
  // matchHigh/matchMid:全量匹配计数(第 5 轮 #15)——免费用户的 FOMO 数字,值本身仍按 cap 剥离
  return Response.json({ jobs, updatedAt, matchHigh, matchMid, dims })
}
