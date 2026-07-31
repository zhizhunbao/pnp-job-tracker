// 卡①找工作 / 卡⑥职业规划的引擎测试(统一题库横向扩面)。纯函数,不碰 DB。
// 重点锁两件事:① 免费/付费的线照口径走 —— 库里查得到的(在招量、薪资对照)免费,
// 拿答案筛出来的(担保雇主名单、跃迁排序)进锁区;② 没有的数据不假装有(转换路径缺口恒在)。
import { describe, it, expect } from 'vitest'
import { normalizeProfile, type MatchDims } from '@/lib/match'
import { buildCareerReport, buildJobReport, buildProvReport, gateReport, type ReportFacts } from '@/lib/report'
import type { OccStat, OccStats } from '@/lib/reportFacts'

const dims: MatchDims = {
  pnpOccupations: [
    { province: 'BC', label: 'BC Health Authority stream', type: 'indemand', noc: '31301', url: 'https://gov.bc.ca/health', fetched: '2026-07-20' },
  ],
  eeCategories: [],
  designatedEmployers: [],
} as unknown as MatchDims

const facts: ReportFacts = {
  noc: '31301', title: 'Registered nurses', teer: 1,
  byProv: [{ province: 'BC', open: 19, named: 18 }, { province: 'ON', open: 40, named: 0 }],
  draws: [], scoreProvinces: [], fetched: '2026-07-31',
}

const occStat = (p: Partial<OccStat>): OccStat => ({
  noc: '31301', province: 'all', titleEn: 'Registered nurses', titleZh: '注册护士', titleKo: '등록 간호사', teer: 1, broad: '3',
  open: 300, named: 120, medianWage: 90_000, medianPosted: 81_000, ...p,
})
const occ = (p: Partial<OccStats> = {}): OccStats => ({ self: occStat({}), byProv: [], peers: [], sponsors: 0, ...p })

describe('卡① 找工作', () => {
  it('目标省出在招与具名结论,并给职位板下一步', () => {
    const r = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ())
    expect(r.goal).toBe('job')
    expect(r.conclusions[0].key).toBe('rpt.j.openNamed')
    expect(r.conclusions[0].params).toMatchObject({ prov: 'BC', open: 19, named: 18 })
    expect(r.conclusions[0].source?.url).toBe('https://gov.bc.ca/health')   // 具名结论必须带出处
    expect(r.nextSteps.some((s) => s.key === 'rpt.n.jobs')).toBe(true)
  })

  it('薪资对照给两个口径的真数,不合成「值不值」的分', () => {
    const r = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ())
    const w = r.conclusions.find((c) => c.key.startsWith('rpt.j.wage'))!
    expect(w.key).toBe('rpt.j.wageBelow')
    expect(w.params).toMatchObject({ posted: '81K', esdc: '90K', pct: 10 })
  })

  it('零在招的目标省进缺口,不硬凑结论', () => {
    const f = { ...facts, byProv: [{ province: 'BC', open: 0, named: 0 }] }
    const r = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, f, occ())
    expect(r.gaps.some((g) => g.key === 'rpt.g.zeroJobs')).toBe(true)
    expect(r.conclusions.some((c) => c.key.startsWith('rpt.j.open'))).toBe(false)
  })

  it('没选职业 → 单缺口报告(不给空页)', () => {
    const r = buildJobReport(normalizeProfile({}), dims, { ...facts, noc: '' }, occ({ self: null }))
    expect(r.conclusions).toHaveLength(0)
    expect(r.gaps[0].key).toBe('rpt.g.noNoc')
  })

  it('免费端:在招与薪资照给,担保雇主进锁区', () => {
    const r = gateReport(buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 7 })), false)
    expect(r.conclusions.map((c) => c.key)).toEqual(['rpt.j.openNamed', 'rpt.j.wageBelow'])
    expect(r.locked).toEqual(['sponsors'])
    expect(r.lanes).toHaveLength(0)     // 三卡是拿 PR 那张卡的三条轴,别张卡不硬套
  })

  it('Pro 端:担保雇主结论完整下发,锁区为空', () => {
    const r = gateReport(buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 7 })), true)
    expect(r.conclusions.some((c) => c.key === 'rpt.j.sponsors')).toBe(true)
    expect(r.locked).toHaveLength(0)
  })
})

