/**
 * 方案计算器单测(C3;金标 = 2026-08-03 那场对话的 C01 木匠)。
 *
 * 为什么用 fixture 不连库(与 chatTools.int.spec 的取舍相反):buildPlan 是**纯算术**,
 * 它的正确性与库里此刻有多少行无关 —— 要锁的是「差值怎么算、unknown 怎么传染、
 * 出处没了会不会静默沿用」。连库反而测不稳(数据一变红,红得没有信息量)。
 * 库里真有什么由 chatTools 那组测;这里的 fixture **照 data/mart 真值抄**(2026-08-04),
 * 好让下面贴出来的月数就是生产会算出的月数。
 *
 * 金标场景:noc=72310 木匠、ON 毕业、expMonths=0、目标省 MB(中介推的)、对照 BC/SK/NS。
 */
import { describe, expect, it } from 'vitest'
import { LBL } from '@/lib/i18n'
import { lookupPlan, type DrawsResult, type Evidence, type OpsResult, type PlanResult, type ProvThresholds, type ThresholdRow, type ThresholdsResult } from '@/lib/chat/tools'
import { isPlanQuestion, sayFact } from '@/lib/chat/answer'
import { planFacts } from '@/lib/chat/facts'
import { findEnglishUnits, findForeignScript, findLeaks, findWordNumbers } from '@/lib/chat/guards'
import { factSheet } from '@/lib/chat/stream'
import { findHedges } from '@/lib/chat/traces'
import { buildPlan, type PlanPathInput } from '@/lib/planTimeline'
import { evaluateRequirements, type Requirement, type RuleProfile } from '@/lib/rules'

// ── fixture 工具 ────────────────────────────────────────────────────────────

const R = (o: Partial<Requirement>): Requirement => ({
  province: '', program: 'PNP', stream: '', subject: 'applicant',
  factor: '', op: '>=', value: null, valueText: '', unit: '', appliesTeer: '', appliesArea: '', familySize: null,
  basis: '', label: 'official text', section: '', effective: '',
  url: 'https://example.gov/req', pageUrl: '', fetched: '2026-08-04', ...o,
})

/** 照 lookupThresholds 的装配方式:官方门槛行 → rules.evaluateRequirements → ProvThresholds。
 *  短板差值(short)因此是**规则引擎真算的**,不是测试里手写的常数。 */
const provThresholds = (province: string, reqs: Requirement[], p: Partial<RuleProfile> = {}): ProvThresholds => {
  const profile: RuleProfile = {
    noc: '72310', teer: 2, clb: null, canadianExpMonths: 0, totalExpMonths: 0,
    familySize: null, annualIncome: null, incomeIsOccMedian: true, area: null, ...p,
  }
  const rows: ThresholdRow[] = evaluateRequirements(reqs.map((r) => ({ ...r, province })), profile)
    .map((r) => ({
      factor: r.factor, subject: r.subject, verdict: r.verdict,
      need: r.need, needLow: r.needLow, have: r.have, short: r.short, unit: r.unit,
      evidence: { url: r.evidence.url, fetched: r.evidence.fetched, label: r.evidence.label, section: r.evidence.section, effective: r.evidence.effective },
    }))
    .filter((r) => !!r.evidence.url)
  return { province, availability: rows.length ? 'ok' : 'not-collected', rows }
}

const EV = (url: string): Evidence => ({ url, fetched: '2026-08-04', label: 'official' })

// 官方门槛真值(data/mart/pnp_requirements.json,2026-08-04)
const SK_REQS = [
  R({ stream: 'SINP International Skilled Worker', factor: 'experience', value: 12, unit: 'months', url: 'https://www.saskatchewan.ca/sinp-isw' }),
  R({ factor: 'language', value: 4, unit: 'CLB', url: 'https://www.saskatchewan.ca/sinp-isw' }),
]
const BC_REQS = [
  R({ stream: 'BC PNP Skilled Worker stream', factor: 'experience', value: 24, unit: 'months', url: 'https://www.welcomebc.ca/guide' }),
  R({ factor: 'language', value: 4, unit: 'CLB', appliesTeer: '2,3,4,5', url: 'https://www.welcomebc.ca/guide' }),
]
const NS_REQS = [R({ stream: 'NSNP Skilled Worker', factor: 'experience', value: 12, unit: 'months', url: 'https://novascotiaimmigration.com/sw' })]
// 🔴 MB 库里**没有** experience 行(只有 language×159 与雇主 empYears)—— 这不是 fixture 偷懒,是现状
const MB_REQS = [
  R({ stream: 'MPNP In-Demand Occupations List', factor: 'language', value: 6, unit: 'CLB', appliesTeer: '2', url: 'https://immigratemanitoba.com/idol' }),
  R({ stream: 'MPNP Employer Direct Initiative (EDI)', subject: 'employer', factor: 'empYears', value: 3, unit: 'years', url: 'https://immigratemanitoba.com/edi' }),
]

