// 报告引擎快照测试(L2-01 §2.2 四条铁律逐条锁死)。纯函数,不需要 DB。
// 黄金样例 = 2026-07-30 省清单四态判定时人工核过的三例:
//   BC 护士 17 全命中 / ON 童护 430 岗 0 命中(制度性,不是「不在清单」)/ 软工 BC 0 命中 AB 9 全命中。
// 规则改动 → 这里必然红 → 有意识地更新,不静默漂移。
import { describe, it, expect } from 'vitest'
import { normalizeProfile, type MatchDims } from '@/lib/match'
import { buildPrReport, gateReport, reportLineEn, type ReportFacts } from '@/lib/report'
import type { ScoreFactor } from '@/lib/pnpSelfScore'

// ── fixture 维度(形状与生产 dims 一致,数据虚构但结构真实)──
// BC/AB 清单式(有 named 行);ON 不公布清单(NO_LIST_PROVINCES → exclusion);NL 本站未覆盖(无行)
const dims: MatchDims = {
  pnpOccupations: [
    { province: 'BC', label: 'BC Health Authority stream', type: 'indemand', noc: '31301', url: 'https://gov.bc.ca/health', fetched: '2026-07-20' },
    { province: 'BC', label: 'BC childcare stream', type: 'indemand', noc: '42202', url: 'https://gov.bc.ca/childcare', fetched: '2026-07-20' },
    { province: 'AB', label: 'Alberta tech list', type: 'indemand', noc: '21232', url: 'https://alberta.ca/tech', fetched: '2026-07-18' },
    { province: 'AB', label: 'AAIP ineligible list', type: 'ineligible', noc: '65200', url: 'https://alberta.ca/inelig', fetched: '2026-07-18' },
    { province: 'SK', label: 'SK health stream', type: 'indemand', noc: '31301', url: 'https://sk.ca/health', fetched: '2026-07-19' },
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
  it('注册类职业:认证排下一步①(v2c 编号行第一条就是最耗时的那步)', () => {
    const r = buildPrReport(base(), exp12, dims, facts({ noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 17, named: 17 }] }))
    expect(keys(r.nextSteps)[0]).toBe('rpt.n.cert')
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

// ── 付费闸(L2-03 v2c):裁剪在服务端 —— 免费响应里根本没有锁区正文 ──────────────
describe('gateReport 付费闸', () => {
  const bcDraws = [
    { province: 'BC', drawDate: '2026-07-22', stream: 'Skilled Worker', score: 118 },
    { province: 'BC', drawDate: '2026-07-08', stream: 'Health Authority', score: 60 },
    { province: 'BC', drawDate: '2026-06-25', stream: 'Skilled Worker', score: 121 },
    { province: 'BC', drawDate: '2026-06-10', stream: 'Skilled Worker', score: 116 },
  ]
  // 定稿效果图那一例:BC 护士,19 在招 18 具名;近 4 次多通道抽选;签证剩 8 个月;SK 可作备选
  const full = () => buildPrReport(base({ pgwpMonthsLeft: 8 }), exp12, dims, facts({
    noc: '31301', title: 'Registered nurses', teer: 1,
    byProv: [{ province: 'BC', open: 19, named: 18 }, { province: 'SK', open: 6, named: 6 }],
    draws: bcDraws,
  }))

  it('免费:结论只留前 2 条、备选清空、锁行按固定序去重', () => {
    const g = gateReport(full(), false)
    // 这一例 19 开 18 具名 = 真·部分命中 → listedHitPart(全命中时不说「其中 N 个」,2026-08-01 口径)
    expect(keys(g.conclusions)).toEqual(['rpt.c.listedHitPart', 'rpt.c.drawBand'])
    expect(g.alternatives).toEqual([])
    // score 不在锁行里:报告算不出省估分(facts.scores 永远为空),锁一个算不出的东西=卖空气
    expect(g.locked).toEqual(['window', 'alts', 'more'])
    expect(g.pro).toBe(false)
    // 缺口与下一步全给(钩子与引流不锁)
    expect(keys(g.gaps)).toContain('rpt.g.answerScore')
    expect(keys(g.nextSteps)).toContain('rpt.n.cert')
  })

  it('免费响应体里 grep 不到锁区正文(裁剪在服务端,devtools 也翻不出来)', () => {
    const body = JSON.stringify(gateReport(full(), false))
    expect(body).not.toContain('rpt.c.window')       // 时间窗:轮数是结论
    expect(body).not.toContain('rpt.a.prov')         // 备选省完整对照
    expect(body).not.toContain('rpt.c.expOk')
    expect(body).toContain('rpt.c.listedHit')        // 免费两条照旧下发
  })

  it('锁行只列引擎真能算的类别 —— 不卖不存在的东西', () => {
    // 无签证剩余(无 window)、无备选省、该省不公布分值表(无 score)
    const r = buildPrReport(base({ targetProvinces: ['ON'] }), exp12, dims, facts({
      noc: '42202', title: 'ECE', teer: 2, byProv: [{ province: 'ON', open: 430, named: 0 }],
    }))
    const g = gateReport(r, false)
    expect(g.locked).not.toContain('window')
    expect(g.locked).not.toContain('alts')
    expect(g.locked).not.toContain('score')
  })

  it('没填 CRS 时不锁 EE(该卖的是答题 hook);填了 CRS 才有分差可锁', () => {
    const noCrs = gateReport(full(), false)
    expect(noCrs.locked).not.toContain('ee')
    expect(noCrs.lanes.find((l) => l.kind === 'ee')?.key).toBe('rpt.lane.ee.noCrs')
    const withCrs = gateReport(buildPrReport(base({ crs: 400 }), exp12, dims, facts({
      noc: '31301', title: 'RN', teer: 1, byProv: [{ province: 'BC', open: 19, named: 18 }], draws: bcDraws,
    })), false)
    expect(withCrs.locked).toContain('ee')
    expect(withCrs.lanes.find((l) => l.kind === 'ee')?.key).toBe('rpt.lane.ee.below')
  })

  it('三卡=判定词(事实,免费):省提名 / EE / 备选省', () => {
    const g = gateReport(full(), false)
    expect(g.lanes.map((l) => l.kind)).toEqual(['prov', 'ee', 'alts'])
    const prov = g.lanes[0]
    expect(prov).toMatchObject({ key: 'rpt.lane.prov.hit', verdict: 'pass', params: { prov: 'BC' } })
    expect(g.lanes[2]).toMatchObject({ key: 'rpt.lane.alts', params: { prov: 'SK', n: 1 } })
  })

  it('卡点短句在免费层(说中他没说出口的事),带官方出处', () => {
    const g = gateReport(full(), false)
    expect(g.hint?.key).toBe('rpt.hint.cert')
    expect(g.hint?.source?.url).toBe('https://www.nnas.ca/')
    // 非注册职业:经验不足也是卡点
    const exp = gateReport(buildPrReport(base(), { canadianExpMonths: 6 }, dims, facts({
      noc: '21232', title: 'SW dev', teer: 1, byProv: [{ province: 'BC', open: 5, named: 0 }],
    })), false)
    expect(exp.hint?.key).toBe('rpt.hint.exp')
    expect(exp.hint?.params).toMatchObject({ months: 6, need: 12 })
  })

  it('Pro:全量下发,locked 空,备选照旧', () => {
    const g = gateReport(full(), true)
    expect(g.pro).toBe(true)
    expect(g.locked).toEqual([])
    expect(keys(g.conclusions)).toContain('rpt.c.window')
    expect(keys(g.alternatives)).toContain('rpt.a.prov')
    expect(g.lanes).toHaveLength(3)          // 三卡与卡点 Pro 也照出
    expect(g.hint?.key).toBe('rpt.hint.cert')
  })
})

describe('CRS 缺口不能是死路', () => {
  it('没填 CRS → 缺口与下一步都指官方 CRS 工具(站内没有计算器,别让人卡在这)', () => {
    const r = buildPrReport(base({ nocCodes: ['21232'] }), { canadianExpMonths: null }, dims, facts({ noc: '21232', teer: 1, byProv: [{ province: 'BC', open: 12, named: 0 }] }))
    const gap = r.gaps.find((g) => g.key === 'rpt.g.noCrs')
    const step = r.nextSteps.find((s) => s.key === 'rpt.n.crs')
    expect(gap?.url).toContain('canada.ca')
    expect(step?.url).toContain('canada.ca')
  })
})

describe('锁区不许卖算不出来的东西', () => {
  // 2026-08-01 换省对照(L2-08)之后口径改了:报告能按已答项算下界分了,score 由**算出来的那几行**触发。
  // 这条守的是另一半 —— 分值表数据没到位时(scoreFactors 空),照旧不挂 score 锁行,不卖空气。
  it('拿不到官方分值表时不锁「分差」——解锁后背后是空的', () => {
    const r = gateReport(buildPrReport(base(), exp12, dims, facts({
      noc: '31301', teer: 1, byProv: [{ province: 'BC', open: 19, named: 18 }],
      draws: [{ province: 'BC', drawDate: '2026-07-20', stream: 'Care: Health', score: 96 }],
    })), false)
    expect(r.gaps.some((g) => g.key === 'rpt.g.answerScore')).toBe(true)   // 缺口照说
    expect(r.nextSteps.some((s) => s.key === 'rpt.n.score')).toBe(true)    // 去估分的路照给
    expect(r.locked).not.toContain('score')                                // 但不当付费卖点
  })
})

// ── 换省对照节(L2-08):下界口径的四条红线 ──────────────────────────────────
// 分值表 fixture:BC(SIRS 200 分制、无申请门槛)/ SK(110 分制、门槛 60)/ AB 无表。
// 每省都留一个「未答就不该被匹上」的档位(BC 的 Below CLB 4、SK 的年龄档)。
const sf = (o: Partial<ScoreFactor>): ScoreFactor => ({
  province: 'BC', system: 'SIRS', factor: 'language', kind: 'row', seq: 0, label: '', points: 0,
  xorPrev: false, rule: '', factorMax: null, factorGroup: '', groupMax: null, passMark: null,
  maxTotal: 200, guideEffective: '2026-06-10', fetched: '2026-07-27', url: 'https://welcomebc.ca/grid',
  ...o,
})
const SK = { province: 'SK', system: 'SINP Points Grid', maxTotal: 110, passMark: 60, url: 'https://sk.ca/grid' }
const factors: ScoreFactor[] = [
  sf({ factor: 'language', seq: 0, label: 'CLB 9 or higher', points: 30 }),
  sf({ factor: 'language', seq: 1, label: 'CLB 8', points: 25 }),
  sf({ factor: 'language', seq: 2, label: 'CLB 7', points: 20 }),
  sf({ factor: 'language', seq: 3, label: 'Below CLB 4', points: 5 }),
  sf({ factor: 'work', seq: 0, label: '5 or more years', points: 20 }),
  sf({ factor: 'work', seq: 1, label: '1 year', points: 4 }),
  sf({ factor: 'education', seq: 0, label: "Master's degree", points: 17 }),
  sf({ ...SK, factor: 'language1', seq: 0, label: 'CLB 8 and higher', points: 20 }),
  sf({ ...SK, factor: 'language1', seq: 1, label: 'CLB 7', points: 18 }),
  sf({ ...SK, factor: 'work5', seq: 0, label: '5 years', points: 10 }),
  sf({ ...SK, factor: 'work5', seq: 1, label: '1 year', points: 2 }),
  sf({ ...SK, factor: 'age', seq: 0, label: '22 – 34 years', points: 12 }),
]
const swFacts = (o: Partial<ReportFacts> = {}) => facts({
  noc: '31301', title: 'RN', teer: 1, scoreFactors: factors,
  byProv: [{ province: 'BC', open: 19, named: 18 }, { province: 'SK', open: 12, named: 12 }],
  ...o,
})
const sw = (r: { switches: { key: string; params: Record<string, string | number>; url?: string }[] }, key: string) =>
  r.switches.find((l) => l.key === key)

describe('换省对照节(L2-08)', () => {
  it('现选省 BC:按已答的两项算下界分,并说清「已答 2/3 项」', () => {
    const r = buildPrReport(base(), exp12, dims, swFacts())
    const cur = sw(r, 'rpt.s.cur')
    expect(cur?.params.prov).toBe('BC')
    expect(cur?.params.total).toBe(29)    // CLB8 25 + 1 年经验 4;学历未答 0
    expect(cur?.params.have).toBe(2)
    expect(cur?.params.all).toBe(3)
  })

  it('未答的因素不许白捡分:没填语言时不会被兜到「Below CLB 4」那档', () => {
    const noClb = buildPrReport(normalizeProfile({ currentStatus: 'working', targetProvinces: ['BC'] }), exp12, dims, swFacts())
    const cur = sw(noClb, 'rpt.s.cur')
    expect(cur?.params.total).toBe(4)     // 只剩经验那 4 分,语言一分不给
    expect(cur?.params.have).toBe(1)
  })

  it('下界低于门槛只摆门槛、不说不达标;过了门槛才判「已达标」', () => {
    const below = sw(buildPrReport(base(), exp12, dims, swFacts()), 'rpt.s.alt.mark')
    expect(below?.params.mark).toBe(60)
    expect(below?.params.total).toBe(22)  // CLB8 20 + 1 年 2;年龄未答
    expect(below?.params.rest).toBe(1)    // 还差年龄这一项才判得了
    const easy = factors.map((f) => (f.province === 'SK' ? { ...f, passMark: 10 } : f))
    const passed = buildPrReport(base(), exp12, dims, swFacts({ scoreFactors: easy }))
    expect(sw(passed, 'rpt.s.alt.pass')?.params.mark).toBe(10)
    expect(sw(passed, 'rpt.s.alt.mark')).toBeUndefined()
  })

  it('无门槛但有抽选记录 → 摆抽选区间;没有分值表的省明说未公布', () => {
    const r = buildPrReport(base({ targetProvinces: ['SK'] }), exp12, dims, swFacts({
      draws: [
        { province: 'BC', drawDate: '2026-07-20', stream: 'Care: Health', score: 96 },
        { province: 'BC', drawDate: '2026-07-06', stream: 'Care: Health', score: 88 },
      ],
    }))
    const band = sw(r, 'rpt.s.alt.band')
    expect(band?.params.prov).toBe('BC')
    expect([band?.params.lo, band?.params.hi, band?.params.n]).toEqual([88, 96, 2])
    const ab = buildPrReport(base({ targetProvinces: ['AB'] }), exp12, dims, swFacts())
    expect(sw(ab, 'rpt.s.cur.noTable')?.params.prov).toBe('AB')
  })

  it('抽选线红线:打分表自报了通道,就只认同通道的抽选 —— 对不上说「这条通道还没抽选记录」', () => {
    // ON 的实况:新通道的分值表 + 逐轮公布的旧通道分数线,两者不是同一套分制,配在一起就是错的锚
    const on: ScoreFactor[] = factors.map((f) => (f.province === 'SK'
      ? { ...f, province: 'ON', system: 'OINP EOI points (Ontario Workforce Priority stream)', passMark: null, maxTotal: null }
      : f))
    const r = buildPrReport(base(), exp12, dims, swFacts({
      scoreFactors: on,
      byProv: [{ province: 'BC', open: 19, named: 18 }, { province: 'ON', open: 40, named: 0 }],
      draws: [{ province: 'ON', drawDate: '2026-05-14', stream: 'Employer Job Offer: Foreign Worker', score: 57 }],
    }))
    expect(sw(r, 'rpt.s.alt.band')).toBeUndefined()
    const nd = sw(r, 'rpt.s.alt.noDraw')
    expect(nd?.params.prov).toBe('ON')
    expect(nd?.params.system).toBe('OINP EOI points')   // 分制短名:自报通道那截不印进句子
  })

  it('免责常驻 + 缺项钩子指完整估分器', () => {
    const r = buildPrReport(base(), exp12, dims, swFacts())
    expect(r.switches[r.switches.length - 1].key).toBe('rpt.s.note')
    expect(sw(r, 'rpt.s.partial')?.url).toBe('/pathways')
  })

  it('付费闸:免费层只剩省级官方事实,分数一个都不下发,锁行落 score', () => {
    const built = buildPrReport(base(), exp12, dims, swFacts())
    const free = gateReport(built, false)
    expect(keys(free.switches)).toContain('rpt.s.cur.free')
    expect(keys(free.switches)).toContain('rpt.s.alt.mark.free')
    expect(keys(free.switches)).not.toContain('rpt.s.partial')
    expect(free.switches.every((l) => l.params.total === undefined && l.params.have === undefined)).toBe(true)
    expect(JSON.stringify(free.switches)).not.toContain('"total"')
    expect(free.locked).toContain('score')
    const pro = gateReport(built, true)
    expect(keys(pro.switches)).toContain('rpt.s.cur')
    expect(pro.locked).toEqual([])
  })

  it('免费层留住的是事实:门槛分与抽选区间照给(锁的只是你的分)', () => {
    const free = gateReport(buildPrReport(base(), exp12, dims, swFacts()), false)
    expect(sw(free, 'rpt.s.alt.mark.free')?.params.mark).toBe(60)
    expect(reportLineEn(free.switches[0])).toContain('official points grid')
  })
})
