// #287 批C 金标 · tripleVerdict 组装器。
//
// 金标锚定 design/一键三合一判定-20260809.md §2 的**真人案例**(不是构造画像):
//   岗   = job 11039073 continuing care assistant @ Grand View Manor(NOC 33102 nurse aides, TEER 3, Berwick NS,
//          命中 pnp_occupations 的「NS 紧缺空缺」= Nova Scotia Critical Vacancies)
//   雇主 = Grand View Manor(companies 1214626;founded_year 1969、staff_est 230;designated_employers 名录 source='AIP')
//   档案 = 库内 NOC 33102 真实注册用户匿名槽位:找工中 / CLB 6 / PGWP 剩 18 个月 / 目标省 BC / 经验槽未答
//
// fixture = **2026-08-09 生产库只读实查冻结**(生产库禁写)。复查用的 SELECT 逐块贴在各常量上方,
// 数字对不上时先跑那句 SELECT 再改断言 —— 不许反过来改引擎迁就断言。
//
// ⚠️ TEER 覆盖面:本案例是 TEER 3,只走得到 AIP 语言行 `teer-0-3` 的**端点**。TEER 1/2 那两档
//    (曾被 pathVerdict.fedLangApplies 的端点枚举解析漏掉)由 `pathVerdict.int.spec.ts` 的
//    「teer-0-3 闭区间」回归组覆盖,本金标不重复摆。
//
// 验的是真组件:tripleVerdict 真调 employerVerdict(#284)、pathVerdict(C5)、rules.evaluateRequirements,
// 没有任何复刻件/桩件。VerdictData 用冻结行组装(不读 mart:AIP 那 36 行是 08-09 批B 直接进库的,
// mart 还没跟上;拿 mart 当输入这个金标就验不到「AIP 行入库后比路翻案」)。
import { describe, expect, it } from 'vitest'
import { tripleVerdict, type TripleCompany, type TripleJob, type TripleProfile } from '@/lib/tripleVerdict'
import type { DesignatedEmployerRow, OccupationRow, VerdictData } from '@/lib/pathVerdict'
import type { Requirement } from '@/lib/rules'

// 判定卡里的一切相对时间都锚死在这一年(company.founded_year=1969 → 经营 57 年)
const NOW_YEAR = 2026

// ── fixture ①:岗 ────────────────────────────────────────────────────────────
// SELECT id, external_id, title, company_id, noc, teer, province, city, pnp_eligible, pnp_stream,
//        ee_category, aip, employment_term, employment_hours, status
//   FROM jobs WHERE id = 11039073;
// → id=11039073, external_id='jb:49967840', title='continuing care assistant', company_id=1214626,
//   noc='33102', teer=3, province='NS', city='Berwick', pnp_eligible=t, pnp_stream='NS 紧缺空缺',
//   ee_category='医疗社服', aip=t, employment_term='permanent', employment_hours='full', status='open'
// SELECT title FROM noc_descriptions WHERE noc='33102';  → 'Nurse aides, orderlies and patient service associates'
const JOB: TripleJob = {
  id: 11039073,
  title: 'continuing care assistant',
  noc: '33102',
  nocName: 'Nurse aides, orderlies and patient service associates',
  teer: 3,
  province: 'NS',
  city: 'Berwick',
  pnpEligible: true,
  pnpStream: 'NS 紧缺空缺',
  eeCategory: '医疗社服',
  aip: true,
  employmentTerm: 'permanent',
  employmentHours: 'full',
}

