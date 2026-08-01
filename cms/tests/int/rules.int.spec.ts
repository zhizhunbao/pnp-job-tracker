// 规则引擎单测(设计《规则引擎与题库配对-20260731》§8 的黄金三例:达标 / 差一档 / 未收录)。
// 纯函数,不需要 DB。这里锁的是**判定口径**,不是文案:
//   · unknown 是一等公民 —— 判不了就得是 unknown,绝不能滑成 pass 或 fail;
//   · 加拿大经验不够**不等于**总经验不够(官方要的是境内外都算)→ 只能 unknown;
//   · 收入表家庭人数/居住区域未知时,只有「最低那档都够不到」才敢判 fail(下界推理)。
import { describe, it, expect } from 'vitest'
import { normalizeProfile, type MatchDims } from '@/lib/match'
import { buildPrReport, gateReport, type ReportFacts } from '@/lib/report'
import { evaluateRequirements, type Requirement } from '@/lib/rules'

const dims: MatchDims = {
  pnpOccupations: [
    { province: 'BC', label: 'BC Health Authority stream', type: 'indemand', noc: '31301', url: 'https://gov.bc.ca/health', fetched: '2026-07-20' },
    { province: 'SK', label: 'SK health stream', type: 'indemand', noc: '31301', url: 'https://sk.ca/health', fetched: '2026-07-19' },
  ],
  eeCategories: [],
}

// 真实抓取值(bc-req.json 2026-06-10 版):CLB 4 / 1 人家庭 $31,264(大温)与 $26,057(其余)/ 24 个月 / 雇主 1 年 · 5 人 · 3 人
const R = (o: Partial<Requirement>): Requirement => ({
  province: 'BC', program: 'PNP', stream: 'BC PNP Skills Immigration (all streams)', subject: 'applicant',
  factor: '', op: '>=', value: null, valueText: '', unit: '', appliesTeer: '', appliesArea: '', familySize: null,
  basis: '', label: 'official text', section: '', effective: '2026-06-10',
  url: 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf', pageUrl: '', fetched: '2026-07-31', ...o,
})
const BC_REQS: Requirement[] = [
  R({ factor: 'language', op: '>=', value: 4, unit: 'CLB', appliesTeer: '2,3,4,5', section: '3.4' }),
  R({ factor: 'language', op: 'none', appliesTeer: '0,1', section: '3.4' }),
  R({ factor: 'income', value: 31264, unit: 'CAD/yr', appliesArea: 'metro-vancouver', familySize: 1, section: '3.10' }),
  R({ factor: 'income', value: 26057, unit: 'CAD/yr', appliesArea: 'rest-of-bc', familySize: 1, section: '3.10' }),
  R({ factor: 'income', value: 38922, unit: 'CAD/yr', appliesArea: 'metro-vancouver', familySize: 2, section: '3.10' }),
  R({ factor: 'income', value: 32437, unit: 'CAD/yr', appliesArea: 'rest-of-bc', familySize: 2, section: '3.10' }),
  R({ factor: 'experience', stream: 'BC PNP Skilled Worker stream', value: 24, unit: 'months', section: '4.1(c)' }),
  R({ subject: 'employer', factor: 'empYears', value: 1, unit: 'years', section: '6.7' }),
  R({ subject: 'employer', factor: 'empStaff', value: 5, unit: 'employees', appliesArea: 'metro-vancouver', section: '6.8' }),
  R({ subject: 'employer', factor: 'empStaff', value: 3, unit: 'employees', appliesArea: 'rest-of-bc', section: '6.8' }),
]
const P = (o: object = {}) => ({ teer: 2, clb: null, canadianExpMonths: null, familySize: null, annualIncome: null, incomeIsOccMedian: true, area: null, ...o }) as any
const byFactor = (rs: ReturnType<typeof evaluateRequirements>, f: string) => rs.find((r) => r.factor === f)!