/** MB 官方逐轮抽选:两周一轮(immigratemanitoba.com/draws/ 真值节奏) */
const drawsOf = (province: string, dates: string[]): DrawsResult => ({
  province, availability: 'ok',
  rows: dates.map((d) => ({ province, drawDate: d, stream: 'Skilled Worker Stream', score: null, scale: 'MPNP EOI', invitations: 74, evidence: EV(`https://immigrate${province}.com/draws/`) })),
})
const MB_DRAWS = drawsOf('MB', ['2026-07-30', '2026-07-16', '2026-07-02', '2026-06-18', '2026-06-04', '2026-05-21'])
const BC_DRAWS = drawsOf('BC', ['2026-07-29', '2026-07-01', '2026-06-03', '2026-05-06'])   // 28 天一轮
const SK_DRAWS: DrawsResult = { province: 'SK', availability: 'not-published', rows: [], note: 'SINP 不公布逐轮抽选记录;Employment Offer 子类不递 EOI、不进池' }
const NS_DRAWS: DrawsResult = { province: 'NS', availability: 'not-collected', rows: [], note: '本站未收录 NS 抽选记录' }

const SK_EOI_URL = 'https://www.saskatchewan.ca/.../international-skilled-worker-eoi-system'
const opsMetric = (o: Partial<OpsResult['metrics'][number]> & { key: string }) => ({
  key: o.key, scope: o.scope ?? '', scopeKind: o.scopeKind ?? 'category', streamKey: '', label: o.label ?? '',
  value: o.value ?? null, valueText: o.valueText ?? '', unit: o.unit ?? 'weeks', asOf: '', period: '2026Q2',
  evidence: o.evidence ?? EV('https://www.saskatchewan.ca/sinp-processing-statistics'),
})
// SK 官方按通道分别公布处理时长(真值:Employment Offer 2 周、Second Review without offer = "N/A")
const SK_OPS: OpsResult = {
  province: 'SK', availability: 'ok', officialUrl: 'https://www.saskatchewan.ca/sinp-processing-statistics', note: '',
  metrics: [
    opsMetric({ key: 'processing_weeks', scope: 'Employment Offer', label: 'International Skilled Worker: Employment Offer', value: 2 }),
    opsMetric({ key: 'processing_weeks', scope: 'Existing Work Permit', label: 'Saskatchewan Experience: Existing Work Permit', value: 2 }),
    opsMetric({ key: 'processing_weeks', scope: 'Applicants without Job Offers', label: 'Second Review: Applicants without Job Offers', value: null, valueText: 'N/A' }),
  ],
}
const MB_OPS: OpsResult = { province: 'MB', availability: 'not-published', officialUrl: 'https://immigratemanitoba.com/', note: 'MB 官方不发处理时长/池子统计', metrics: [] }
// BC 有运营统计(SIRS 池分布)但**没有处理时长这一项** —— 整体 ok ≠ 这项有
const BC_OPS: OpsResult = {
  province: 'BC', availability: 'ok', officialUrl: 'https://www.welcomebc.ca/invitations-to-apply', note: '',
  metrics: [opsMetric({ key: 'sirs_pool', scope: '120-129', scopeKind: 'scoreRange', label: 'SIRS 120-129', value: 412, unit: 'people', evidence: EV('https://www.welcomebc.ca/invitations-to-apply') })],
}
const NS_OPS: OpsResult = { province: 'NS', availability: 'not-collected', officialUrl: '', note: '本站未核实 NS 是否公布运营统计', metrics: [] }

