// 规则引擎单测(设计《规则引擎与题库配对-20260731》§8 的黄金三例:达标 / 差一档 / 未收录)。
// 判定合一批2:报告层用例随 report.ts 引擎退役,本文件只留判定核(rules)口径。
// 纯函数,不需要 DB。这里锁的是**判定口径**,不是文案:
//   · unknown 是一等公民 —— 判不了就得是 unknown,绝不能滑成 pass 或 fail;
//   · 加拿大经验不够**不等于**总经验不够(官方要的是境内外都算)→ 只能 unknown;
//   · 收入表家庭人数/居住区域未知时,只有「最低那档都够不到」才敢判 fail(下界推理)。
import { describe, it, expect } from 'vitest'
import {
  areaOfPlace as gaugeArea, employerBar as gaugeBar, evaluateRequirements as gaugeEvaluate,
  type Requirement, type RuleProfile,
} from '@/lib/gauge'

/** 垫片:金标沿用位置参数,量尺域收对象参数(换实现时用例一个字不动) */
function evaluateRequirements(reqs: Requirement[], profile: RuleProfile) {
  return gaugeEvaluate({ reqs: reqs, profile: profile })
}

/** 垫片:同上 */
function areaOfPlace(province: string, city: string, district = '') {
  return gaugeArea({ province: province, city: city, district: district })
}

/** 垫片:同上 */
function employerBar(reqs: Requirement[], province: string, area: string) {
  return gaugeBar({ reqs: reqs, province: province, area: area })
}



// 真实抓取值(bc-req.json 2026-06-10 版):CLB 4 / 1 人家庭 $31,264(大温)与 $26,057(其余)/ 24 个月 / 雇主 1 年 · 5 人 · 3 人
const R = (o: Partial<Requirement>): Requirement => ({
  province: 'BC', program: 'PNP', stream: 'BC PNP Skills Immigration (all streams)', subject: 'applicant',
  factor: '', op: '>=', value: null, valueText: '', unit: '', appliesTeer: '', appliesNoc: '', excludesNoc: '', appliesCondition: '', appliesArea: '', familySize: null,
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
const P = (o: Partial<RuleProfile> = {}): RuleProfile => ({ noc: null, teer: 2, clb: null, canadianExpMonths: null, totalExpMonths: null, familySize: null, annualIncome: null, incomeIsOccMedian: true, area: null, ...o })
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
  it('免考条款:引擎照旧出 unknown(报告层随 report 引擎退役,判定合一批2)', () => {
    expect(byFactor(evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, clb: 9 })), 'languageExempt').verdict).toBe('unknown')
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
    expect(rev.tiers?.[0]?.area).toBe('gta')
    const staff = byFactor(rs, 'empStaff')
    expect([staff.need, staff.needLow]).toEqual([5, 3])
  })

  it('ON 与 BC 的行互不串味(引擎只吃传进来的那一省)', () => {
    const rs = evaluateRequirements(ON_REQS, P({ noc: '21232', teer: 1, clb: 9 }))
    expect(rs.find((r) => r.factor === 'income')).toBeUndefined()   // 最低家庭收入是 BC 的东西
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

  it('BC 走大温内外;NL 走圣约翰斯内外(B2-4);别的省一律不判', () => {
    expect(areaOfPlace('BC', 'Surrey')).toBe('metro-vancouver')
    expect(areaOfPlace('BC', 'Kelowna')).toBe('rest-of-bc')
    expect(areaOfPlace('NL', "St. John's")).toBe('st-johns')
    expect(areaOfPlace('NL', 'Mount Pearl')).toBe('st-johns')
    expect(areaOfPlace('NL', 'Corner Brook')).toBe('rest-of-nl')
    expect(areaOfPlace('NL', '')).toBe('')
    expect(areaOfPlace('SK', 'Regina')).toBe('')
  })

  it('雇主门槛按区域取:GTA=$1M/5 人;点名普查区=$500K/3 人;GTA 外只给人数(营业额看普查区)', () => {
    expect(employerBar(ON_REQS, 'ON', 'gta')).toEqual({ years: 3, revenue: 1_000_000, staff: 5 })
    expect(employerBar(ON_REQS, 'ON', 'on-listed-cd')).toEqual({ years: 3, revenue: 500_000, staff: 3 })
    expect(employerBar(ON_REQS, 'ON', 'outside-gta')).toEqual({ years: 3, revenue: null, staff: 3 })
    expect(employerBar(BC_REQS, 'BC', 'metro-vancouver')).toEqual({ years: 1, revenue: null, staff: 5 })
  })

  // B2-4(2026-08-03):经营年限全省一档 → 认不出地名也给;NL 雇员数按圣约翰斯内外;
  // MB 只有 EDI 年限(无雇员/营业额数字)→ 那两格留空,不编
  it('B2-4:年限不分区照给;NL 圣约翰斯内外两档;MB 只有年限', () => {
    const NL_REQS = [
      R({ province: 'NL', subject: 'employer', factor: 'empYears', value: 2, unit: 'years' }),
      R({ province: 'NL', subject: 'employer', factor: 'empStaff', value: 2, unit: 'employees', appliesArea: 'st-johns' }),
      R({ province: 'NL', subject: 'employer', factor: 'empStaff', value: 1, unit: 'employees', appliesArea: 'rest-of-nl' }),
    ]
    expect(employerBar(NL_REQS, 'NL', 'st-johns')).toEqual({ years: 2, revenue: null, staff: 2 })
    expect(employerBar(NL_REQS, 'NL', 'rest-of-nl')).toEqual({ years: 2, revenue: null, staff: 1 })
    expect(employerBar(NL_REQS, 'NL', '')).toEqual({ years: 2, revenue: null, staff: null })
    const MB_REQS = [R({ province: 'MB', subject: 'employer', factor: 'empYears', value: 3, unit: 'years' })]
    expect(employerBar(MB_REQS, 'MB', '')).toEqual({ years: 3, revenue: null, staff: null })
  })

  // #284 收尾(2026-08-09):AB 三项门槛全省一档(appliesArea 全空),而 areaOfPlace 只判 ON/BC/NL
  // → AB 的 area 恒 '' —— 区档落空后必须回落通用行,否则 AB 雇员/营业额永远取不到;
  // SK 官方原文按月计经营年限 → 统一换算成年(employerVerdict 同口径,消费端渲「{n} 年」)
  it('#284:AB 全省一档回落通用行;SK 月换算成年;分档省认不出区域仍宁缺不猜', () => {
    const AB_REQS = [
      R({ province: 'AB', subject: 'employer', factor: 'empYears', value: 2, unit: 'years' }),
      R({ province: 'AB', subject: 'employer', factor: 'empRevenue', value: 400_000, unit: 'CAD/yr' }),
      R({ province: 'AB', subject: 'employer', factor: 'empStaff', value: 3, unit: 'employees' }),
    ]
    expect(employerBar(AB_REQS, 'AB', '')).toEqual({ years: 2, revenue: 400_000, staff: 3 })
    const SK_REQS = [R({ province: 'SK', subject: 'employer', factor: 'empYears', value: 24, unit: 'months' })]
    expect(employerBar(SK_REQS, 'SK', '')).toEqual({ years: 2, revenue: null, staff: null })
  })
})