describe('evaluateRequirements —— 判定口径', () => {
  it('语言达标:TEER 2 要 CLB 4,填了 8 → pass,不出差值', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ clb: 8 })), 'language')
    expect(r.verdict).toBe('pass')
    expect(r.need).toBe(4)
    expect(r.short).toBeNull()
  })

  it('语言差一档:填了 CLB 3 → fail 且 short=1(差值只算不发,免费层由 gate 摘掉)', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ clb: 3 })), 'language')
    expect(r.verdict).toBe('fail')
    expect(r.short).toBe(1)
  })

  it('没填语言档 → unknown,不许滑成 pass/fail', () => {
    expect(byFactor(evaluateRequirements(BC_REQS, P()), 'language').verdict).toBe('unknown')
  })

  it('TEER 0/1 走官方的「注册时不要求」行(op=none),need 为空', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ teer: 1, clb: null })), 'language')
    expect(r.verdict).toBe('pass')
    expect(r.need).toBeNull()
  })

  it('收入:最低那档($26,057)都够不到 → fail,差值按最低档算', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ annualIncome: 24000 })), 'income')
    expect(r.verdict).toBe('fail')
    expect(r.short).toBe(26057 - 24000)
  })

  it('收入:高于大温档但家庭人数未知 → unknown(人多了门槛更高,不替他判达标)', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ annualIncome: 73000 })), 'income')
    expect(r.verdict).toBe('unknown')
    expect(r.need).toBe(31264)
    expect(r.needLow).toBe(26057)
  })

  it('收入:家庭人数已知(2 人)且高于大温档 → pass,并用 2 人档的阈值', () => {
    const r = byFactor(evaluateRequirements(BC_REQS, P({ annualIncome: 73000, familySize: 2, area: 'metro-vancouver' })), 'income')
    expect(r.verdict).toBe('pass')
    expect(r.need).toBe(38922)
  })

  it('经验:加拿大 30 个月 ≥ 24 → pass;只有 6 个月 → unknown(海外经验也算,不能判 fail)', () => {
    expect(byFactor(evaluateRequirements(BC_REQS, P({ canadianExpMonths: 30 })), 'experience').verdict).toBe('pass')
    expect(byFactor(evaluateRequirements(BC_REQS, P({ canadianExpMonths: 6 })), 'experience').verdict).toBe('unknown')
  })

  it('雇主侧两条恒为 unknown(本站没有雇主的经营年限与雇员数),阈值照摆', () => {
    const rs = evaluateRequirements(BC_REQS, P({ clb: 8 }))
    expect(byFactor(rs, 'empYears').verdict).toBe('unknown')
    const staff = byFactor(rs, 'empStaff')
    expect(staff.verdict).toBe('unknown')
    expect([staff.need, staff.needLow]).toEqual([5, 3])
  })

  it('未收录:传进来的那个省一条门槛都没有 → 一条结果都不出(由 builder 说「未收录」)', () => {
    expect(evaluateRequirements([], P({ clb: 8 }))).toHaveLength(0)
  })
})

// ── 报告层:门槛对照节 + 付费闸 ────────────────────────────────────────────
const facts = (o: Partial<ReportFacts>): ReportFacts => ({
  noc: '31301', title: 'Registered nurses', teer: 2,
  byProv: [{ province: 'BC', open: 17, named: 17, medianWage: 91000 }],
  draws: [], scoreProvinces: ['BC', 'SK'], requirements: BC_REQS, fetched: '2026-07-31', ...o,
})
const base = (over: object = {}) => normalizeProfile({ currentStatus: 'working', clb: 8, targetProvinces: ['BC'], ...over })

describe('报告「门槛对照」节', () => {
  it('BC 目标省 → 语言/收入/经验/雇主四类都出行,出处指官方指南', () => {
    const r = buildPrReport(base(), { canadianExpMonths: 30 }, dims, facts({}))
    expect(r.requirements.map((l) => l.key)).toEqual([
      'rpt.r.lang.pass', 'rpt.r.income.unknown', 'rpt.r.exp.pass', 'rpt.r.emp.years', 'rpt.r.emp.staff',
    ])
    expect(r.requirements[0].source?.url).toContain('welcomebc.ca')
  })

  it('未收录的省(SK 没有门槛行)→ 只出一句「本站未收录」,不拿 BC 的门槛套', () => {
    const r = buildPrReport(base({ targetProvinces: ['SK'] }), { canadianExpMonths: null }, dims, facts({}))
    expect(r.requirements.map((l) => l.key)).toEqual(['rpt.r.none'])
    expect(r.requirements[0].params.prov).toBe('SK')
  })

  it('免费层:差一档的语言行摘掉差值并挂锁行;Pro 层保留差值、不挂锁行', () => {
    const built = buildPrReport(base({ clb: 3 }), { canadianExpMonths: 30 }, dims, facts({}))
    const free = gateReport(built, false)
    const langFree = free.requirements.find((l) => l.key.startsWith('rpt.r.lang'))!
    expect(langFree.key).toBe('rpt.r.lang.failFree')
    expect(langFree.params.short).toBeUndefined()
    expect(free.locked[0]).toBe('req')

    const pro = gateReport(built, true)
    const langPro = pro.requirements.find((l) => l.key.startsWith('rpt.r.lang'))!
    expect(langPro.key).toBe('rpt.r.lang.fail')
    expect(langPro.params.short).toBe(1)
    expect(pro.locked).toHaveLength(0)
  })

  it('门槛全过时不挂锁行(没有「差多少」可卖就不卖)', () => {
    const free = gateReport(buildPrReport(base(), { canadianExpMonths: 30 }, dims, facts({})), false)
    expect(free.locked).not.toContain('req')
  })
})