// ── fixture ②:雇主 ──────────────────────────────────────────────────────────
// SELECT id, name, founded_year, founded_src, registry_status, staff_est, staff_est_src, sector, lmia_nocs
//   FROM companies WHERE id = 1214626;
// → Grand View Manor, founded_year=1969(founded_src='ai'), registry_status=NULL,
//   staff_est=230, sector=NULL, lmia_nocs=NULL(#286 该行未回填)
// SELECT name, province, location, is_tech, source, nocs, url, fetched
//   FROM designated_employers WHERE name ILIKE '%grand view%';
// → 'Grand View Manor Continuing Care Community o/a Grand View Manor', province='NS', source='AIP',
//   nocs='', url='', fetched=''(名录 mart 行不带出处 —— pathVerdict 已留痕的同一个数据缺口)
const DESIGNATION: DesignatedEmployerRow = {
  name: 'Grand View Manor Continuing Care Community o/a Grand View Manor',
  province: 'NS',
  location: '',
  isTech: false,
  source: 'AIP',
  nocs: '',
  url: '',
  fetched: '',
}
const COMPANY: TripleCompany = {
  id: 1214626,
  name: 'Grand View Manor',
  facts: {
    foundedYear: 1969,
    registryStatus: null,
    staffEst: 230,
    staffEstSrc: 'Employs over 230 staff; houses 142 nursing home residents and approximately 56 independent living tenants.',
    sector: null,
  },
  designation: DESIGNATION,
  designationMatches: 1,
  designationSource: 'AIP',
  lmiaNocs: null,
}

// 名录匹配的另两种态(批D 欠账①,口径见 lib/designationMatch):
//   NO_MATCH  = 名录里没认出这家(本站缺口,≠ 官方没指定)
//   MULTI     = 同名/同链法人多家(连锁加盟 `… o/a Tim Hortons`),哪一家是你雇主不可证 → 不点名
const NO_MATCH: TripleCompany = { ...COMPANY, designation: null, designationMatches: 0, designationSource: '' }
const MULTI: TripleCompany = {
  ...COMPANY, name: 'Tim Hortons', designation: null, designationMatches: 20, designationSource: 'AIP',
}

// ── fixture ③:档案(真人槽位;未答的槽一律 null,**不拿默认值填**)────────────
const PROFILE: TripleProfile = {
  age: null, married: null,
  clb: 6,
  edu: null, eduYears: null, canadaStudy: null, studyProvince: null,
  noc: '33102', teer: 3,
  expCanadaMonths: null, expForeignMonths: null, foreignExpSelfEmployed: null,
  status: 'pgwp',
  province: null,
  permitMonthsLeft: 18,
  targetProvinces: ['BC'],
  familySize: null,
}

// ── fixture ④:门槛行 ────────────────────────────────────────────────────────
// SELECT province, program, stream, subject, factor, op, value, value_text, unit, applies_teer,
//        applies_area, applies_family_size, basis, label, section, effective, url, page_url, fetched
//   FROM pnp_requirements WHERE province='NS' ORDER BY seq;             → 4 行(下面全量抄)
//   FROM pnp_requirements WHERE program='AIP' ORDER BY seq;             → 36 行(2026-08-09 批B 入库)
// AIP 36 行里判定引擎实际读到的只有 4 行(pathVerdict 对 AIP 挑行:factor∈{experience,workHours} 一行、
// factor='workSelfEmployed' 一行、factor='language' 两行)—— 冻结这 4 行,其余 32 行(offer 条款 7 /
// 大西洋毕业生豁免 4 / 学历+ECA 6 / 语言时效 1 / 资金 11 / 经验附则 3)当前无消费端读取,不进 fixture 充数。
const R = (o: Partial<Requirement>): Requirement => ({
  province: '', program: '', stream: '', subject: 'applicant', factor: '', op: '>=', value: null,
  valueText: '', unit: '', appliesTeer: '', appliesArea: '', familySize: null, basis: '', label: '',
  section: '', effective: '', url: '', pageUrl: '', fetched: '', appliesCondition: '',
  ...o,
})