describe('卡⑥ 职业规划', () => {
  const peers = [
    occStat({ noc: '31300', titleEn: 'Nurse coordinators', open: 50, medianWage: 108_000 }),
    occStat({ noc: '32101', titleEn: 'Licensed practical nurses', open: 200, medianWage: 63_000 }),
    occStat({ noc: '33102', titleEn: 'Nurse aides', open: 400, medianWage: 45_000 }),
    occStat({ noc: '31302', titleEn: 'Nurse practitioners', open: 30, medianWage: 130_000 }),
    occStat({ noc: '31303', titleEn: 'Zero-opening occupation', open: 0, medianWage: 200_000 }),
  ]

  it('按中位薪资降序取前两个进结论,后面的进备选;零在招的不进(不给钱多没岗的空头)', () => {
    const r = buildCareerReport(normalizeProfile({}), facts, occ({ peers }))
    expect(r.conclusions.filter((c) => c.key === 'rpt.k.peer').map((c) => c.params.noc)).toEqual(['31302', '31300'])
    expect(r.alternatives.map((a) => a.params.noc)).toEqual(['32101', '33102'])
    expect(r.conclusions.some((c) => c.params.noc === '31303')).toBe(false)
  })

  it('首条是你这行的现状,带在招量与官方中位', () => {
    const r = buildCareerReport(normalizeProfile({}), facts, occ({ peers }))
    expect(r.conclusions[0].key).toBe('rpt.k.selfWage')
    expect(r.conclusions[0].params).toMatchObject({ open: 300, teer: 1, esdc: '90K' })
  })

  it('转换路径没数据 → 缺口恒在,不拿模型编「你能转」', () => {
    const r = buildCareerReport(normalizeProfile({}), facts, occ({ peers }))
    expect(r.gaps.some((g) => g.key === 'rpt.k.noPath')).toBe(true)
  })

  it('同大类没有别的在招职业 → 说没有,不出空页', () => {
    const r = buildCareerReport(normalizeProfile({}), facts, occ({ peers: [] }))
    expect(r.gaps.some((g) => g.key === 'rpt.k.none')).toBe(true)
    expect(r.confidence).toBe('mid')
  })

  it('免费端:现状与相邻职业本身免费(库里查得到),跃迁幅度与完整榜进锁区', () => {
    const r = gateReport(buildCareerReport(normalizeProfile({}), facts, occ({ peers })), false)
    expect(r.conclusions.map((c) => c.key)).toEqual(['rpt.k.selfWage', 'rpt.k.peer', 'rpt.k.peer'])
    expect(r.alternatives).toHaveLength(0)
    expect(r.locked).toEqual(['move'])
  })

  it('跃迁幅度以你自己的职业为基准算,所以它在锁区', () => {
    const r = buildCareerReport(normalizeProfile({}), facts, occ({ peers }))
    const g = r.conclusions.find((c) => c.key === 'rpt.k.peerGap')!
    expect(g.params).toMatchObject({ occ: 'Nurse practitioners', pct: 44 })   // 130K vs 90K
  })
})

describe('卡③ 选省份', () => {
  const provDims: MatchDims = {
    pnpOccupations: [
      { province: 'BC', label: 'BC Health Authority stream', type: 'indemand', noc: '31301', url: 'https://gov.bc.ca/health', fetched: '2026-07-20' },
      { province: 'SK', label: 'SK health stream', type: 'indemand', noc: '31301', url: 'https://sk.ca/health', fetched: '2026-07-19' },
      { province: 'AB', label: 'AAIP ineligible list', type: 'ineligible', noc: '31301', url: 'https://alberta.ca/inelig', fetched: '2026-07-18' },
      { province: 'MB', label: 'MB in-demand', type: 'indemand', noc: '99999', url: 'https://mb.ca/list', fetched: '2026-07-18' },
    ],
    eeCategories: [], designatedEmployers: [],
  } as unknown as MatchDims
  const provFacts: ReportFacts = {
    ...facts,
    byProv: [
      { province: 'BC', open: 19, named: 18 }, { province: 'SK', open: 31, named: 5 },
      { province: 'ON', open: 430, named: 0 }, { province: 'AB', open: 40, named: 0 },
      { province: 'QC', open: 60, named: 0 }, { province: 'NL', open: 3, named: 0 },
    ],
  }

  it('进了公开清单的省排前面,排除清单上的沉底', () => {
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, provFacts)
    expect(r.conclusions[0].key).toBe('rpt.p.best')
    expect(r.conclusions[0].params.prov).toBe('BC')          // 18 具名 > SK 的 5
    expect(r.conclusions[1].params.prov).toBe('SK')
    // 排除清单上的省不是「备选」:归缺口并带官方出处,不混进排序
    expect(r.alternatives.some((a) => a.params.prov === 'AB')).toBe(false)
    const ab = r.gaps.find((g) => g.key === 'rpt.c.excluded' && g.params.prov === 'AB')!
    expect(ab.source?.url).toBe('https://alberta.ca/inelig')
  })

  it('QC 单独说明走自己体系,不参与排序', () => {
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, provFacts)
    expect(r.gaps.some((g) => g.key === 'rpt.c.qc')).toBe(true)
    expect(r.conclusions.some((c) => c.params.prov === 'QC')).toBe(false)
  })

  it('本站没收录清单的省只计数,不冒充「查过没有」', () => {
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, provFacts)
    expect(r.gaps.find((g) => g.key === 'rpt.g.uncoveredN')?.params.n).toBe(1)   // NL
  })

  it('有 offer → 雇主通道排进下一步;没有 → 出缺口', () => {
    const yes = buildProvReport(normalizeProfile({}), { hasJobOffer: true }, provDims, provFacts)
    expect(yes.nextSteps[0].key).toBe('rpt.n.employer')
    expect(yes.confidence).toBe('high')
    const no = buildProvReport(normalizeProfile({}), { hasJobOffer: false }, provDims, provFacts)
    expect(no.gaps.some((g) => g.key === 'rpt.g.noOffer')).toBe(true)
    expect(no.nextSteps.some((s) => s.key === 'rpt.n.employer')).toBe(false)
  })

  it('免费端:前两个省的判定与出处照给,完整排序进锁区', () => {
    const r = gateReport(buildProvReport(normalizeProfile({}), { hasJobOffer: false }, provDims, provFacts), false)
    expect(r.conclusions.map((c) => c.key)).toEqual(['rpt.p.best', 'rpt.p.second'])
    expect(r.conclusions[0].source?.url).toBe('https://gov.bc.ca/health')
    expect(r.alternatives).toHaveLength(0)
    expect(r.locked).toEqual(['rank'])
  })
})
