/**
 * POST /api/profile-pathways — PR 问卷完成后的个人路径初筛。
 *
 * 这里只把统一题库答案翻成 VerdictProfile，再调用判定层 pathVerdict；不依赖具体职位或雇主。
 * 具体岗位判定仍走 /api/triple-verdict，作为用户已有 offer/看中岗位后的第二层验证。
 */
import { pathVerdict, type VerdictProfile } from '@/lib/pathVerdict'
import { getVerdictData } from '@/lib/verdictCache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS: Record<string, string> = {
  overseas: 'other', studying: 'study', working: 'worker', jobhunting: 'other',
}

const REGIONAL_FEDERAL_PATHWAYS: Record<string, readonly string[]> = {
  AIP: ['NB', 'NS', 'PE', 'NL'],
  RCIP: ['BC', 'AB', 'SK', 'MB', 'ON', 'NS'],
}

export const pathwayMatchesTargets = (key: string, province: string, targets: string[]): boolean => {
  if (!targets.length) return true
  if (province !== 'FED') return targets.includes(province)
  const regionalTargets = REGIONAL_FEDERAL_PATHWAYS[key]
  return !regionalTargets || regionalTargets.some((provinceCode) => targets.includes(provinceCode))
}

const finite = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { answers?: Record<string, unknown> } | null
  const answers = body?.answers
  if (!answers || typeof answers !== 'object') return Response.json({ error: 'answers required' }, { status: 400 })

  const nocs = Array.isArray(answers.nocs) ? answers.nocs.map(String).filter((n) => /^\d{5}$/.test(n)) : []
  const noc = nocs[0] || (/^\d{5}$/.test(String(answers.noc ?? '')) ? String(answers.noc) : '')
  if (!noc) return Response.json({ error: 'noc required' }, { status: 400 })

  const targetProvinces = Array.isArray(answers.targetProvinces)
    ? answers.targetProvinces.map(String).filter((p) => /^[A-Z]{2}$/.test(p))
    : []
  const totalExp = finite(answers.totalExpMonths)
  const canadaExp = finite(answers.canadianExpMonths)
  const teer = Number(noc[1])

  const profile: VerdictProfile = {
    age: finite(answers.age), married: null,
    clb: finite(answers.clb), edu: null, eduYears: null,
    canadaStudy: null, studyProvince: null,
    noc, teer: Number.isInteger(teer) && teer >= 0 && teer <= 5 ? teer : null,
    expCanadaMonths: canadaExp,
    expForeignMonths: totalExp == null ? null : Math.max(0, totalExp - (canadaExp ?? 0)),
    foreignExpSelfEmployed: null,
    status: STATUS[String(answers.currentStatus ?? '')] ?? null,
    // 目标省不是现居省。居住门槛没有单独问过，必须留空让引擎如实标 needs-info。
    province: null,
  }

  const data = await getVerdictData()
  const all = pathVerdict(profile, data)
  const scoped = all.filter((row) => pathwayMatchesTargets(row.key, row.province, targetProvinces))
  // 方案区只推荐仍可推进或待补资料的路径；硬排除项不包装成“方案”。
  const rows = scoped.filter((row) => row.verdict !== 'excluded').slice(0, 6).map((row) => ({
    key: row.key,
    province: row.province,
    verdict: row.verdict,
    tier: row.tier,
    availability: row.availability,
    // 被硬门槛卡住时,方案卡不能再写「优先核对」——那等于让人拿着不够的语言分去核对
    blockedBy: row.blockedBy ?? null,
  }))

  return Response.json({ noc, rows })
}