const NS_GUIDE = 'https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-Skilled-Worker-English.pdf'
const NS_STREAM = 'Nova Scotia Nominee Program — Skilled Worker stream'
const NS_REQS: Requirement[] = [
  R({
    province: 'NS', program: 'PNP', stream: NS_STREAM, subject: 'applicant', factor: 'language',
    op: '>=', value: 5, unit: 'CLB', appliesTeer: '0,1,2,3',
    label: 'Canadian Language Benchmarks (CLB) or NCLC Level 5 or higher for jobs in NOC TEER 0, 1, 2, and 3 (Skilled Worker, Critical Construction Worker and Occupations in Demand categories)',
    section: 'Language — NOC TEER 0, 1, 2 and 3', effective: 'July 2026',
    url: NS_GUIDE, pageUrl: 'https://liveinnovascotia.com/skilled-worker', fetched: '2026-08-07',
  }),
  R({
    province: 'NS', program: 'PNP', stream: NS_STREAM, subject: 'applicant', factor: 'language',
    op: '>=', value: 4, unit: 'CLB', appliesTeer: '4,5',
    label: 'An approved language test showing at least CLB/NCLC 4 is mandatory for jobs in NOC TEER 4 and 5, issued within two years of the NSNP submission',
    section: 'Language — NOC TEER 4 and 5', effective: 'July 2026',
    url: NS_GUIDE, pageUrl: 'https://liveinnovascotia.com/skilled-worker', fetched: '2026-08-07',
  }),
  R({
    province: 'NS', program: 'PNP', stream: NS_STREAM, subject: 'applicant', factor: 'experience',
    op: '>=', value: 12, unit: 'months',
    label: '12 complete calendar months of paid work within the last 5 years and a minimum of 1,560 hours, related to the job being offered (volunteer work and unpaid internships do not count)',
    section: 'Skilled Workers — work experience', effective: 'July 2026',
    url: NS_GUIDE, pageUrl: 'https://liveinnovascotia.com/skilled-worker', fetched: '2026-08-07',
  }),
  R({
    province: 'NS', program: 'PNP', stream: NS_STREAM, subject: 'employer', factor: 'empYears',
    op: '>=', value: 2, unit: 'years',
    label: 'The employer must have operated in Nova Scotia for at least 2 years',
    section: 'Core Requirements — employer', effective: 'July 2026',
    url: NS_GUIDE, pageUrl: 'https://liveinnovascotia.com/skilled-worker', fetched: '2026-08-07',
  }),
]

const AIP_WORK = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/work-experience.html'
const AIP_LANG = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/language-testing.html'
const AIP_REQS: Requirement[] = [
  R({
    province: 'FED', program: 'AIP', subject: 'applicant', factor: 'workHours',
    op: '>=', value: 1560, unit: 'hours', basis: 'windowYears=5;hoursPerWeek=30;minYears=1',
    valueText: 'You need at least 1,560 hours of related work experience over the past 5 years.',
    label: 'At least 1,560 hours (30 hrs/week for 1 year) of related work experience in the past 5 years',
    url: AIP_WORK, fetched: '2026-08-09',
  }),
  R({
    province: 'FED', program: 'AIP', subject: 'applicant', factor: 'workSelfEmployed',
    op: 'rule', basis: 'valueCode=excluded',
    valueText: 'not be from a self-employed job',
    label: 'Self-employment does not count toward the work experience requirement',
    url: AIP_WORK, fetched: '2026-08-09',
  }),
  R({
    province: 'FED', program: 'AIP', stream: 'teer-0-3', subject: 'applicant', factor: 'language',
    op: '>=', value: 5, unit: 'CLB',
    valueText: 'CLB 5 for job offer in TEER 0, 1, 2 or 3',
    label: 'CLB 5 minimum for a job offer in TEER 0, 1, 2 or 3',
    url: AIP_LANG, fetched: '2026-08-09',
  }),
  R({
    province: 'FED', program: 'AIP', stream: 'teer-4', subject: 'applicant', factor: 'language',
    op: '>=', value: 4, unit: 'CLB',
    valueText: 'CLB 4 for job offer in TEER 4',
    label: 'CLB 4 minimum for a job offer in TEER 4',
    url: AIP_LANG, fetched: '2026-08-09',
  }),
]

