// 档案匹配规则引擎(E5-00,付费墙头牌)。规则只住这一处:列表列/弹框「对我意味着什么」/advisor 都消费它的输出。
// 纯函数、无 IO、前后端同构:匹配 = 档案 × 现有维度(pnp_occupations/ee_categories/wages)的运行时 join,零新增抓取。
// 措辞红线:reason 只陈述「符合/不符合公开清单条件」「高于/低于上次抽选分数线」等可核验事实,永不说「你能/不能移民」。
// 每条 reason 带 i18n 键+参数(UI 三语渲染)与 sourceRef(依据链:指回具体维度记录)。
// v1 不用 clb/pgwpMonthsLeft 评分(档案存着,advisor 事实可见);规则升级时先改 fixture 快照测试。

// 用户分型(E11-04,§2.5 A–E):稳定 slug,枚举单一来源。前后端 + advisor + 未来 E11-05/E12 都引这一处。
export type CurrentStatus = 'overseas' | 'studying' | 'working' | 'jobhunting' | 'pr'
export const CURRENT_STATUSES: CurrentStatus[] = ['overseas', 'studying', 'working', 'jobhunting', 'pr']

export type MatchProfile = {
  nocCodes: string[]
  clb: number | null
  crs: number | null
  targetProvinces: string[]
  pgwpMonthsLeft: number | null
  currentStatus: CurrentStatus | null   // v1 不进评分;仅作 advisor grounding 路径语境
}

// 匹配只读职位的这几个字段(JobRow 超集兼容)
export type MatchJob = {
  noc: string
  teer: number | null
  province: string
  pnpEligible: boolean
  pnpStream: string
  eeCategory: string
  salaryAnnual: number | null
  wageMedAnnual: number | null
  // E6-02:雇主近两年 LMIA 获批记录(公司级,ESDC 公开数据;历史事实非能力判定)
  lmiaPositions?: number | null
  lmiaLastQuarter?: string
  // B4-02:技能股(High Wage/GTS/PR-only)获批数——农业/低薪股≠技能类担保信号(Frank「有 LMIA 但没法移民」)
  // null=列未回填(DDL/seed 未跑),规则 6 回退旧口径;0=确认纯农业/低薪股
  lmiaPositionsSkilled?: number | null
}

export type PnpOccDim = { province: string; label: string; type: string; noc: string; url: string; fetched: string }
export type EeCatDim = { category: string; label: string; noc: string; drawCrs: number | null; drawDate: string; url: string; fetched: string }
export type MatchDims = { pnpOccupations: PnpOccDim[]; eeCategories: EeCatDim[] }

export type MatchVerdict = 'pass' | 'warn' | 'fail' | 'na'
export type MatchReason = {
  rule: 'noc' | 'prov' | 'ee' | 'teer' | 'wage' | 'lmia'
  verdict: MatchVerdict
  key: string                                   // i18n 键(match.r.*,见 i18n.ts)
  params: Record<string, string | number>
  source?: { label: string; url: string; fetched: string }
}
export type MatchLevel = 'high' | 'mid' | 'low' | 'na'
export type MatchResult = { level: MatchLevel; score: number; reasons: MatchReason[] }

// 档案是否可用于匹配(全空档案不算建档)
export function hasProfile(p: Partial<MatchProfile> | null | undefined): boolean {
  if (!p) return false
  return (Array.isArray(p.nocCodes) && p.nocCodes.length > 0) || p.crs != null || (Array.isArray(p.targetProvinces) && p.targetProvinces.length > 0)
}

// Users.profile(json 字段,形状不可信)→ 规范化 MatchProfile
export function normalizeProfile(raw: any): MatchProfile {
  const strArr = (v: any): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [])
  const numOrNull = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const status = typeof raw?.currentStatus === 'string' && (CURRENT_STATUSES as string[]).includes(raw.currentStatus)
    ? (raw.currentStatus as CurrentStatus)
    : null
  return {
    nocCodes: strArr(raw?.nocCodes),
    clb: numOrNull(raw?.clb),
    crs: numOrNull(raw?.crs),
    targetProvinces: strArr(raw?.targetProvinces).map((s) => s.toUpperCase()),
    pgwpMonthsLeft: numOrNull(raw?.pgwpMonthsLeft),
    currentStatus: status,
  }
}

const LEVEL_RANK: Record<MatchLevel, number> = { high: 3, mid: 2, low: 1, na: 0 }
export const matchRank = (l: MatchLevel | null | undefined): number => (l ? LEVEL_RANK[l] : -1)

