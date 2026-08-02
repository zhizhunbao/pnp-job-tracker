// 规则引擎单测(设计《规则引擎与题库配对-20260731》§8 的黄金三例:达标 / 差一档 / 未收录)。
// 纯函数,不需要 DB。这里锁的是**判定口径**,不是文案:
//   · unknown 是一等公民 —— 判不了就得是 unknown,绝不能滑成 pass 或 fail;
//   · 加拿大经验不够**不等于**总经验不够(官方要的是境内外都算)→ 只能 unknown;
//   · 收入表家庭人数/居住区域未知时,只有「最低那档都够不到」才敢判 fail(下界推理)。
import { describe, it, expect } from 'vitest'
import { normalizeProfile, type MatchDims } from '@/lib/match'
import { buildJobReport, buildPrReport, gateReport, type ReportFacts } from '@/lib/report'
import { areaOfPlace, employerBar, evaluateRequirements, type Requirement } from '@/lib/rules'

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
const P = (o: object = {}) => ({ teer: 2, clb: null, canadianExpMonths: null, totalExpMonths: null, familySize: null, annualIncome: null, incomeIsOccMedian: true, area: null, ...o }) as any
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

  it('经验:加拿大 30 个月 ≥ 24 → pass;只答加拿大 6 个月 → unknown(海外那截没问,不能判 fail)', () => {
    expect(byFactor(evaluateRequirements(BC_REQS, P({ canadianExpMonths: 30 })), 'experience').verdict).toBe('pass')
    expect(byFactor(evaluateRequirements(BC_REQS, P({ canadianExpMonths: 6 })), 'experience').verdict).toBe('unknown')
  })

  // 题库 20260802 补上总经验(含海外)之后,这条门槛**真的判得了**了 ——
  // 先前不够也只能出「本站只问了加拿大经验,判不了」,那一行等于没说(Frank 点名)
  it('经验:总经验(含海外)就是官方口径 —— 够→pass、不够→fail 带差值;都没答→unknown', () => {
    const pass = byFactor(evaluateRequirements(BC_REQS, P({ totalExpMonths: 60, canadianExpMonths: 6 })), 'experience')
    expect([pass.verdict, pass.have]).toEqual(['pass', 60])       // 两个都答:取大的那个(加拿大是子集)
    const fail = byFactor(evaluateRequirements(BC_REQS, P({ totalExpMonths: 6 })), 'experience')
    expect([fail.verdict, fail.short]).toEqual(['fail', 18])      // 24 - 6
    expect(byFactor(evaluateRequirements(BC_REQS, P()), 'experience').verdict).toBe('unknown')
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
  // 2026-08-03 收窄口径(#243,收费走查):这一节只留**他自己能动的**门槛。
  // 先前五行里四行是「跟你无关 / 我判不了」——「算的是全家收入,本站没问」、两条「这项只有雇主拿得出材料」——
  // 连着读下来只会得出「这网站判不了我的事」,而那正是他不掏钱的理由(设计:付费概率提升计划-20260803 §3 L4)。
  it('BC 目标省 → 只留他自己动得了的门槛(语言、经验);判不了的与雇主侧的都不占行', () => {
    const r = buildPrReport(base(), { canadianExpMonths: 30 }, dims, facts({}))
    expect(r.requirements.map((l) => l.key)).toEqual(['rpt.r.lang.pass', 'rpt.r.exp.pass'])
    expect(r.requirements[0].source?.url).toContain('welcomebc.ca')
    // 收入判不了(门槛是全家口径,题库没问家庭)→ 整行不出,不留「本站没问」那种自证判不了的话
    expect(r.requirements.some((l) => l.key.startsWith('rpt.r.income'))).toBe(false)
    // 雇主侧三项改由**雇主线索每一家**挂档位(employerBar),在那里对着具体公司看才可行动
    expect(r.requirements.some((l) => l.key.startsWith('rpt.r.emp'))).toBe(false)
  })

  // 2026-08-02 改口径(Frank「这条对照不了,那还显示干什么」):一行「我们没有数据」对读的人零价值
  it('未收录的省(SK 没有门槛行)→ 这一节一行都不出,更不拿 BC 的门槛套', () => {
    const r = buildPrReport(base({ targetProvinces: ['SK'] }), { canadianExpMonths: null }, dims, facts({}))
    expect(r.requirements).toEqual([])
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

// ── 第二刀:ON(OINP)—— 雇主侧三条 + 技工语言分档 + basis=occMedian 的工资档 ──────────
const ON_REQS: Requirement[] = [
  R({ province: 'ON', stream: 'Ontario Workforce Priority stream', factor: 'language', value: 6, unit: 'CLB', appliesTeer: '0,1,2,3' }),
  R({ province: 'ON', factor: 'language', value: 4, unit: 'CLB', appliesTeer: '4,5' }),
  // 技工低一档:官方大组白名单 + 两个排除组(726 / 932)
  R({ province: 'ON', factor: 'language', value: 5, unit: 'CLB', appliesTeer: '0,1,2,3', appliesNoc: '72,73,82,83,93,6320,62200', excludesNoc: '726,932' }),
  R({ province: 'ON', factor: 'languageExempt', op: 'none', value: 3, unit: 'years', appliesTeer: '0,1,2,3' }),
  R({ province: 'ON', factor: 'wage', op: '>=', basis: 'occMedian', unit: 'CAD/yr' }),
  R({ province: 'ON', subject: 'employer', factor: 'empYears', value: 3, unit: 'years' }),
  R({ province: 'ON', subject: 'employer', factor: 'empRevenue', value: 1000000, unit: 'CAD/yr', appliesArea: 'gta' }),
  R({ province: 'ON', subject: 'employer', factor: 'empRevenue', value: 500000, unit: 'CAD/yr', appliesArea: 'on-listed-cd' }),
  R({ province: 'ON', subject: 'employer', factor: 'empRevenue', value: 250000, unit: 'CAD/yr', appliesArea: 'on-other' }),
  R({ province: 'ON', subject: 'employer', factor: 'empStaff', value: 5, unit: 'employees', appliesArea: 'gta' }),
  R({ province: 'ON', subject: 'employer', factor: 'empStaff', value: 3, unit: 'employees', appliesArea: 'outside-gta' }),
]

describe('ON(OINP)—— 雇主侧与技工分档', () => {
  it('技工职业(NOC 72xxx)走低一档 CLB 5,不走通用的 CLB 6', () => {
    const r = byFactor(evaluateRequirements(ON_REQS, P({ noc: '72200', teer: 2, clb: 5 })), 'language')
    expect([r.need, r.verdict]).toEqual([5, 'pass'])
  })

  it('非技工职业走通用 CLB 6;同样填 CLB 5 就是差一档', () => {
    const r = byFactor(evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, clb: 5 })), 'language')
    expect([r.need, r.verdict, r.short]).toEqual([6, 'fail', 1])
  })

  it('排除组(Sub-Major 726)不算技工 —— 官方原文的 excluding 必须生效', () => {
    const r = byFactor(evaluateRequirements(ON_REQS, P({ noc: '72600', teer: 2, clb: 5 })), 'language')
    expect(r.need).toBe(6)
  })

  // 引擎层照旧把这条官方门槛算出来(unknown 是一等公民),但**报告层不再摆这一行** ——
  // 免考看的是「在哪读的」,题库问的是学历层级,判不了(Frank 2026-08-02「这一条不参与判定,那还显示干什么」)
  it('免考条款:引擎照旧出 unknown,报告层不占行', () => {
    expect(byFactor(evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, clb: 9 })), 'languageExempt').verdict).toBe('unknown')
    const r = buildPrReport(base({ targetProvinces: ['ON'] }), { canadianExpMonths: 30 }, dims, facts({ requirements: ON_REQS }))
    expect(r.requirements.map((l) => l.key)).not.toContain('rpt.r.langExempt')
  })

  it('工资档 basis=occMedian:阈值取该职业该省中位,报告层没有具体岗位 → unknown', () => {
    const r = byFactor(evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, annualIncome: 96000 })), 'wage')
    expect([r.need, r.have, r.verdict]).toEqual([96000, null, 'unknown'])
  })

  it('雇主三条恒 unknown,营业额三档按大小排好(GTA 100 万 → 其余 25 万)', () => {
    const rs = evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1 }))
    expect(byFactor(rs, 'empYears').need).toBe(3)
    const rev = byFactor(rs, 'empRevenue')
    expect(rev.verdict).toBe('unknown')
    expect(rev.tiers?.map((t) => t.value)).toEqual([1000000, 500000, 250000])
    expect(rev.tiers?.[0].area).toBe('gta')
    const staff = byFactor(rs, 'empStaff')
    expect([staff.need, staff.needLow]).toEqual([5, 3])
  })

  it('ON 与 BC 的行互不串味(引擎只吃传进来的那一省)', () => {
    const rs = evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, clb: 9 }))
    expect(rs.find((r) => r.factor === 'income')).toBeUndefined()   // 最低家庭收入是 BC 的东西
  })
})