// ── fixture ⑤:具名清单 ──────────────────────────────────────────────────────
// SELECT province, stream, label, program, type, applies_to, noc, name, gta_restricted, url, fetched
//   FROM pnp_occupations WHERE noc='33102' ORDER BY province, stream;   → 6 行(BC / MB 乡镇 / NS×2 / PE / SK)
// 全量抄进来:换省对照行必须能看见 BC 那一行,「不在清单」的分支也要有对照面。
const O = (o: Partial<OccupationRow>): OccupationRow => ({
  province: '', stream: '', label: '', program: 'PNP', type: 'indemand', url: '', fetched: '',
  appliesTo: '', noc: '33102', name: 'Nurse aides, orderlies and patient service associates',
  gtaRestricted: false, ...o,
})
const OCCS: OccupationRow[] = [
  O({
    province: 'BC', stream: 'BC PNP Care: health targeted ITA / Health Authority stream', label: 'BC 医疗',
    url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program',
    fetched: '2026-08-09',
  }),
  O({
    province: 'MB', stream: 'MPNP In-Demand Occupations List – rural (outside the Manitoba Capital Region)',
    label: 'MB 乡镇在需', url: 'https://immigratemanitoba.com/mpnp/idol/', fetched: '2026-08-07',
  }),
  O({
    province: 'NS', stream: 'Nova Scotia Critical Vacancies', label: 'NS 紧缺空缺',
    url: 'https://liveinnovascotia.com/critical-vacancies', fetched: '2026-08-08',
  }),
  O({
    province: 'NS', stream: 'Nova Scotia Graduate stream', label: 'NS 毕业生',
    name: 'nurse aides, orderlies, and patient service associates',
    url: 'https://liveinnovascotia.com/nova-scotia-graduate', fetched: '2026-08-08',
  }),
  O({
    province: 'PE', stream: 'PEI PNP — Occupations in Demand', label: 'PE 在需职业',
    url: 'https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-pnp-workforce-streams',
    fetched: '2026-08-07',
  }),
  O({
    province: 'SK', stream: 'SINP Health Talent Pathway', label: 'SK 医疗',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/health-talent-pathway',
    fetched: '2026-08-09',
  }),
]

const dataWith = (reqs: Requirement[]): VerdictData => ({
  requirements: reqs,
  occupations: OCCS,
  draws: [],
  scoreFactors: [],
  eeGrid: [],
  designatedEmployers: [],
})
const DATA = dataWith([...NS_REQS, ...AIP_REQS])
/** 反证用:把 AIP 那 36 行抽掉(= 批B 落地之前的生产实况) */
const DATA_NO_AIP = dataWith(NS_REQS)

const run = (data: VerdictData = DATA, company: TripleCompany = COMPANY, profile: TripleProfile = PROFILE) =>
  tripleVerdict(JOB, company, profile, data, { nowYear: NOW_YEAR })

const rowOf = (card: ReturnType<typeof run>, key: string) => card.rows.find((r) => r.key === key)
const rowsOf = (card: ReturnType<typeof run>, key: string) => card.rows.filter((r) => r.key === key)
const cmpOf = (card: ReturnType<typeof run>, key: string) => card.compare.find((c) => c.key === key)

// ── 金标 ①:职业关 ✓ 具名清单(free)────────────────────────────────────────

describe('#287 金标 · 职业关', () => {
  it('这份岗命中 NS 紧缺空缺具名清单,清单名与职位板 pnp 列同一行', () => {
    const listed = rowsOf(run(), 'tv.occ.listed')
    // NS 侧 33102 在两张清单上(紧缺空缺 + 毕业生),两条都摆,不只摆一条
    expect(listed.map((r) => r.params.list).sort()).toEqual(['NS 毕业生', 'NS 紧缺空缺'])
    const critical = listed.find((r) => r.params.list === 'NS 紧缺空缺')!
    expect(critical.state).toBe('pass')
    expect(critical.tier).toBe('free')
    expect(critical.params.stream).toBe('Nova Scotia Critical Vacancies')
    expect(critical.params.matchesJobStream).toBe(true)      // 与 jobs.pnp_stream 同口径
    expect(critical.params.nocName).toBe('Nurse aides, orderlies and patient service associates')  // 代码不裸奔
    expect(critical.quote).toBe('Nova Scotia Critical Vacancies — 33102 Nurse aides, orderlies and patient service associates')
    expect(critical.evidence).toMatchObject({ url: 'https://liveinnovascotia.com/critical-vacancies', fetched: '2026-08-08' })
  })

  it('TEER 3 在 NS 粗筛通道内;没有任何排除清单命中', () => {
    const card = run()
    expect(rowOf(card, 'tv.occ.teer')).toMatchObject({ state: 'pass', tier: 'free', params: { teer: 3, prov: 'NS' } })
    expect(rowsOf(card, 'tv.occ.excluded')).toHaveLength(0)
    expect(rowsOf(card, 'tv.occ.notListed')).toHaveLength(0)
  })
})