const THRESHOLDS: ThresholdsResult = {
  noc: '72310', title: 'Carpenters', teer: 2,
  provinces: [provThresholds('SK', SK_REQS), provThresholds('MB', MB_REQS), provThresholds('BC', BC_REQS), provThresholds('NS', NS_REQS)],
}
const PATHS = (): PlanPathInput[] => [
  { province: 'SK', stream: 'SINP ISW — Employment Offer', thresholds: null, draws: SK_DRAWS, ops: SK_OPS, noDrawStep: { evidence: EV(SK_EOI_URL) }, processingScope: 'Employment Offer' },
  { province: 'MB', stream: 'MPNP Skilled Worker Overseas', thresholds: null, draws: MB_DRAWS, ops: MB_OPS },
  { province: 'BC', stream: 'BC PNP Skilled Worker', thresholds: null, draws: BC_DRAWS, ops: BC_OPS },
  { province: 'NS', stream: 'NSNP Skilled Worker', thresholds: null, draws: NS_DRAWS, ops: NS_OPS },
]
const plan = () => buildPlan({ thresholds: THRESHOLDS, paths: PATHS() })
const pathOf = (p: ReturnType<typeof plan>, prov: string) => [...p.ranked, ...p.partial].find((x) => x.province === prov)!
const stepOf = (p: ReturnType<typeof plan>, prov: string, kind: string, factor?: string) =>
  pathOf(p, prov).steps.find((s) => s.kind === kind && (factor == null || s.factor === factor))!

// ── 测试 ────────────────────────────────────────────────────────────────────

