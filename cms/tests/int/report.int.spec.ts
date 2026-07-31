// 报告引擎快照测试(L2-01 §2.2 四条铁律逐条锁死)。纯函数,不需要 DB。
// 黄金样例 = 2026-07-30 省清单四态判定时人工核过的三例:
//   BC 护士 17 全命中 / ON 童护 430 岗 0 命中(制度性,不是「不在清单」)/ 软工 BC 0 命中 AB 9 全命中。
// 规则改动 → 这里必然红 → 有意识地更新,不静默漂移。
import { describe, it, expect } from 'vitest'
import { normalizeProfile, type MatchDims } from '@/lib/match'
import { buildPrReport, reportLineEn, type ReportFacts } from '@/lib/report'

// ── fixture 维度(形状与生产 dims 一致,数据虚构但结构真实)──
// BC/AB 清单式(有 named 行);ON 不公布清单(NO_LIST_PROVINCES → exclusion);NL 本站未覆盖(无行)
const dims: MatchDims = {
  pnpOccupations: [
    { province: 'BC', label: 'BC Health Authority stream', type: 'indemand', noc: '31301', url: 'https://gov.bc.ca/health', fetched: '2026-07-20' },
    { province: 'BC', label: 'BC childcare stream', type: 'indemand', noc: '42202', url: 'https://gov.bc.ca/childcare', fetched: '2026-07-20' },
    { province: 'AB', label: 'Alberta tech list', type: 'indemand', noc: '21232', url: 'https://alberta.ca/tech', fetched: '2026-07-18' },
    { province: 'AB', label: 'AAIP ineligible list', type: 'ineligible', noc: '65200', url: 'https://alberta.ca/inelig', fetched: '2026-07-18' },
  ],
  eeCategories: [
    { category: 'stem', label: 'STEM', noc: '21232', drawCrs: 491, drawDate: '2026-06-04', url: 'https://canada.ca/ee', fetched: '2026-07-01' },
    { category: 'health', label: 'Healthcare', noc: '31301', drawCrs: 422, drawDate: '2026-05-13', url: 'https://canada.ca/ee', fetched: '2026-07-01' },
  ],
}

const facts = (o: Partial<ReportFacts>): ReportFacts => ({
  noc: '', title: '', teer: null, byProv: [], draws: [], scoreProvinces: ['BC', 'SK'], fetched: '2026-07-31', ...o,
})
const keys = (ls: { key: string }[]) => ls.map((l) => l.key)

// 基本 4 题答满的底座档案(confidence 至少 mid)
const base = (over: object = {}) => normalizeProfile({ currentStatus: 'working', clb: 8, targetProvinces: ['BC'], ...over })
const exp12 = { canadianExpMonths: 14 }

describe('黄金样例(省清单四态 × 报告口径)', () => {
  it('BC 护士 31301:17 全命中 → listedHit 带清单出处;附注册认证卡点(句式①)', () => {
    const r = buildPrReport(base(), exp12, dims, facts({
      noc: '31301', title: 'Registered nurses', teer: 1,
      byProv: [{ province: 'BC', open: 17, named: 17 }],
    }))
    const hit = r.conclusions.find((c) => c.key === 'rpt.c.listedHit')!
    expect(hit.params).toMatchObject({ prov: 'BC', open: 17, named: 17 })
    expect(hit.source?.url).toBe('https://gov.bc.ca/health')
    expect(keys(r.conclusions)).toContain('rpt.c.regulated')     // 他只说了职业,认证是替他想到的
    expect(r.nextSteps.find((n) => n.key === 'rpt.n.jobs')?.url).toBe('/?prov=BC&q=31301')
    expect(r.confidence).toBe('mid')
  })

  it('ON 童护 42202:430 岗 0 具名 → 制度性 screenPass,绝不说「不在清单」', () => {
    const r = buildPrReport(base({ targetProvinces: ['ON'] }), exp12, dims, facts({
      noc: '42202', title: 'Early childhood educators', teer: 2,
      byProv: [{ province: 'ON', open: 430, named: 0 }],
    }))
    expect(keys(r.conclusions)).toContain('rpt.c.screenPass')
    expect(keys(r.conclusions)).not.toContain('rpt.c.listedMiss')   // 红线:exclusion 省不冒充「查过没有」
    const line = r.conclusions.find((c) => c.key === 'rpt.c.screenPass')!
    expect(line.params).toMatchObject({ prov: 'ON', open: 430 })
    // 备选(④ 预判下一问):BC 有童护清单 → 该省若有岗应入 alternatives(此例 byProv 无 BC 行,不出)
  })

  it('软工 21232:BC 清单查过不在(listedMiss)+ AB 9 全命中入备选', () => {
    const r = buildPrReport(base(), exp12, dims, facts({
      noc: '21232', title: 'Software developers', teer: 1,
      byProv: [{ province: 'BC', open: 120, named: 0 }, { province: 'AB', open: 9, named: 9 }],
    }))
    const miss = r.conclusions.find((c) => c.key === 'rpt.c.listedMiss')!
    expect(miss.params).toMatchObject({ prov: 'BC', open: 120 })
    const alt = r.alternatives.find((a) => a.key === 'rpt.a.prov')!
    expect(alt.params).toMatchObject({ prov: 'AB', open: 9, named: 9 })
    expect(alt.source?.url).toBe('https://alberta.ca/tech')
  })
})