// ── 金标 ②:雇主关 ✓ AIP 指定 + 经营年限达标(free)──────────────────────────

describe('#287 金标 · 雇主关', () => {
  it('Grand View Manor 在 AIP 指定雇主名录上', () => {
    const r = rowOf(run(), 'tv.emp.designated')!
    expect(r).toMatchObject({ state: 'pass', tier: 'free' })
    expect(r.params.program).toBe('AIP')
    expect(r.params.name).toBe('Grand View Manor Continuing Care Community o/a Grand View Manor')
    // 名录 mart 行不带 url/fetched → 挂不上就不挂,不借别处的出处充数
    expect(r.evidence).toBeUndefined()
  })

  it('经营年限达标:NS 门槛 2 年,1969 年至今 57 年,带官方原句', () => {
    const card = run()
    const r = rowOf(card, 'tv.emp.years')!
    expect(r).toMatchObject({ state: 'pass', tier: 'free', params: { need: 2, have: 57, unit: 'years' } })
    expect(r.quote).toBe('The employer must have operated in Nova Scotia for at least 2 years')
    expect(r.evidence?.url).toBe(NS_GUIDE)
    expect(card.employer.state).toBe('met')
  })

  it('员工约 230:NS 没收录雇员数门槛 → 摆成旁证事实行,不冒充判定', () => {
    const card = run()
    expect(rowOf(card, 'tv.emp.staff')).toBeUndefined()          // 没门槛就没有判定行
    expect(rowOf(card, 'tv.emp.staffFact')).toMatchObject({ state: 'info', tier: 'free', params: { staff: 230 } })
    expect(card.employer.items.map((i) => i.factor)).toEqual(['years'])
  })

  it('名录里认不出这家时落 unknown,**不写「未被指定」**', () => {
    const r = rowOf(run(DATA, NO_MATCH), 'tv.emp.designationUnknown')!
    expect(r.state).toBe('unknown')
    expect(rowOf(run(DATA, NO_MATCH), 'tv.emp.designated')).toBeUndefined()
  })

  // ── 批D 欠账① · 多配不点名法人 ───────────────────────────────────────────
  it('同名多配 → 只报家数,一个法人名都不点', () => {
    const card = run(DATA, MULTI)
    const r = rowOf(card, 'tv.emp.designatedMulti')!
    expect(r).toMatchObject({ state: 'info', tier: 'free', params: { count: 20, program: 'AIP' } })
    // 「已指定」那一行不许出现——多配时它是不可证的
    expect(rowOf(card, 'tv.emp.designated')).toBeUndefined()
    expect(rowOf(card, 'tv.emp.designationUnknown')).toBeUndefined()
    // 卡上任何一行的 params 里都不许出现具体法人名(点名=替用户认了一家不可证的雇主)
    const dump = JSON.stringify(card.rows)
    expect(dump).not.toContain('Burgeo Sands')
    expect(dump).not.toContain('o/a Tim Hortons')
  })

  it('多配的 state 是 info 不是 pass:「这条链在名录里」为真,「这家=你雇主」不判', () => {
    const r = rowOf(run(DATA, MULTI), 'tv.emp.designatedMulti')!
    expect(r.state).not.toBe('pass')
    expect(r.tier).toBe('free')            // 事实恒免费(design §5 锁合成不锁事实)
  })
})

// ── 金标 ③:个人关(paid):语言过、经验点名问 ───────────────────────────────