describe('C3 方案计算器 buildPlan(金标 C01 木匠 72310)', () => {
  it('每一段都挂得住出处:凡是算出月数的段,evidence.url 必非空', () => {
    const p = plan()
    const all = [...p.ranked, ...p.partial].flatMap((x) => x.steps)
    expect(all.length).toBeGreaterThan(0)
    for (const s of all) {
      if (s.months != null) expect(s.evidence?.url, `${s.kind}/${s.factor} 有月数却没出处`).toBeTruthy()
      else expect(s.why, `${s.kind}/${s.factor} 算不出却没说为什么`).toBeTruthy()
    }
  })

  it('差值算术:SK 经验门槛 12 个月、have 0 → 缺口 12 个月,basis 说得出这数从哪来', () => {
    const p = plan()
    const gap = stepOf(p, 'SK', 'gap', 'experience')
    expect(gap.months).toBe(12)
    expect(gap.basis).toContain('12')
    expect(gap.evidence?.url).toBe('https://www.saskatchewan.ca/sinp-isw')
    expect(stepOf(p, 'BC', 'gap', 'experience').months).toBe(24)   // 24 个月门槛 → 24
  })

  it('SK 全段确定:12(经验)+ 0(官方明示不进池)+ 0.5(2 周处理)= 12.5 个月', () => {
    const p = plan()
    const sk = pathOf(p, 'SK')
    expect(sk.timelineCertainty).toBe('complete')
    expect(sk.totalMonths).toBe(12.5)
    expect(stepOf(p, 'SK', 'draw').months).toBe(0)
    expect(stepOf(p, 'SK', 'draw').availability).toBe('not-applicable')
    expect(stepOf(p, 'SK', 'processing').months).toBe(0.5)
  })

  it('有 unknown 段的路径不进「可确定」组,且 totalMonths 恒 null(下界不冒充总数)', () => {
    const p = plan()
    expect(p.ranked.map((x) => x.province)).toEqual(['SK'])
    expect(p.partial.map((x) => x.province)).toEqual(['MB', 'NS', 'BC'])   // 按下界升序 0.5 / 12 / 24.9
    for (const x of p.partial) {
      expect(x.totalMonths).toBeNull()
      expect(x.unknownSteps.length).toBeGreaterThan(0)
      expect(x.determinedMonths).toBeGreaterThanOrEqual(0)
    }
  })

  it('反向断言:库里没有处理时长的省不会凭空长出一个月数', () => {
    const p = plan()
    // MB:官方**不公布** —— 不是本站没查
    const mb = stepOf(p, 'MB', 'processing')
    expect(mb.months).toBeNull()
    expect(mb.availability).toBe('not-published')
    // BC:官方运营统计有(SIRS 池),但**没有处理时长这一项** → not-collected,不许沿用整体的 ok
    const bc = stepOf(p, 'BC', 'processing')
    expect(bc.months).toBeNull()
    expect(bc.availability).toBe('not-collected')
    // NS:抽选与处理时长两段都算不出
    expect(pathOf(p, 'NS').unknownSteps.map((s) => s.kind).sort()).toEqual(['draw', 'processing'])
    // 全场没有任何一段用 0 冒充「不知道」(draw 的 0 是官方明示不进池,带 not-applicable + 出处)
    const zeros = [...p.ranked, ...p.partial].flatMap((x) => x.steps).filter((s) => s.months === 0)
    for (const z of zeros) { expect(z.availability).toBe('not-applicable'); expect(z.evidence?.url).toBeTruthy() }
  })

  it('反向验证 ①:抽掉 SK 处理时长那行的 evidence → 这一段判不可用,SK 掉出可确定组(不静默沿用)', () => {
    const paths = PATHS()
    const ops = paths[0].ops!
    paths[0] = { ...paths[0], ops: { ...ops, metrics: ops.metrics.map((m) => (m.scope === 'Employment Offer' ? { ...m, evidence: { ...m.evidence, url: '' } } : m)) } }
    const p = buildPlan({ thresholds: THRESHOLDS, paths })
    expect(p.ranked).toHaveLength(0)                                   // 原本唯一的可确定路径没了
    const sk = pathOf(p, 'SK')
    expect(sk.totalMonths).toBeNull()
    const proc = sk.steps.find((s) => s.kind === 'processing')!
    expect(proc.months).toBeNull()
    expect(proc.why).toContain('出处')
    expect(p.comparisons).toHaveLength(0)                              // 比不出来就不比
  })

  it('反向验证 ②:noDrawStep 没有出处时,不许拿「库里没抽选记录」推成「不用抽选」', () => {
    const paths = PATHS()
    paths[0] = { ...paths[0], noDrawStep: { evidence: { url: '', fetched: '' } } }
    const p = buildPlan({ thresholds: THRESHOLDS, paths })
    const draw = pathOf(p, 'SK').steps.find((s) => s.kind === 'draw')!
    expect(draw.months).toBeNull()
    expect(draw.availability).toBe('not-published')                    // 沿用 lookupDraws 的四态,不改判
    expect(draw.why).toBeTruthy()
    expect(pathOf(p, 'SK').timelineCertainty).toBe('partial')
  })

  it('语言差档不许换算成月(考多久本站没有官方数据),但差几档照说', () => {
    const th: ThresholdsResult = { ...THRESHOLDS, provinces: [provThresholds('SK', SK_REQS, { clb: 3 }), ...THRESHOLDS.provinces.slice(1)] }
    const p = buildPlan({ thresholds: th, paths: PATHS() })
    const lang = pathOf(p, 'SK').steps.find((s) => s.factor === 'language')!
    expect(lang.months).toBeNull()
    expect(lang.why).toContain('语言')
    expect(pathOf(p, 'SK').timelineCertainty).toBe('partial')
    // 差几档仍在门槛行里(rules.ts 算的 short=1),本层只是拒绝把它变成月
    const row = th.provinces[0].rows.find((r) => r.factor === 'language')!
    expect(row.verdict).toBe('fail'); expect(row.short).toBe(1)
  })

  it('抽选段回答「官方多久开一轮」,不是「你要等几轮被抽中」(不做概率)', () => {
    const p = plan()
    const mb = stepOf(p, 'MB', 'draw')
    expect(mb.months).toBe(0.5)                                        // 14 天 / 30.4375
    expect(mb.basis).toContain('14 天')
    expect(mb.basis).toContain('不是')
    // Plan 结构里不存在任何概率/成功率字段
    expect(JSON.stringify(p)).not.toMatch(/probability|chance|odds|successRate/i)
  })

  it('只有一轮记录 / 无记录时算不出节奏', () => {
    const paths = PATHS()
    paths[1] = { ...paths[1], draws: drawsOf('MB', ['2026-07-30']) }
    const p = buildPlan({ thresholds: THRESHOLDS, paths })
    const d = stepOf(p, 'MB', 'draw')
    expect(d.months).toBeNull(); expect(d.why).toContain('1 轮')
  })

  it('省内多条通道处理时长又没指明走哪条 → 不替你挑;官方 "N/A" 不折成 0', () => {
    const paths = PATHS()
    paths[0] = { ...paths[0], processingScope: undefined }
    let p = buildPlan({ thresholds: THRESHOLDS, paths })
    expect(stepOf(p, 'SK', 'processing').months).toBeNull()
    expect(stepOf(p, 'SK', 'processing').why).toContain('不替你挑')
    // 指到官方写 "N/A" 的那条:value=null 原样,不许折成 0 周
    paths[0] = { ...paths[0], processingScope: 'Applicants without Job Offers' }
    p = buildPlan({ thresholds: THRESHOLDS, paths })
    expect(stepOf(p, 'SK', 'processing').months).toBeNull()
    expect(stepOf(p, 'SK', 'processing').why).toContain('N/A')
    // 指一个官方根本没有的口径
    paths[0] = { ...paths[0], processingScope: '不存在的通道' }
    p = buildPlan({ thresholds: THRESHOLDS, paths })
    expect(stepOf(p, 'SK', 'processing').why).toContain('没有')
  })

  it('快慢差:全确定的 SK 只与「下界已经超过它」的路径比,且标明是 atLeast', () => {
    const p = plan()
    expect(p.comparisons).toHaveLength(1)
    const c = p.comparisons[0]
    expect(c).toMatchObject({ fasterProvince: 'SK', slowerProvince: 'BC', kind: 'atLeast' })
    expect(c.monthsDelta).toBe(12.4)                                   // BC 下界 24.9 − SK 12.5
    expect(c.basis).toContain('24.9')
    // MB(下界 0.5)与 NS(下界 12)都没超过 SK 的 12.5 → 一句都不许说
    expect(p.comparisons.some((x) => x.slowerProvince === 'MB' || x.slowerProvince === 'NS')).toBe(false)
  })

  it('两条都全确定时给 exact 差值,组内按总月数升序', () => {
    const paths = PATHS()
    paths[1] = { ...paths[1], ops: { ...MB_OPS, availability: 'ok', metrics: [opsMetric({ key: 'processing_weeks', scope: 'SWO', label: 'MPNP SWO', value: 26, evidence: EV('https://immigratemanitoba.com/processing') })] }, processingScope: 'SWO' }
    const p = buildPlan({ thresholds: THRESHOLDS, paths })
    // MB 无经验门槛行 → 只有 0.5(两周一轮)+ 6(26 周处理)= 6.5;SK 12.5 → 升序 MB 在前
    expect(p.ranked.map((x) => x.province)).toEqual(['MB', 'SK'])
    expect(p.ranked.map((x) => x.totalMonths)).toEqual([6.5, 12.5])
    const exact = p.comparisons.filter((c) => c.kind === 'exact')
    expect(exact).toHaveLength(1)
    expect(exact[0]).toMatchObject({ fasterProvince: 'MB', slowerProvince: 'SK', monthsDelta: 6 })
  })

  it('金额只并列不相减:官方规费与中介报价各自成列,Plan 里没有任何差额字段', () => {
    const p = buildPlan({
      thresholds: THRESHOLDS, paths: PATHS(),
      officialCosts: [{ label: 'Principal applicant — processing + RPRF', amount: 1590, unit: 'CAD', evidence: EV('https://ircc.canada.ca/english/information/fees/fees.asp') }],
      quotedCosts: [{ label: '中介服务费', amount: 20000, unit: 'CAD', text: '中介说包成功 2 万', source: '用户转述' }],
    })
    expect(p.officialCosts[0].amount).toBe(1590)
    expect(p.quotedCosts[0].amount).toBe(20000)
    expect(JSON.stringify(p)).not.toMatch(/saved|saving|diffAmount|netCost/i)
  })

  it('门槛判不了的项进 unresolved,不计月数(时间线的确定性 ≠ 资格的确定性)', () => {
    const p = plan()
    const sk = pathOf(p, 'SK')
    expect(sk.unresolved.map((u) => u.factor)).toContain('language')    // clb 未知 → unknown
    expect(sk.unresolved.every((u) => !!u.evidence.url)).toBe(true)
    expect(sk.timelineCertainty).toBe('complete')                       // unresolved 不把时间线拖成 partial
    const mb = pathOf(p, 'MB')
    expect(mb.unresolved.map((u) => u.factor)).toContain('empYears')    // 雇主侧事实本站没有
  })

  it('纯函数:同一份输入跑两次结果全等,且不改动入参', () => {
    const paths = PATHS()
    const before = JSON.stringify(paths)
    const a = buildPlan({ thresholds: THRESHOLDS, paths })
    const b = buildPlan({ thresholds: THRESHOLDS, paths })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(paths)).toBe(before)
  })
})