// ── 雇主线索(锁区正文)——免费层服务端就没有名单,Pro 才有 ────────────────────────
describe('雇主线索', () => {
  const occStats = {
    self: { noc: '31301', province: 'all', titleEn: 'Registered nurses', titleZh: '注册护士', titleKo: '', teer: 1, broad: '3', mid: '31', fine: '3130', open: 300, named: 120, medianWage: 90000, medianPosted: 81000 },
    byProv: [], peers: [], sponsors: 2,
    sponsorList: [
      { name: 'Saskatchewan Health Authority', slug: 'sk-health', named: 3, eligible: 3, city: 'Regina', province: 'SK', lastPosted: '2026-07-17', lmiaPositions: 39, lmiaQuarter: '2026Q1', aip: false },
      { name: 'Northern Health Authority', slug: 'north-health', named: 3, eligible: 3, city: 'Mackenzie', province: 'BC', lastPosted: '2026-07-27', lmiaPositions: 2, lmiaQuarter: '2025Q3', aip: true },
    ],
  } as any

  const built = () => buildJobReport(base(), dims, facts({ byProv: [{ province: 'BC', open: 17, named: 17, medianWage: 91000 }] }), occStats)

  it('Pro:名单下发,字段照抄事实(不合成任何判断)', () => {
    const pro = gateReport(built(), true)
    expect(pro.employers.map((e) => e.name)).toEqual(['Saskatchewan Health Authority', 'Northern Health Authority'])
    expect(pro.employers[1]).toMatchObject({ aip: true, lmiaPositions: 2, province: 'BC' })
    expect(pro.locked).toHaveLength(0)
  })

  it('免费:名单**不在响应体里**(不是前端打码),但「有 N 家」那句结论与锁行都在', () => {
    const free = gateReport(built(), false)
    expect(free.employers).toEqual([])
    expect(free.conclusions.some((c) => c.key === 'rpt.j.sponsors')).toBe(true)
    expect(free.locked).toContain('sponsors')
  })
})