describe('四态其余两态 + 排除清单', () => {
  it('uncovered(NL):只说未收录,不下结论', () => {
    const r = buildPrReport(base({ targetProvinces: ['NL'] }), exp12, dims, facts({ noc: '31301', title: 'RN', teer: 1 }))
    expect(keys(r.conclusions)).toContain('rpt.c.uncovered')
    expect(keys(r.conclusions)).not.toContain('rpt.c.listedMiss')
  })
  it('QC:自有体系,不评估', () => {
    const r = buildPrReport(base({ targetProvinces: ['QC'] }), exp12, dims, facts({ noc: '31301', title: 'RN', teer: 1 }))
    expect(keys(r.conclusions)).toContain('rpt.c.qc')
  })
  it('AB 排除清单职业 → excluded fail 带出处', () => {
    const r = buildPrReport(base({ targetProvinces: ['AB'] }), exp12, dims, facts({ noc: '65200', title: 'Food service', teer: 5 }))
    const ex = r.conclusions.find((c) => c.key === 'rpt.c.excluded')!
    expect(ex.verdict).toBe('fail')
    expect(ex.source?.url).toBe('https://alberta.ca/inelig')
  })
})

describe('抽选线红线:通道对不上不给差分', () => {
  const bcDraws = [
    { province: 'BC', drawDate: '2026-07-22', stream: 'Skilled Worker', score: 118 },
    { province: 'BC', drawDate: '2026-07-08', stream: 'Health Authority', score: 60 },
    { province: 'BC', drawDate: '2026-06-25', stream: 'Skilled Worker', score: 121 },
    { province: 'BC', drawDate: '2026-06-10', stream: 'Skilled Worker', score: 116 },
  ]
  it('多通道混抽 + 有估分 → 只给区间(scoreBand),不给单一差分', () => {
    const r = buildPrReport(base(), exp12, dims, facts({
      noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 17, named: 17 }],
      draws: bcDraws, scores: { BC: { total: 105, passMark: null, system: 'BC SIRS', url: 'https://gov.bc.ca/sirs', fetched: '2026-07-20' } },
    }))
    expect(keys(r.conclusions)).toContain('rpt.c.scoreBand')
    expect(keys(r.conclusions)).not.toContain('rpt.c.scoreAbove')
    expect(keys(r.conclusions)).not.toContain('rpt.c.scoreBelow')
    const band = r.conclusions.find((c) => c.key === 'rpt.c.scoreBand')!
    expect(band.params).toMatchObject({ lo: 60, hi: 121, n: 4 })   // 样本小就说小:n 必带
  })
  it('单一通道 → 可给差分(scoreBelow 带 gap)', () => {
    const one = bcDraws.filter((d) => d.stream === 'Skilled Worker')
    const r = buildPrReport(base(), exp12, dims, facts({
      noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 17, named: 17 }],
      draws: one, scores: { BC: { total: 105, passMark: null, system: 'BC SIRS', url: 'https://gov.bc.ca/sirs', fetched: '2026-07-20' } },
    }))
    const below = r.conclusions.find((c) => c.key === 'rpt.c.scoreBelow')!
    expect(below.params).toMatchObject({ total: 105, cutoff: 118, gap: 13, date: '2026-07-22' })
  })
  it('没估分:只摆事实区间(drawBand)+ 缺口「答分数题可算」(BC 有官方分值表)', () => {
    const r = buildPrReport(base(), exp12, dims, facts({
      noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 17, named: 17 }], draws: bcDraws,
    }))
    expect(keys(r.conclusions)).toContain('rpt.c.drawBand')
    expect(keys(r.gaps)).toContain('rpt.g.answerScore')
  })
  it('不公布算分的省(ON 无分值表无线)→ noScoreTable 缺口,不硬编分差', () => {
    const r = buildPrReport(base({ targetProvinces: ['ON'] }), exp12, dims, facts({
      noc: '42202', title: 'ECE', teer: 2, byProv: [{ province: 'ON', open: 430, named: 0 }],
    }))
    expect(keys(r.gaps)).toContain('rpt.g.noScoreTable')
  })
})

