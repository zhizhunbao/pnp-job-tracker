/**
 * POST /api/report — 报告引擎服务端出口(L2-01/L2-02,卡②「拿 PR」先通)。
 * body: { goal: 'pr', answers?: { noc? | nocs?[], currentStatus?, clb?, crs?, canadianExpMonths?, targetProvinces?, edu?, age?, totalExpMonths? } }
 * 多职业(2026-08-02 Frank「选多个职业,报告也应该支持多个职业」):**一个职业一份报告,不混算** ——
 * 清单命中、门槛、抽选线全是按职业来的,把两个职业的数合起来算没有任何官方口径支持。
 * 返回 { report, reports[] }:report=第一份(老前端与 advisor 不受影响),reports=全部。
 * 合并序:登录档案为底、本次答案覆盖(改答案立刻重算铁律);匿名可用(结论摘要免费,aha 在掏钱之前)。
 * 引擎纯函数(lib/report.ts),这里只做:身份合并 → dims(1h 缓存)→ facts 组装 → buildPrReport。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile } from '@/lib/match'
import { EDU_KEYS, type EduKey } from '@/lib/pnpSelfScore'
import { loadMatchDims } from '@/lib/matchDims'
import { buildCareerReport, buildJobReport, buildPrReport, buildProvReport, gateReport } from '@/lib/report'
import { assembleOccStats, assembleReportFacts } from '@/lib/reportFacts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_NOCS = 3   // 报告最多同时算几个职业(每多一个 = 多两次库往返)

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 无 body 走纯档案 */ }
  const goal: 'pr' | 'job' | 'career' | 'prov' = body?.goal ?? 'pr'
  if (!['pr', 'job', 'career', 'prov'].includes(goal)) return Response.json({ error: 'unknown goal' }, { status: 400 })
  const a = body?.answers ?? {}

  const user = await getUser(await headers()).catch(() => null)
  const base = (user as any)?.profile ?? {}
  // 档案为底、答案覆盖;canadianExpMonths 是题库新增字段(挂 Users.profile json,无需加列)
  const merged = { ...base, ...a }
  const profile = normalizeProfile(merged)
  // 题库扩充 20260802:edu/age/totalExpMonths 与 canadianExpMonths 同路(挂 Users.profile json,无需加列);
  // 形状不可信 → 逐个校验,学历只收 EDU_KEYS 里的枚举(脏值当没答,宁可少算也不拿它去匹官方档位)
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const extra = {
    canadianExpMonths: num(merged.canadianExpMonths),
    edu: typeof merged.edu === 'string' && (EDU_KEYS as string[]).includes(merged.edu) ? (merged.edu as EduKey) : null,
    age: num(merged.age),
    totalExpMonths: num(merged.totalExpMonths),
  }
  // 职业清单:nocs 优先(多选),退到单值 noc,再退到登录档案。上限 MAX_NOCS ——
  // 每多一个职业就多两次库往返,选十个职业等于把报告接口变成慢查询。
  const raw: string[] = Array.isArray(a.nocs) ? a.nocs : []
  const nocs = Array.from(new Set([
    ...raw.filter((n: unknown) => typeof n === 'string' && /^\d{5}$/.test(n.trim())).map((n: string) => n.trim()),
    ...((typeof a.noc === 'string' && a.noc.trim()) ? [a.noc.trim()] : []),
    ...profile.nocCodes,
  ])).slice(0, MAX_NOCS)
  const noc = nocs[0] ?? ''

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const dims = await loadMatchDims()
  // 一个职业一份报告,四张卡都要职业级统计 stats_occupation。
  // 2026-08-03(L1):拿 PR / 选省份**也查** —— 先前为省一次往返不查,代价是雇主线索(锁区唯一的真货)
  // 只长在卡①,而漏斗实测 16 次出报告 12 次是拿 PR 卡(设计:docs/design/付费概率提升计划-20260803.md)。
  const wantOcc = true
  const reports = await Promise.all((nocs.length ? nocs : ['']).map(async (n) => {
    const [facts, occ] = await Promise.all([
      assembleReportFacts(pool, n),
      wantOcc ? assembleOccStats(pool, n) : Promise.resolve(null),
    ])
    return buildOne(facts, occ)
  }))
  return Response.json({ report: reports[0], reports })

  function buildOne(facts: Awaited<ReturnType<typeof assembleReportFacts>>, occ: Awaited<ReturnType<typeof assembleOccStats>> | null) {
    // extra 三张卡都要传:换省对照(L2-08)拿加拿大经验算下界分,卡①/③ 少了它会比卡② 少算一项
    const built = goal === 'job' ? buildJobReport(profile, dims, facts, occ!, extra)
      : goal === 'career' ? buildCareerReport(profile, facts, occ!)
        // answers.goal 是卡③的诉求(goalBand → 'pr'|'work'),与 body.goal(卡种)同名不同物 ——
        // 2026-08-03 上线时这里漏传,生产上两种诉求返回逐字节相同,排序目标形同虚设
        : goal === 'prov' ? buildProvReport(profile, {
          hasJobOffer: typeof merged.hasJobOffer === 'boolean' ? merged.hasJobOffer : null,
          goal: merged.goal === 'pr' || merged.goal === 'work' ? merged.goal : null,
          ...extra,
        }, dims, facts, occ)
          : buildPrReport(profile, extra, dims, facts, occ)
    // 付费闸在服务端(L2-03):免费响应里根本没有锁区正文,前端只负责显示锁行标题
    return gateReport(built, isPro(user))
  }
}