export function match(profile: MatchProfile, job: MatchJob, dims: MatchDims): MatchResult {
  const reasons: MatchReason[] = []
  let score = 0
  let nocMiss = false   // 填了 NOC 但精确/小类/同族全未命中(见规则 1)→ 档位封顶 low

  // ── 规则 1:NOC 对口(job 未分类 → 整体不适用,不硬塞) ──
  if (!job.noc) {
    return { level: 'na', score: 0, reasons: [{ rule: 'noc', verdict: 'na', key: 'match.r.noc.jobUncat', params: {} }] }
  }
  if (profile.nocCodes.length === 0) {
    reasons.push({ rule: 'noc', verdict: 'na', key: 'match.r.noc.noProfile', params: {} })
  } else if (profile.nocCodes.includes(job.noc)) {
    score += 40
    reasons.push({ rule: 'noc', verdict: 'pass', key: 'match.r.noc.exact', params: { noc: job.noc } })
  } else {
    // 2026-07-21 Frank 拍板「我干 IT 不一定非得软件开发」:同族分三档——精确 40 / 同小类(前4位)30 /
    // 同族(前3位,如 212x=计算机专业类)20。跨小类的同领域岗(数据科学/安全/DBA…)不再拿 0 分。
    const minor = profile.nocCodes.find((c) => c.length === 5 && c.slice(0, 4) === job.noc.slice(0, 4))
    const submajor = profile.nocCodes.find((c) => c.length === 5 && c.slice(0, 3) === job.noc.slice(0, 3))
    if (minor) {
      score += 30
      reasons.push({ rule: 'noc', verdict: 'pass', key: 'match.r.noc.minor', params: { noc: job.noc, yours: minor } })
    } else if (submajor) {
      score += 20
      reasons.push({ rule: 'noc', verdict: 'pass', key: 'match.r.noc.submajor', params: { noc: job.noc, yours: submajor } })
    } else {
      nocMiss = true
      reasons.push({ rule: 'noc', verdict: 'fail', key: 'match.r.noc.none', params: { noc: job.noc, yours: profile.nocCodes.join(' / ') } })
    }
  }

  // ── 规则 2:省通道(inclusion/exclusion 公开清单 × 目标省) ──
  const prov = (job.province || '').toUpperCase()
  if (prov === 'QC') {
    reasons.push({ rule: 'prov', verdict: 'na', key: 'match.r.prov.qc', params: {} })
  } else if (prov) {
    if (profile.targetProvinces.length > 0 && !profile.targetProvinces.includes(prov)) {
      // 2026-07-21 Frank 拍板:目标省不一致只提示不扣分(原 −10)——目标省是偏好不是资格,
      // 别把外省的对口好岗压到档线下;弹框「对我意味着什么」仍显示这条 warn
      reasons.push({ rule: 'prov', verdict: 'warn', key: 'match.r.prov.notTarget', params: { prov, targets: profile.targetProvinces.join('/') } })
    }
    const rows = dims.pnpOccupations.filter((r) => r.province === prov && r.noc === job.noc)
    const named = rows.find((r) => r.type !== 'ineligible')
    const excluded = rows.find((r) => r.type === 'ineligible')
    if (named) {
      score += 30
      reasons.push({ rule: 'prov', verdict: 'pass', key: 'match.r.prov.named', params: { prov, label: named.label, noc: job.noc }, source: { label: named.label, url: named.url, fetched: named.fetched } })
    } else if (excluded) {
      score -= 20
      reasons.push({ rule: 'prov', verdict: 'fail', key: 'match.r.prov.excluded', params: { prov, label: excluded.label, noc: job.noc }, source: { label: excluded.label, url: excluded.url, fetched: excluded.fetched } })
    } else if (job.pnpEligible) {
      score += 15
      reasons.push({ rule: 'prov', verdict: 'pass', key: 'match.r.prov.generic', params: { prov } })
    } else {
      score -= 10
      reasons.push({ rule: 'prov', verdict: 'fail', key: 'match.r.prov.none', params: { prov } })
    }
  }

  // ── 规则 3:EE 类别距离(上次类别抽选 CRS vs 自报 CRS) ──
  if (!job.eeCategory) {
    reasons.push({ rule: 'ee', verdict: 'na', key: 'match.r.ee.none', params: {} })
  } else {
    const row = dims.eeCategories.find((r) => r.noc === job.noc && r.drawCrs != null)
      || dims.eeCategories.find((r) => r.label === job.eeCategory && r.drawCrs != null)
    if (!row || row.drawCrs == null) {
      reasons.push({ rule: 'ee', verdict: 'na', key: 'match.r.ee.noDraw', params: { cat: job.eeCategory } })
    } else if (profile.crs == null) {
      reasons.push({ rule: 'ee', verdict: 'warn', key: 'match.r.ee.noCrs', params: { cat: row.label, draw: row.drawCrs, date: (row.drawDate || '').slice(0, 10) }, source: { label: row.label, url: row.url, fetched: row.fetched } })
    } else {
      const diff = profile.crs - row.drawCrs
      if (diff >= 0) {
        score += 20
        reasons.push({ rule: 'ee', verdict: 'pass', key: 'match.r.ee.above', params: { cat: row.label, crs: profile.crs, draw: row.drawCrs, date: (row.drawDate || '').slice(0, 10), diff }, source: { label: row.label, url: row.url, fetched: row.fetched } })
      } else {
        reasons.push({ rule: 'ee', verdict: 'warn', key: 'match.r.ee.below', params: { cat: row.label, crs: profile.crs, draw: row.drawCrs, date: (row.drawDate || '').slice(0, 10), gap: -diff }, source: { label: row.label, url: row.url, fetched: row.fetched } })
      }
    }
  }

  // ── 规则 4:TEER 可达(≤3 通用;4/5 须命中具名低 TEER 通道) ──
  if (job.teer != null) {
    if (job.teer <= 3) {
      score += 10
      reasons.push({ rule: 'teer', verdict: 'pass', key: 'match.r.teer.ok', params: { teer: job.teer } })
    } else if (job.pnpStream) {
      score += 10
      reasons.push({ rule: 'teer', verdict: 'pass', key: 'match.r.teer.channel', params: { teer: job.teer, stream: job.pnpStream } })
    } else {
      score -= 15
      reasons.push({ rule: 'teer', verdict: 'fail', key: 'match.r.teer.low', params: { teer: job.teer } })
    }
  }

  // ── 规则 5:工资信用(offer 可信度提示,低于当地中位太多在省提名工资要求上有风险) ──
  if (job.salaryAnnual != null && job.wageMedAnnual) {
    const pct = Math.round((job.salaryAnnual / job.wageMedAnnual - 1) * 100)
    if (pct >= 0) {
      score += 5
      reasons.push({ rule: 'wage', verdict: 'pass', key: 'match.r.wage.above', params: { pct } })
    } else if (pct >= -20) {
      reasons.push({ rule: 'wage', verdict: 'warn', key: 'match.r.wage.near', params: { pct: -pct } })
    } else {
      score -= 5
      reasons.push({ rule: 'wage', verdict: 'warn', key: 'match.r.wage.below', params: { pct: -pct } })
    }
  } else {
    reasons.push({ rule: 'wage', verdict: 'na', key: 'match.r.wage.na', params: {} })
  }

  // ── 规则 6:雇主外劳雇佣记录(E6-02;近两年获批 LMIA=雇主质量轴的历史事实)──
  // 轻加权:B4-02 起只认技能股(High Wage/GTS/PR-only)+5——Frank「有 LMIA 但没法移民」:
  // 农业/低薪股是季节性用工,给果园 +5 绿勾=误导技能类求职者;纯低股给中性提示行不加分。
  // skilled==null(列未回填)回退旧口径(全股别 +5),seed 回填后自动切新档。
  const lmiaSrc = { label: 'ESDC TFWP positive LMIA employers', url: 'https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97', fetched: '' }
  const skilled = job.lmiaPositionsSkilled
  if (job.lmiaPositions && job.lmiaPositions > 0) {
    if (skilled == null || skilled > 0) {
      score += 5
      reasons.push({
        rule: 'lmia', verdict: 'pass', key: skilled == null ? 'match.r.lmia.has' : 'match.r.lmia.skilled',
        params: skilled == null ? { n: job.lmiaPositions, q: job.lmiaLastQuarter || '' } : { n: skilled, total: job.lmiaPositions, q: job.lmiaLastQuarter || '' },
        source: lmiaSrc,
      })
    } else {
      reasons.push({
        rule: 'lmia', verdict: 'na', key: 'match.r.lmia.lowOnly',
        params: { n: job.lmiaPositions, q: job.lmiaLastQuarter || '' },
        source: lmiaSrc,
      })
    }
  } else {
    reasons.push({ rule: 'lmia', verdict: 'na', key: 'match.r.lmia.na', params: {} })
  }

  // 职业不对口封顶(2026-07-21 Frank「医疗/服务怎么也匹配进来了」):填了 NOC 却全不沾边的岗,
  // 省清单+TEER 撑出的分不算「与我的匹配」——封顶 low(匹配视图只收 high/mid,自然滤掉);
  // 档案没填 NOC(如只填 CRS)不受此限,照旧按分数分档。
  const level: MatchLevel = nocMiss ? 'low' : score >= 60 ? 'high' : score >= 30 ? 'mid' : 'low'
  return { level, score, reasons }
}

