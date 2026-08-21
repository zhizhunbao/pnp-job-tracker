/**
 * GET /api/jobs — 职位列表服务端分页/筛选/搜索(E10-01 P2)。取代旧的「/api/jobs-data 一次拉 20k blob 前端过滤」。
 * 入参 = /jobs 前端筛选 state 原样(fProv/fCity/q/directOnly…)+ page/sort/dir;分层语义同 SSR(Pro 列剥离、免费匹配前 N)。
 * 返回:{ rows, total, page, pageSize, updatedAt } —— total=同 WHERE count,前端头条命中数/「还有 N」全用它,天然自洽。
 * 个性化「匹配视图」(view=match)由独立端点处理(P4),本端点只管浏览。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/quota/server'
import { dbOf } from '@/lib/db/server'
import { hasProfile, normalizeProfile, type MatchDims } from '@/lib/jobs'
import { fetchJobsPage, fetchMatchPage, loadMatchDims } from '@/lib/jobs/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 50

// 匹配维度不再本地建:2026-08-18 收进 lib/jobs 的 loadMatchDims(同一份缓存、同一条 SQL、同一道
// program=PNP 过滤)。原来这里自己 payload.find 两张表再拼一遍 —— 同一份维度两条路,
// 而 dims.ts 那条恰恰漏了 pnpOnly:advisor 与 alerts 把 AIP 名单当成省提名清单命中(已修)。
// TTL 从本地的 10 分钟改成共享的 1 小时:维度表随 seed 小时级更新,两个数都在「可接受的陈旧」里,
// 但两份缓存意味着两个数,收成一个更值。

// ⚠️ 新增筛选键三处同步:buildJobsWhere(lib/jobs/queries)+ 前端 state + 本白名单(#73 排序白名单同款教训,fElig 漏过一回)
const FILTER_KEYS = ['q', 'fNoc', 'fProv', 'fCity', 'fDistrict', 'fBroad', 'fMid', 'fFine', 'fTeer',
  'fSource', 'fAcc', 'fPnp', 'fAip', 'fPilot', 'fStatus', 'fOrigin', 'fScore', 'fSal', 'fVs', 'fEmp', 'fElig'] as const

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
  if (profileOk) matchDims = await loadMatchDims()

  const pool = dbOf(payload)
  // 「我的匹配」视图(E5-05):候选预筛 + TS match;未建档 → 空(与旧客户端一致)
  if (sp.get('view') === 'match') {
    if (!profileOk) return Response.json({ rows: [], total: 0, page, pageSize: PAGE_SIZE, updatedAt: '', matchHigh: 0, matchMid: 0 })
    const m = await fetchMatchPage(pool, { pro, profile, matchDims, page, pageSize: PAGE_SIZE, sort })
    return Response.json({ rows: m.jobs, total: m.total, page, pageSize: PAGE_SIZE, updatedAt: m.updatedAt, matchHigh: m.matchHigh, matchMid: m.matchMid })
  }
  const { jobs, total, updatedAt } = await fetchJobsPage(pool, {
    pro, profile, profileOk, matchDims, filters, sort, page, pageSize: PAGE_SIZE,
  })
  return Response.json({ rows: jobs, total, page, pageSize: PAGE_SIZE, updatedAt })
}
