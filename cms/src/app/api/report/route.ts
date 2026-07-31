/**
 * POST /api/report — 报告引擎服务端出口(L2-01/L2-02,卡②「拿 PR」先通)。
 * body: { goal: 'pr', answers?: { noc?, currentStatus?, clb?, crs?, canadianExpMonths?, targetProvinces? } }
 * 合并序:登录档案为底、本次答案覆盖(改答案立刻重算铁律);匿名可用(结论摘要免费,aha 在掏钱之前)。
 * 引擎纯函数(lib/report.ts),这里只做:身份合并 → dims(1h 缓存)→ facts 组装 → buildPrReport。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile } from '@/lib/match'
import { loadMatchDims } from '@/lib/matchDims'
import { buildCareerReport, buildJobReport, buildPrReport, gateReport } from '@/lib/report'
import { assembleOccStats, assembleReportFacts } from '@/lib/reportFacts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 无 body 走纯档案 */ }
  const goal: 'pr' | 'job' | 'career' = body?.goal ?? 'pr'
  if (!['pr', 'job', 'career'].includes(goal)) return Response.json({ error: 'unknown goal' }, { status: 400 })
  const a = body?.answers ?? {}

  const user = await getUser(await headers()).catch(() => null)
  const base = (user as any)?.profile ?? {}
  // 档案为底、答案覆盖;canadianExpMonths 是题库新增字段(挂 Users.profile json,无需加列)
  const merged = { ...base, ...a }
  const profile = normalizeProfile(merged)
  const extra = { canadianExpMonths: typeof merged.canadianExpMonths === 'number' && Number.isFinite(merged.canadianExpMonths) ? merged.canadianExpMonths : null }
  const noc = (typeof a.noc === 'string' && a.noc.trim()) || profile.nocCodes[0] || ''

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  // 卡①/⑥ 要职业级统计(stats_occupation);拿 PR 不查,省一次往返
  const [dims, facts, occ] = await Promise.all([
    loadMatchDims(),
    assembleReportFacts(pool, noc),
    goal === 'pr' ? Promise.resolve(null) : assembleOccStats(pool, noc),
  ])
  const built = goal === 'job' ? buildJobReport(profile, dims, facts, occ!)
    : goal === 'career' ? buildCareerReport(profile, facts, occ!)
      : buildPrReport(profile, extra, dims, facts)
  // 付费闸在服务端(L2-03):免费响应里根本没有锁区正文,前端只负责显示锁行标题
  const report = gateReport(built, isPro(user))
  return Response.json({ report })
}