describe('句式⑤ 时间窗 + EE 独立信号 + 经验门槛', () => {
  it('签证 8 个月 × 近 4 次抽选 → window 带 rounds 与 n(样本数)', () => {
    const p = normalizeProfile({ currentStatus: 'working', clb: 8, targetProvinces: ['BC'], pgwpMonthsLeft: 8 })
    const r = buildPrReport(p, exp12, dims, facts({
      noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 17, named: 17 }],
      draws: [
        { province: 'BC', drawDate: '2026-07-22', stream: 'SW', score: 118 },
        { province: 'BC', drawDate: '2026-07-10', stream: 'SW', score: 121 },
        { province: 'BC', drawDate: '2026-06-28', stream: 'SW', score: 116 },
        { province: 'BC', drawDate: '2026-06-16', stream: 'SW', score: 119 },
      ],
    }))
    const w = r.conclusions.find((c) => c.key === 'rpt.c.window')!
    expect(w.params).toMatchObject({ months: 8, days: 12, n: 4 })
    expect(w.params.rounds).toBe(Math.floor((8 * 30.4) / 12))
  })
  it('EE:没 CRS → 类别线事实 + noCrs 缺口;有 CRS → 差分', () => {
    const noCrs = buildPrReport(base(), exp12, dims, facts({ noc: '21232', title: 'SW dev', teer: 1, byProv: [{ province: 'BC', open: 5, named: 0 }] }))
    expect(keys(noCrs.conclusions)).toContain('rpt.c.ee')
    expect(keys(noCrs.gaps)).toContain('rpt.g.noCrs')
    const withCrs = buildPrReport(base({ crs: 480 }), exp12, dims, facts({ noc: '21232', title: 'SW dev', teer: 1, byProv: [] }))
    const below = withCrs.conclusions.find((c) => c.key === 'rpt.c.eeBelow')!
    expect(below.params).toMatchObject({ crs: 480, draw: 491, gap: 11 })
    expect(withCrs.confidence).toBe('high')   // 探索层(CRS)已答 → high
  })
  it('加拿大经验 6 个月 → expShort 缺口带官方出处;14 个月 → expOk 结论', () => {
    const short = buildPrReport(base(), { canadianExpMonths: 6 }, dims, facts({ noc: '31301', title: 'RN', teer: 1, byProv: [] }))
    const g = short.gaps.find((x) => x.key === 'rpt.g.expShort')!
    expect(g.params).toMatchObject({ months: 6, need: 12 })
    expect(g.source?.url).toContain('canada.ca')
    const ok = buildPrReport(base(), exp12, dims, facts({ noc: '31301', title: 'RN', teer: 1, byProv: [] }))
    expect(keys(ok.conclusions)).toContain('rpt.c.expOk')
  })
})

describe('无解不给空页 + confidence + EN 渲染', () => {
  it('没填职业 → 单缺口报告(缺口本身就是结论),confidence low', () => {
    const r = buildPrReport(base(), exp12, dims, facts({ noc: '' }))
    expect(r.conclusions).toHaveLength(0)
    expect(keys(r.gaps)).toEqual(['rpt.g.noNoc'])
    expect(r.confidence).toBe('low')
  })
  it('目标省 0 在招 → zeroJobs 缺口(不是空页)', () => {
    const r = buildPrReport(base(), exp12, dims, facts({ noc: '31301', title: 'RN', teer: 1, byProv: [] }))
    expect(keys(r.gaps)).toContain('rpt.g.zeroJobs')
  })
  it('基本题缺答 → confidence low + basics 缺口计数', () => {
    const p = normalizeProfile({ currentStatus: 'working', targetProvinces: ['BC'] })   // clb 未答
    const r = buildPrReport(p, { canadianExpMonths: null }, dims, facts({ noc: '31301', title: 'RN', teer: 1, byProv: [] }))
    expect(r.confidence).toBe('low')
    expect(r.gaps.find((g) => g.key === 'rpt.g.basics')?.params).toMatchObject({ n: 2 })
  })
  it('每个 key 都有 EN 渲染(advisor grounding 不落回裸键)', () => {
    const r = buildPrReport(base({ crs: 480, pgwpMonthsLeft: 8 }), { canadianExpMonths: 6 }, dims, facts({
      noc: '31301', title: 'RN', teer: 1,
      byProv: [{ province: 'BC', open: 17, named: 17 }, { province: 'AB', open: 3, named: 0 }],
      draws: [
        { province: 'BC', drawDate: '2026-07-22', stream: 'SW', score: 118 },
        { province: 'BC', drawDate: '2026-06-16', stream: 'HA', score: 60 },
      ],
      scores: { BC: { total: 105, passMark: null, system: 'BC SIRS', url: 'https://gov.bc.ca/sirs', fetched: '2026-07-20' } },
    }))
    for (const l of [...r.conclusions, ...r.gaps, ...r.nextSteps, ...r.alternatives]) {
      expect(reportLineEn(l), l.key).not.toBe(l.key)
    }
  })
})