// 给 advisor(服务端 LLM prompt)用的英文事实行 —— 与 UI 三语同源(同一 reason 结构),数字一致。
const EN: Record<string, (p: Record<string, string | number>) => string> = {
  'match.r.noc.jobUncat': () => 'Job has no NOC classification; profile match not applicable.',
  'match.r.noc.noProfile': () => 'User has not listed their NOC codes.',
  'match.r.noc.exact': (p) => `User's own NOC ${p.noc} matches this job's NOC exactly.`,
  'match.r.noc.minor': (p) => `User's NOC ${p.yours} is in the same minor group as this job's NOC ${p.noc}.`,
  'match.r.noc.submajor': (p) => `User's NOC ${p.yours} is in the same occupational sub-major group as this job's NOC ${p.noc} (same field, different specialty).`,
  'match.r.noc.none': (p) => `Job NOC ${p.noc} does not match user's NOC (${p.yours}).`,
  'match.r.prov.qc': () => 'Quebec runs its own selection system (not PNP).',
  'match.r.prov.notTarget': (p) => `Job is in ${p.prov}, outside user's target provinces (${p.targets}).`,
  'match.r.prov.named': (p) => `Job NOC ${p.noc} is on ${p.prov}'s published list "${p.label}".`,
  'match.r.prov.excluded': (p) => `Job NOC ${p.noc} is on ${p.prov}'s exclusion list "${p.label}".`,
  'match.r.prov.generic': (p) => `Meets the generic TEER 0-3 screen for ${p.prov} (no named list hit).`,
  'match.r.prov.none': (p) => `Does not meet the provincial screen for ${p.prov}.`,
  'match.r.ee.none': () => 'Job NOC is not on any federal EE category-based selection list.',
  'match.r.ee.noDraw': (p) => `EE category "${p.cat}" has no recorded draw data.`,
  'match.r.ee.noCrs': (p) => `Job is in EE category "${p.cat}" (last draw CRS ${p.draw}, ${p.date}); user has not reported a CRS score.`,
  'match.r.ee.above': (p) => `User's self-reported CRS ${p.crs} is ${p.diff} above the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`,
  'match.r.ee.below': (p) => `User's self-reported CRS ${p.crs} is ${p.gap} below the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`,
  'match.r.teer.ok': (p) => `TEER ${p.teer} passes the generic skilled-worker screen.`,
  'match.r.teer.channel': (p) => `TEER ${p.teer} but hits named low-TEER stream "${p.stream}".`,
  'match.r.teer.low': (p) => `TEER ${p.teer} with no named low-TEER stream.`,
  'match.r.wage.above': (p) => `Offered salary is ${p.pct}% above the local NOC median.`,
  'match.r.wage.near': (p) => `Offered salary is ${p.pct}% below the local NOC median (within 20%).`,
  'match.r.wage.below': (p) => `Offered salary is ${p.pct}% below the local NOC median — verify the offer meets provincial wage requirements.`,
  'match.r.wage.na': () => 'No salary/median data to compare.',
  'match.r.lmia.has': (p) => `Employer had ${p.n} positions on approved positive LMIAs in the past two years (latest: ${p.q}, ESDC open data) — a historical fact, not an indication they can or will sponsor now.`,
  'match.r.lmia.skilled': (p) => `Employer had ${p.n} skilled-stream (High Wage/Global Talent) positions on approved LMIAs in the past two years (${p.total} across all streams, latest ${p.q}, ESDC open data) — a historical fact, not a sponsorship promise.`,
  'match.r.lmia.lowOnly': (p) => `Employer's ${p.n} approved LMIA positions (latest ${p.q}) are all in Primary Agriculture / Low Wage streams — mostly seasonal hiring, weak evidence for skilled-stream sponsorship; no points added.`,
  'match.r.lmia.na': () => 'No positive-LMIA record for this employer in the past two years (many employers never needed one; not negative evidence).',
}
export const reasonEn = (r: MatchReason): string => (EN[r.key] ? EN[r.key](r.params) : r.key)

// 分型 → 英文路径语境(E11-04):喂 advisor grounding,让顾问按读者真实处境措辞移民路径(修身份红线 #50)。
// 只陈述该分型的主路径事实,不预测成功率、不断言个人资格(与 match reason 的措辞红线一致)。
const STATUS_EN: Record<CurrentStatus, string> = {
  overseas: 'still outside Canada, applying from abroad — main path is federal Express Entry / FSW selected by CRS (no Canadian job offer required), plus overseas-friendly PNP streams',
  studying: 'currently studying in Canada — main path is graduate → PGWP → Canadian work experience → CEC / provincial nominee',
  working: 'working in Canada on a work permit — main path is accumulate Canadian experience → CEC / provincial nominee',
  jobhunting: 'in Canada as a graduate / PGWP holder looking for work — main path is landing a PNP-track job → provincial nominee',
  pr: 'already a permanent resident or does not need immigration — goal is simply finding a good job; de-emphasize immigration angles',
}
export const statusEn = (s: string | null | undefined): string | null =>
  s && STATUS_EN[s as CurrentStatus] ? STATUS_EN[s as CurrentStatus] : null