// ── B1-1(2026-08-03):其余七省的官方门槛入库后,引擎挑行的三条口径 ────────────────
// 取值都是当天实抓的真数(见 raw/pnp/<省>-req.json),改了这些断言前先去核官方页。
describe('evaluateRequirements —— 七省门槛的挑行口径', () => {
  // MPNP 把语言门槛发在**每个在需职业**上(In-Demand Occupations List 的 Minimum CLB 一列),
  // 另有一条 TEER 4/5 的通用下限。命中职业 → 用职业那一档;没命中 → 落通用下限。
  const MB_REQS: Requirement[] = [
    R({ province: 'MB', stream: 'MPNP Skilled Worker Overseas', factor: 'language', value: 4, unit: 'CLB', appliesTeer: '4,5' }),
    R({ province: 'MB', stream: 'MPNP In-Demand Occupations List', factor: 'language', value: 5, unit: 'CLB', appliesNoc: '72310', appliesTeer: '2' }),
    R({ province: 'MB', stream: 'MPNP In-Demand Occupations List', factor: 'language', value: 7, unit: 'CLB', appliesNoc: '33102', appliesTeer: '3' }),
  ]

  it('MB:在需清单上的职业用它自己那一档(木匠 72310 → CLB 5),不落通用下限', () => {
    const r = byFactor(evaluateRequirements(MB_REQS, P({ teer: 2, noc: '72310', clb: 4 })), 'language')
    expect(r.need).toBe(5)
    expect(r.verdict).toBe('fail')
    expect(r.short).toBe(1)
  })

  it('MB:不在在需清单上的 TEER 4/5 职业落通用下限 CLB 4', () => {
    const r = byFactor(evaluateRequirements(MB_REQS, P({ teer: 5, noc: '65100', clb: 4 })), 'language')
    expect(r.need).toBe(4)
    expect(r.verdict).toBe('pass')
  })

  it('MB:不在清单上的 TEER 0-3 职业**一行都不出**(官方没发这档的下限,不许拿别档套)', () => {
    expect(evaluateRequirements(MB_REQS, P({ teer: 1, noc: '21231', clb: 4 })).find((r) => r.factor === 'language')).toBeUndefined()
  })

  // PE 的 24 个月只写在 Skilled Worker 通道(TEER 0-3);TEER 4/5 的 Critical Worker 官方给了
  // 「2 年经验**或**相关学历」的替代路径 → 那档不挂经验门槛,引擎必须按 TEER 挑行。
  const PE_REQS: Requirement[] = [
    R({ province: 'PE', stream: 'PEI PNP Workforce — Skilled Worker stream', factor: 'experience', value: 24, unit: 'months', appliesTeer: '0,1,2,3' }),
  ]

  it('PE:TEER 0-3 吃 24 个月经验门槛', () => {
    const r = byFactor(evaluateRequirements(PE_REQS, P({ teer: 2, totalExpMonths: 6 })), 'experience')
    expect(r.need).toBe(24)
    expect(r.verdict).toBe('fail')
  })

  it('PE:TEER 4/5 不吃那条(整行不出)—— 拿别档的门槛套人就是撒谎', () => {
    expect(evaluateRequirements(PE_REQS, P({ teer: 5, totalExpMonths: 6 })).find((r) => r.factor === 'experience')).toBeUndefined()
  })

  // MB SWM(G6 2026-08-04):官方要的是「与**该雇主**连续全职多久」——
  // 一般 6 个月、在加拿大其他省/地区读的书则 1 年。口径与本站问的「同职业总经验」不是一回事,
  // 靠 basis='employerTenure' 隔离:摆得出门槛,但永远不下判定。
  const MB_TENURE: Requirement[] = [
    R({ province: 'MB', stream: 'MPNP SWM', factor: 'experience', value: 6, unit: 'months', basis: 'employerTenure' }),
    R({ province: 'MB', stream: 'MPNP SWM (grad elsewhere)', factor: 'experience', value: 12, unit: 'months', basis: 'employerTenure', appliesCondition: 'grad-other-province' }),
  ]

  it('MB:在职时长两档都摆出来,need 取低档 6 个月,外省毕业那档进 tiers', () => {
    const r = byFactor(evaluateRequirements(MB_TENURE, P({ totalExpMonths: 60 })), 'experience')
    expect(r.need).toBe(6)
    expect(r.unit).toBe('months')
    expect(r.tiers?.map((t) => [t.area, t.value])).toEqual([['', 6], ['grad-other-province', 12]])
  })

  it('🔴 MB:同职业总经验 5 年也判不了在职时长 —— 恒 unknown、have 留空,绝不滑成 pass', () => {
    for (const p of [P({ totalExpMonths: 60, canadianExpMonths: 60 }), P({ totalExpMonths: 1 }), P()]) {
      const r = byFactor(evaluateRequirements(MB_TENURE, p), 'experience')
      expect(r.verdict).toBe('unknown')
      expect(r.have).toBeNull()
      expect(r.short).toBeNull()
    }
  })

  it('别省不受影响:basis 为空的经验门槛照旧判定(BC 24 个月仍然 fail)', () => {
    expect(byFactor(evaluateRequirements(BC_REQS, P({ totalExpMonths: 6 })), 'experience').verdict).toBe('fail')
  })

  // NL 的档位是从官方两句话相减算出来的:收 TEER 0-5,但只有 TEER 4/5 要交成绩。
  const NL_REQS: Requirement[] = [
    R({ province: 'NL', stream: 'NLPNP Skilled Worker Category', factor: 'language', value: 4, unit: 'CLB', appliesTeer: '4,5' }),
    R({ province: 'NL', stream: 'NLPNP Skilled Worker Category', factor: 'language', op: 'none', appliesTeer: '0,1,2,3' }),
  ]

  it('NL:TEER 0-3 免交成绩 → pass 且 need 为空(文案走 langNone,不是「达标」)', () => {
    const r = byFactor(evaluateRequirements(NL_REQS, P({ teer: 2, clb: null })), 'language')
    expect(r.verdict).toBe('pass')
    expect(r.need).toBeNull()
  })

  it('NL:TEER 4/5 要 CLB 4,没填语言 → unknown(不猜)', () => {
    const r = byFactor(evaluateRequirements(NL_REQS, P({ teer: 5, clb: null })), 'language')
    expect(r.verdict).toBe('unknown')
    expect(r.need).toBe(4)
  })

  // AB 给 33102(护理助理)单开 CLB 7,盖过 TEER 0-3 的通用 CLB 5 —— 同 ON 技工低档的机制。
  const AB_REQS: Requirement[] = [
    R({ province: 'AB', stream: 'AAIP Alberta Opportunity Stream', factor: 'language', value: 5, unit: 'CLB', appliesTeer: '0,1,2,3' }),
    R({ province: 'AB', stream: 'AAIP Alberta Opportunity Stream', factor: 'language', value: 4, unit: 'CLB', appliesTeer: '4,5' }),
    R({ province: 'AB', stream: 'AAIP Alberta Opportunity Stream', factor: 'language', value: 7, unit: 'CLB', appliesNoc: '33102' }),
  ]

  it('AB:33102 用它自己的 CLB 7,不用 TEER 3 的通用 CLB 5', () => {
    expect(byFactor(evaluateRequirements(AB_REQS, P({ teer: 3, noc: '33102', clb: 6 })), 'language').need).toBe(7)
    expect(byFactor(evaluateRequirements(AB_REQS, P({ teer: 3, noc: '32104', clb: 6 })), 'language').need).toBe(5)
  })
})