describe('#287 金标 · 个人关', () => {
  it('语言:NS SW TEER 3 档要 CLB 5,他 CLB 6 已过', () => {
    const r = rowOf(run(), 'tv.person.language')!
    expect(r).toMatchObject({ state: 'pass', tier: 'paid', params: { need: 5, have: 6, unit: 'CLB' } })
    expect(r.quote).toContain('CLB) or NCLC Level 5 or higher')
    expect(r.followups).toBeUndefined()                          // 判出来了就不再问
  })

  it('经验:门槛 12 个月,槽位未答 → 判不了 + 点名问哪两个槽', () => {
    const card = run()
    const r = rowOf(card, 'tv.person.experience')!
    expect(r).toMatchObject({ state: 'unknown', tier: 'paid', params: { need: 12, have: '', unit: 'months' } })
    expect(r.followups).toEqual(['expCanadaMonths', 'expForeignMonths'])
    expect(card.followups).toContain('expCanadaMonths')
    // 缺一项就判不了 —— 不许因为语言过了就把整关说成「差不多能走」
    expect(r.quote).toContain('12 complete calendar months of paid work within the last 5 years')
  })

  it('雇主侧门槛不在个人关重复摆(那一行归 employerVerdict 判)', () => {
    expect(rowOf(run(), 'tv.person.empYears')).toBeUndefined()
  })
})

// ── 金标 ④:时间窗 + 换省对照(paid)────────────────────────────────────────

describe('#287 金标 · 时间窗与换省对照', () => {
  it('PGWP 剩 18 个月摆成事实行,不编概率', () => {
    expect(rowOf(run(), 'tv.time.permit')).toMatchObject({
      state: 'info', tier: 'paid', params: { months: 18, status: 'pgwp' },
    })
  })

  it('目标省 BC 也有 33102 具名清单(BC 医疗);判定仍按手上这份 NS 岗算', () => {
    const rows = rowsOf(run(), 'tv.compare.listed')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      state: 'info', tier: 'paid',
      params: { prov: 'BC', basisProv: 'NS', stream: 'BC PNP Care: health targeted ITA / Health Authority stream', list: 'BC 医疗' },
    })
    expect(rows[0].evidence?.fetched).toBe('2026-08-09')
  })

  it('没填目标省 → 换省对照落缺口并点名问 targetProvinces', () => {
    const card = run(DATA, COMPANY, { ...PROFILE, targetProvinces: [] })
    expect(rowOf(card, 'tv.compare.noTarget')).toMatchObject({ state: 'unknown', followups: ['targetProvinces'] })
    expect(card.followups).toContain('targetProvinces')
  })
})

// ── 金标 ⑤:比路(AIP 行入库后翻案 + 抽掉后退化)──────────────────────────