// ── 接进对话:C1 的 lookupPlan(装配)+ C2 的 planFacts(回填)────────────────────
//
// 这两层加起来就是「buildPlan 有没有真的被人调用」。同样**不连库**:
// lookupPlan 收一个 pool,拿一个「查什么都返回空」的桩喂它 —— 空库正是最该测的那一格
// (库里一行都没有时,时间线**必须**一个月数都长不出来;长出来了就是编)。
// 有数据那一格由 planFacts 测:它是纯函数,直接吃上面那份 fixture 算出的 Plan。
describe('C3 接进对话:lookupPlan + planFacts', () => {
  /** 查什么都没有的库(全部 SELECT 返回空行)。真库里有什么由 chatTools.int.spec 那组连库测。 */
  const emptyPool = { query: async () => ({ rows: [] }) }

  it('空库:三段一个都算不出 → not-collected,且没有任何月数被凭空造出来', async () => {
    const r = await lookupPlan(emptyPool, { noc: '72310', provs: ['MB', 'SK'] })
    expect(r.availability).toBe('not-collected')
    const steps = [...r.plan.ranked, ...r.plan.partial].flatMap((p) => p.steps)
    expect(steps.length).toBeGreaterThan(0)                       // 段是摆出来的(说清哪段算不出),只是没有数
    expect(steps.filter((s) => s.months != null)).toHaveLength(0)
    expect(steps.every((s) => !!s.why)).toBe(true)                // 算不出必须说为什么
    expect(r.plan.ranked).toHaveLength(0)                         // 没有一条路敢称「全段确定」
    expect(r.plan.comparisons).toHaveLength(0)                    // 更不许比快慢
    expect(r.note).toContain('本站算不出')
    expect(JSON.stringify(r)).not.toMatch(/probability|chance|odds/i)
  })

  it('只点魁省 → not-applicable(魁省不走 PNP),不是「本站没收录」', async () => {
    const r = await lookupPlan(emptyPool, { noc: '72310', provs: ['QC'] })
    expect(r.availability).toBe('not-applicable')
    expect(r.plan.ranked).toHaveLength(0)
    expect(r.plan.partial).toHaveLength(0)
    expect(r.note).toContain('魁省')
  })

  /** 只认 pnp_ops_stats 的桩:SK 官方按两条通道**分别**公布处理时长(其余表照旧空)。 */
  const opsRow = (scope: string) => ({
    metric: 'processing_weeks', scope, scope_kind: 'category', label: `ISW: ${scope}`, value: 2, unit: 'weeks',
    period: '2026Q2', url: 'https://www.saskatchewan.ca/sinp-processing-statistics', fetched: '2026-08-04',
  })
  const opsPool = {
    query: async (sql: string) =>
      (/pnp_ops_stats/.test(sql) ? { rows: [opsRow('Employment Offer'), opsRow('Existing Work Permit')] } : { rows: [] }),
  }

  it('装配即红线:不替官方宣布「不用抽选」、不替用户挑通道(用户说了才传)', async () => {
    // noDrawStep/processingScope 这两个字段 buildPlan 认,但只有**官方原文写了不进池 / 用户说了走哪条**
    // 才配填。lookupPlan 只按省装配,自作主张填一个,下面的月数就没有依据了。
    const r = await lookupPlan(emptyPool, { noc: '72310', provs: ['SK'] })
    const draw = [...r.plan.ranked, ...r.plan.partial][0].steps.find((s) => s.kind === 'draw')!
    expect(draw.availability).not.toBe('not-applicable')   // 「库里没抽选记录」不许推成「不用抽选」
    expect(draw.months).toBeNull()
    // 省内两条通道各有各的处理时长、又没指明走哪条 → 不替你挑(宁可这一段算不出)
    const guess = await lookupPlan(opsPool, { noc: '72310', provs: ['SK'] })
    const p0 = guess.plan.partial[0].steps.find((s) => s.kind === 'processing')!
    expect(p0.months).toBeNull()
    expect(p0.why).toContain('不替你挑')
    // 用户说了走哪条 → 照传,这一段才落地(2 周 = 0.5 个月)
    const scoped = await lookupPlan(opsPool, { noc: '72310', provs: ['SK'], processingScope: { SK: 'Employment Offer' } })
    const p1 = scoped.plan.partial[0].steps.find((s) => s.kind === 'processing')!
    expect(p1.factor).toBe('Employment Offer')
    expect(p1.months).toBe(0.5)
    expect(p1.evidence?.url).toContain('saskatchewan.ca')
  })

  // ── planFacts:Plan → Fact[](数字一个不新增,出处该挂的挂、该空的空)────────────
  const RESULT = (): PlanResult => ({ noc: '72310', availability: 'ok', scope: '口径', plan: plan(), note: '' })

  it('facts 里的每个数字都来自 Plan,一个都不许是这一层算的', () => {
    const p = plan()
    const allowed = new Set<number>()
    for (const x of [...p.ranked, ...p.partial]) {
      for (const s of x.steps) if (s.months != null) allowed.add(s.months)
      if (x.totalMonths != null) allowed.add(x.totalMonths)
      allowed.add(x.determinedMonths)
    }
    for (const c of p.comparisons) allowed.add(c.monthsDelta)
    const facts = planFacts(RESULT(), 'zh')
    expect(facts.length).toBeGreaterThan(0)
    for (const f of facts) if (f.value != null) expect(allowed.has(f.value), `${f.label} 的 ${f.value} 不在 Plan 里`).toBe(true)
  })

  it('🔴 下界不冒充总数:全段确定的 SK 给总数,含未知段的 MB 只给下界,名目上就分得开', () => {
    const facts = planFacts(RESULT(), 'zh')
    const T = LBL.zh
    expect(facts.find((f) => f.label === `SK ${T.planTotal}`)!.value).toBe(12.5)
    expect(facts.some((f) => f.label === `MB ${T.planTotal}`)).toBe(false)
    const mb = facts.find((f) => f.label === `MB ${T.planLower}`)!
    expect(mb.value).toBe(0.5)
    expect(mb.label).toContain('下界')
  })

  it('快慢差只说两条路都摆出来了的那一对(读者看不见的省,「至少快 N 个月」没有着落)', () => {
    // 四条路时 BC 排在第四、没摆出来 → 那条 SK-BC 的快慢差也不说
    expect(planFacts(RESULT(), 'zh').some((f) => f.label.includes('比'))).toBe(false)
    // 去掉 NS 后 BC 进了前三 → 这条才说,措辞照 buildPlan 的口径(atLeast → 「至少」)
    const r3: PlanResult = { ...RESULT(), plan: buildPlan({ thresholds: THRESHOLDS, paths: PATHS().filter((p) => p.province !== 'NS') }) }
    const cmp = planFacts(r3, 'zh').find((f) => f.label.includes('比'))!
    expect(cmp.label).toBe(LBL.zh.faster('SK', 'BC', true))
    expect(cmp.value).toBe(12.4)
  })

  it('🔴 分段挂出处、合计不借出处:算术自己没有官网可指,宁可不进出处区也不借一段的 url', () => {
    const facts = planFacts(RESULT(), 'zh')
    const T = LBL.zh
    for (const f of facts) {
      const derived = f.label.includes(T.planTotal) || f.label.includes(T.planLower) || f.label.includes('比')
      if (f.value != null && !derived) expect(f.evidence.url, `${f.label} 有月数却没出处`).toBeTruthy()
      if (derived) expect(f.evidence.url, `${f.label} 借了别人的出处`).toBe('')
    }
    // 至少有一条分段是挂着官方页的(否则上面那条断言可能空转)
    expect(facts.filter((f) => f.value != null && f.evidence.url).length).toBeGreaterThan(0)
  })

  it('算不出的段照样出一行四态,value 恒空(少说一段,读者就会把下界当总数)', () => {
    const facts = planFacts(RESULT(), 'zh')
    const status = facts.filter((f) => f.unit === 'status')
    expect(status.length).toBeGreaterThan(0)
    for (const f of status) {
      expect(f.value).toBeNull()
      expect(f.valueText).toBeTruthy()
    }
    // MB 处理时长:官方不公布 —— 不许说成「本站未收录」(两句话在用户那里意思相反)
    const mb = status.find((f) => f.label === `MB ${LBL.zh.planProc}`)!
    expect(mb.valueText).toContain('官方不公布')
  })

  it('整条时间线算不出时:只出一行四态,一个数字都不出', () => {
    const facts = planFacts({ noc: '72310', availability: 'not-collected', scope: '', plan: plan(), note: '本站算不出' }, 'zh')
    expect(facts).toHaveLength(1)
    expect(facts[0].value).toBeNull()
    expect(facts[0].valueText).toContain('本站尚未收录')
  })

  it('三语都见客:没有内部码、没有英文速记、没有别的语言、没有推断性措辞', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const facts = planFacts(RESULT(), lang)
      const sheet = factSheet(facts, lang)
      expect(findLeaks(sheet), `${lang} 时间线泄露内部码:\n${sheet}`).toEqual([])
      expect(findEnglishUnits(sheet, lang, facts), `${lang} 时间线裸着英文速记:\n${sheet}`).toEqual([])
      expect(findForeignScript(sheet, lang), `${lang} 时间线掺了别的语言:\n${sheet}`).toEqual([])
      expect(findWordNumbers(sheet, lang), `${lang} 时间线把数量写成了中文数字:\n${sheet}`).toEqual([])
      expect(findHedges(sheet, lang), `${lang} 时间线里有推断性措辞:\n${sheet}`).toEqual([])
      // 口径注(unit='note')进得了 prompt 却不进 factSheet —— 那道检查照不到它,这里按**说出来的样子**再查一遍
      const spoken = facts.map((f) => sayFact(f, lang)).join('\n')
      expect(findLeaks(spoken), `${lang} 时间线原文泄露内部码:\n${spoken}`).toEqual([])
      expect(findEnglishUnits(spoken, lang, facts), `${lang} 时间线原文裸着英文速记:\n${spoken}`).toEqual([])
      expect(findForeignScript(spoken, lang), `${lang} 时间线原文掺了别的语言:\n${spoken}`).toEqual([])
      // 一条 fact 渲染出来是一句话(名目 + 冒号 + 值),不是一行表格
      expect(spoken).not.toContain('=')
    }
  })

  it('触发判据:问「要多久 / 哪条更快」才算时间线,问概率不算(那条路是拒答)', () => {
    for (const q of ['我这条路大概要多久?', 'How long does this take end to end?', 'which province is faster for me',
      '走哪条更快', '얼마나 걸리나요']) expect(isPlanQuestion(q), q).toBe(true)
    for (const q of ['曼省清单收了木匠吗?', 'What are my odds of being picked?', '中介要收 2 万值不值'])
      expect(isPlanQuestion(q), q).toBe(false)
  })

  it('🔴 抽选段的两种 0 不许共用一个名目:「官方明示不进池」不能读成「平均每 0 个月开一轮」', () => {
    // 中文有 basis 兜着,英文只剩名目 + 数字 —— 名目错了,那一行本身就是一句假话
    for (const lang of ['zh', 'en'] as const) {
      const T = LBL[lang]
      const facts = planFacts(RESULT(), lang)
      const sk = facts.find((f) => f.label === `SK ${T.planNoDraw}`)!
      expect(sk.value).toBe(0)
      expect(facts.some((f) => f.label === `SK ${T.planDraw}`)).toBe(false)
      // 真有节奏可算的省照旧用「平均间隔」那个名目
      expect(facts.find((f) => f.label === `MB ${T.planDraw}`)!.value).toBe(0.5)
    }
  })

  it('算术原文里的 `=` 不进见客文案(RULE 5b 禁它,模型会照抄,出口当场判违规)', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const f of planFacts(RESULT(), lang)) expect(`${f.label} ${f.valueText}`, f.label).not.toContain(' = ')
    }
  })
})
