/**
 * GET /api/jobs — 职位列表服务端分页/筛选/搜索(E10-01 P2)。取代旧的「/api/jobs-data 一次拉 20k blob 前端过滤」。
 * 入参 = /jobs 前端筛选 state 原样(fProv/fCity/q/directOnly…)+ page/sort/dir;分层语义同 SSR(Pro 列剥离、免费匹配前 N)。
 * 返回:{ rows, total, page, pageSize, updatedAt } —— total=同 WHERE count,前端头条命中数/「还有 N」全用它,天然自洽。
 * 个性化「匹配视图」(view=match)由独立端点处理(P4),本端点只管浏览。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { hasProfile, normalizeProfile, type MatchDims } from '@/lib/match'
import { fetchJobsPage, mapEeCat, mapPnpOcc } from '@/lib/jobsSql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 50
const FILTER_KEYS = ['q', 'fProv', 'fCity', 'fDistrict', 'fBroad', 'fMid', 'fFine', 'fTeer',
  'fSource', 'fAcc', 'fPnp', 'fAip', 'fStatus', 'fOrigin', 'fScore', 'fSal', 'fVs', 'fEmp'] as const

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const filters: Record<string, unknown> = {}
  for (const k of FILTER_KEYS) { const v = sp.get(k); if (v) filters[k] = v }
  if (sp.get('directOnly') === '1' || sp.get('directOnly') === 'true') filters.directOnly = true
  const page = Math.min(100000, Math.max(0, parseInt(sp.get('page') || '0', 10) || 0))
  const sort = { key: sp.get('sort') || undefined, dir: sp.get('dir') || undefined }

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

  const { jobs, total, updatedAt } = await fetchJobsPage((payload.db as any).pool, {
    pro, profile, profileOk, matchDims, filters, sort, page, pageSize: PAGE_SIZE,
  })
  return Response.json({ rows: jobs, total, page, pageSize: PAGE_SIZE, updatedAt })
}