describe('#287 金标 · 比路', () => {
  it('雇主已被 AIP 指定 → AIP 线进比路,且今天判得了(批B 入库后的翻案)', () => {
    const aip = cmpOf(run(), 'AIP')!
    expect(aip.role).toBe('aip')
    expect(aip.availability).toBe('ok')          // 批B 之前这里是 not-collected
    expect(aip.verdict).toBe('needs-info')       // 经验槽未答 —— 缺的是档案,不是数据
    expect(aip.tier).toBe(2)                     // AIP 1,560 小时 = 官方自写的「1 年」→ 12 个月
    expect(aip.fastest).toBe(true)
  })

  it('AIP 申请人行:CLB 6 过 CLB 5;1,560 小时未答 → 点名问,不编结论', () => {
    const aip = run().pathways.find((p) => p.key === 'AIP')!
    const texts = aip.reasons.map((r) => r.text).join('\n')
    const quotes = aip.reasons.map((r) => r.quote ?? '').join('\n')
    expect(texts).toContain('CLB 5')
    expect(texts).toContain('工作经验门槛 12 个月')  // 1,560 小时 = 官方自写的「1 年」→ 12 个月,不拿工时除
    expect(quotes).toContain('1,560 hours')          // 数字全从官方原句来,代码里一个都没手写
    expect(aip.reasons.some((r) => r.kind === 'met')).toBe(true)          // 语言那条判过了
    expect(aip.reasons.some((r) => r.kind === 'needs-info')).toBe(true)   // 经验那条判不了
  })

  it('最快=AIP 与 NS SW **并列** tier 2:并列就说并列,不替用户挑一条', () => {
    const card = run()
    const ns = cmpOf(card, 'NS-sw')!
    expect(ns).toMatchObject({ role: 'current', availability: 'ok', tier: 2, fastest: true })
    const route = rowOf(card, 'tv.route.fastest')!
    expect(route.tier).toBe('paid')
    expect(route.state).toBe('info')
    expect((route.params.keys as string[]).sort()).toEqual(['AIP', 'NS-sw'])
    expect(route.params.tied).toBe(true)
  })

  it('目标省 BC 的线只作对照,**不参与「最快」评比**(他手上没有 BC 的 offer)', () => {
    const card = run()
    const bc = card.compare.filter((c) => c.province === 'BC')
    expect(bc.length).toBeGreaterThan(0)
    expect(bc.every((c) => c.role === 'target' && c.fastest === false)).toBe(true)
  })

  it('反证:抽掉 AIP 门槛行 → 该线退化成缺口,绝不冒充「最快」', () => {
    const card = run(DATA_NO_AIP)
    const aip = cmpOf(card, 'AIP')!
    expect(aip.availability).toBe('not-collected')   // 本站没这条门槛 ≠ 官方没这条门槛
    expect(aip.tier).toBeNull()
    expect(aip.fastest).toBe(false)
    const route = rowOf(card, 'tv.route.fastest')!
    expect(route.params.keys).toEqual(['NS-sw'])
    expect(route.params.tied).toBe(false)
    // 卡上没有任何一行把 AIP 说成结论
    expect(card.rows.some((r) => r.state === 'pass' && String(r.key).startsWith('tv.route'))).toBe(false)
  })

  it('雇主没被指定 → AIP 线压根不进比路(不拿 jobs.aip 的粗筛标记冒充雇主指定)', () => {
    const card = run(DATA, NO_MATCH)
    expect(cmpOf(card, 'AIP')).toBeUndefined()
    expect(JOB.aip).toBe(true)                       // 岗上的 aip 标记仍是 true,但它管的是职业不是雇主
  })

  it('多配同样不进比路:哪一家是你雇主不可证 → AIP 不能当已确证通道,更不许标「最快」', () => {
    const card = run(DATA, MULTI)
    expect(cmpOf(card, 'AIP')).toBeUndefined()
    expect(card.compare.some((c) => c.role === 'aip')).toBe(false)
    // 事实行还在(免费位照摆家数),被拦住的只是「最快」那个付费结论
    expect(rowOf(card, 'tv.emp.designatedMulti')).toBeDefined()
  })
})

// ── 金标 ⑥:免费/付费位切分(design §5 锁合成不锁事实)────────────────────

describe('#287 金标 · 免费付费位', () => {
  it('三关事实全免费;比路结论、差值、时间窗、换省对照、下一步全付费', () => {
    const card = run()
    const free = card.rows.filter((r) => r.tier === 'free').map((r) => r.key)
    const paid = card.rows.filter((r) => r.tier === 'paid').map((r) => r.key)
    // 免费位:一条个人化结论都不许漏出去
    expect(free.every((k) => k.startsWith('tv.occ.') || k.startsWith('tv.emp.'))).toBe(true)
    expect(free).toContain('tv.occ.listed')
    expect(free).toContain('tv.emp.designated')
    expect(free).toContain('tv.emp.years')
    // 付费位
    expect(paid).toContain('tv.person.language')
    expect(paid).toContain('tv.person.experience')
    expect(paid).toContain('tv.time.permit')
    expect(paid).toContain('tv.compare.listed')
    expect(paid).toContain('tv.route.fastest')
    expect(paid).toContain('tv.next.employer')     // 「对这家怎么谈」
  })

  it('每行只有 key+params,没有写死的中文 UI 句子(label 是英文调试串)', () => {
    for (const r of run().rows) {
      expect(r.key).toMatch(/^tv\./)
      expect(r.label).not.toMatch(/[一-龥]/)
    }
  })

  it('本站没收录该省门槛时整卡落 not-collected(不拿别省的门槛套)', () => {
    const card = run(dataWith(AIP_REQS))
    expect(card.availability).toBe('not-collected')
    expect(rowOf(card, 'tv.person.language')).toBeUndefined()
  })
})