// ── 雇主侧门槛落到具体雇主(设计 §3.5「地点这项本站判得了」)────────────────────────
describe('地点 → 官方分档区域', () => {
  it('GTA:多伦多市与四个区域自治体都算(Mississauga/Markham/Oshawa/Oakville)', () => {
    for (const c of ['Toronto', 'Scarborough', 'Mississauga', 'Markham', 'Oshawa', 'Oakville', 'Vaughan']) {
      expect(areaOfPlace('ON', c)).toBe('gta')
    }
  })

  it('官方点名的普查区认主城(Ottawa/Kitchener/Hamilton/London/Windsor)', () => {
    for (const c of ['Ottawa', 'Kitchener', 'Hamilton', 'London', 'Windsor', 'Kingston']) {
      expect(areaOfPlace('ON', c)).toBe('on-listed-cd')
    }
  })

  it('ON 其余地名 → GTA 外;地名为空 → 不判(空串)', () => {
    expect(areaOfPlace('ON', 'Timmins')).toBe('outside-gta')
    expect(areaOfPlace('ON', '')).toBe('')
  })

  it('BC 走大温内外;别的省一律不判', () => {
    expect(areaOfPlace('BC', 'Surrey')).toBe('metro-vancouver')
    expect(areaOfPlace('BC', 'Kelowna')).toBe('rest-of-bc')
    expect(areaOfPlace('SK', 'Regina')).toBe('')
  })

  it('雇主门槛按区域取:GTA=$1M/5 人;点名普查区=$500K/3 人;GTA 外只给人数(营业额看普查区)', () => {
    expect(employerBar(ON_REQS, 'ON', 'gta')).toEqual({ revenue: 1_000_000, staff: 5 })
    expect(employerBar(ON_REQS, 'ON', 'on-listed-cd')).toEqual({ revenue: 500_000, staff: 3 })
    expect(employerBar(ON_REQS, 'ON', 'outside-gta')).toEqual({ revenue: null, staff: 3 })
    expect(employerBar(BC_REQS, 'BC', 'metro-vancouver')).toEqual({ revenue: null, staff: 5 })
  })
})
