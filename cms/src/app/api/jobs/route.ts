// /jobs 列表增量取数(E7-04):筛选/搜索/排序/翻页全在 SQL(lib/jobsList 单点)。
// 公开只读;Pro 列剥离与免费匹配限额在 queryJobsPage 内落实(gate 在服务端,前端只做展示引导)。
import { NextRequest, NextResponse } from 'next/server'
import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { queryJobsPage, JOBS_PAGE_SIZE } from '@/lib/jobsList'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 与 JobsTable 筛选 state 同名同值(保存筛选/alerts 也是这套键)
const FILTER_KEYS = ['q', 'directOnly', 'fCountry', 'fProv', 'fCity', 'fDistrict', 'fBroad', 'fMid', 'fFine',
  'fTeer', 'fSource', 'fAcc', 'fPnp', 'fAip', 'fStatus', 'fOrigin', 'fScore', 'fSal', 'fVs'] as const

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const filters: Record<string, string> = {}
  for (const k of FILTER_KEYS) { const v = sp.get(k); if (v) filters[k] = v }

  const user = await getUser(req.headers)
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)

  const { rows, total } = await queryJobsPage({
    filters,
    sort: sp.get('sort') || undefined,
    dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
    offset: Number(sp.get('offset')) || 0,
    limit: Number(sp.get('limit')) || JOBS_PAGE_SIZE,
    pro,
    profile,
    profileOk: hasProfile(profile),
    company: sp.get('company') || undefined,   // 「公司信息」弹框内部参数(精确公司名)
  })
  return NextResponse.json({ rows, total })
}
