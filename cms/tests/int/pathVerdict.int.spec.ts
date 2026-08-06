// C5b · 判定层 pathVerdict 测试。
// fixture 不手抄:直接读 data/mart/*.json 的真数据(同 crsEstimate / mbEoi 两个测试的手法),
// 库里改版这里立刻炸,而不是让金标断言去猜。
//
// 金标 = 实施文档 C5b 节 ①-⑤(docs/implementation/C5-判定层pathVerdict-20260805.md),
// 档案 = 案例 C01 马龙(docs/design/案例C01-马龙木匠路径-路径分析-20260805.md §一):
//   40 岁 / 已婚但配偶在中国不随行 / CLB6 / Algonquin 两年制 Ontario College Diploma(加拿大学历,安省)/
//   NOC 72310 TEER 2 / 加拿大工作经验 0 / 海外经历全是自雇(开商店)/ 持 PGWP / 现居安省。
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  pathVerdict, pathLevers,
  type DesignatedEmployerRow, type OccupationRow, type PathwayVerdict,
  type VerdictData, type VerdictDrawRow, type VerdictProfile,
} from '@/lib/pathVerdict'
import type { Requirement } from '@/lib/rules'
import type { ScoreFactor } from '@/lib/pnpSelfScore'
import type { EeGridRow } from '@/lib/crsEstimate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

const data: VerdictData = {
  requirements: mart<Requirement>('pnp_requirements'),
  occupations: mart<OccupationRow>('pnp_occupations'),
  draws: mart<VerdictDrawRow>('pnp_draws'),
  scoreFactors: mart<ScoreFactor>('pnp_score_factors'),
  eeGrid: mart<EeGridRow>('ee_points_grid'),
  designatedEmployers: mart<DesignatedEmployerRow>('designated_employers'),
}

const C01: VerdictProfile = {
  age: 40,
  married: false,                 // 配偶在中国、不随行申请 → CRS 走 without-spouse 表
  clb: 6,
  edu: 'diploma2y',
  eduYears: 2,
  canadaStudy: true,
  studyProvince: 'ON',
  noc: '72310',
  teer: 2,
  expCanadaMonths: 0,
  expForeignMonths: 0,            // 海外全自雇 → 可计月数 0(同 crsEstimate 测试的上游口径)
  foreignExpSelfEmployed: true,
  status: 'pgwp',
  province: 'ON',
}

const run = (p: VerdictProfile = C01) => pathVerdict(p, data)
const byKey = (list: PathwayVerdict[], key: string): PathwayVerdict => {
  const hit = list.find((v) => v.key === key)
  expect(hit, `注册表里没有 ${key}`).toBeTruthy()
  return hit as PathwayVerdict
}

// ── 0. 数据实况(改版先在这里炸)──────────────────────────────────────────────

describe('mart 实况', () => {
  it('六张表的行数与 C4 入库一致', () => {
    expect(data.requirements).toHaveLength(259)
    expect(data.occupations).toHaveLength(630)
    expect(data.draws).toHaveLength(145)
    expect(data.scoreFactors).toHaveLength(164)
    expect(data.eeGrid).toHaveLength(380)
    expect(data.designatedEmployers).toHaveLength(3476)
  })
  it('注册表 13 条通道全部出结果', () => {
    const keys = run().map((v) => v.key).sort()
    expect(keys).toEqual([
      'AB-opportunity', 'AIP', 'BC-build', 'BC-sw', 'FED-EE', 'MB-swm', 'NB-sw',
      'NL-intl-grad', 'NS-sw', 'ON-workforce', 'PE-sw', 'RCIP', 'SK-offer',
    ])
  })
})

// ── 金标 ①:excluded 两条 ───────────────────────────────────────────────────

describe('金标 ①:排除两条,各带官方 quote', () => {
  const list = run()

  it('excluded 恰好是 FED-EE 与 PE-sw', () => {
    expect(list.filter((v) => v.verdict === 'excluded').map((v) => v.key).sort()).toEqual(['FED-EE', 'PE-sw'])
  })

  it('FED-EE:零经验进不了池(CEC/FSW/FST 三条门槛各带原句)+ CRS 199 对照 CEC 516,差距补不上', () => {
    const fed = byKey(list, 'FED-EE')
    expect(fed.verdict).toBe('excluded')
    expect(fed.tier).toBeNull()
    // 三条子通道的经验门槛都够不到,且都挂着官方原句
    const hard = fed.reasons.filter((r) => r.kind === 'excluded')
    expect(hard.length).toBeGreaterThanOrEqual(3)
    for (const r of hard) expect(r.quote).toBeTruthy()
    expect(hard.some((r) => /1,560/.test(r.quote ?? ''))).toBe(true)      // CEC/FSW 的官方原句里就有这个数
    expect(hard.some((r) => /3,120/.test(r.quote ?? ''))).toBe(true)      // FST
    // 估分与参照线
    expect(fed.score?.system).toBe('CRS')
    expect(fed.score?.value).toBe(199)                                     // 配偶不随行(单身表)
    expect(fed.score?.refLine).toBe(516)                                   // 最近一轮 CEC
    expect(fed.score?.refLabel).toContain('Canadian Experience Class')
    expect(fed.score?.evidence.url).toBeTruthy()
    // 「补不齐」= 语言拉到官方最高档的上界仍够不着这条线
    expect(fed.score!.ceiling).not.toBeNull()
    expect(fed.score!.ceiling as number).toBeLessThan(516)
  })

  it('FED-EE:配偶随行(已婚表)= 183,与 C5a-1 的修正值一致', () => {
    const fed = byKey(run({ ...C01, married: true }), 'FED-EE')
    expect(fed.score?.value).toBe(183)
    expect(fed.verdict).toBe('excluded')
  })

  it('PE-sw:清单型硬伤(72310 不在 PEI Occupations in Demand),24 个月另列为 gap', () => {
    const pe = byKey(list, 'PE-sw')
    expect(pe.verdict).toBe('excluded')
    expect(pe.tier).toBeNull()
    const hard = pe.reasons.filter((r) => r.kind === 'excluded')
    expect(hard).toHaveLength(1)
    expect(hard[0].quote).toContain('named NOC list')                      // 官方原文自己写明 OID 限于清单
    expect(hard[0].evidence?.url).toContain('princeedwardisland.ca')
    // 24 个月是可积累项 → 另列成 gap,不混进排除理由
    const gap = pe.reasons.find((r) => r.kind === 'gap' && /24 个月/.test(r.text))
    expect(gap, 'PE 的 24 个月经验差距要单独摆出来').toBeTruthy()
    expect(gap!.quote).toContain('24 months')
  })

  it('PEI 在需清单里确实只有助工 75110、没有木匠 72310(排除理由的事实底座)', () => {
    const peList = data.occupations.filter((o) => o.province === 'PE' && o.type === 'indemand')
    expect(peList.map((o) => o.noc)).toContain('75110')
    expect(peList.map((o) => o.noc)).not.toContain('72310')
  })
})

// ── 金标 ②:open 分档 ──────────────────────────────────────────────────────

describe('金标 ②:open 按「offer 到手后还要等多久」分档', () => {
  const list = run()
  const tierOf = (k: string) => byKey(list, k).tier

  it('tier0 = NL 国际毕业生(官方明说不设经验门槛)', () => {
    const nl = byKey(list, 'NL-intl-grad')
    expect(nl.verdict).toBe('open')
    expect(nl.tier).toBe(0)
    const none = nl.reasons.find((r) => /不设工作经验门槛/.test(r.text))
    expect(none, 'op=none 那一行必须说成「官方没有这条门槛」,不能说成「本站没查到」').toBeTruthy()
    expect(none!.quote).toContain('no minimum work-experience requirement')
    expect(none!.kind).toBe('met')
  })

  it('tier1 = ON Workforce Priority(毕业生 3 个月)与 NB Experience(6 个月 + 居住 6 个月)', () => {
    expect(tierOf('ON-workforce')).toBe(1)
    expect(tierOf('NB-sw')).toBe(1)
    const on = byKey(list, 'ON-workforce')
    // 近安省毕业生那一档(3 个月)覆盖通用 6 个月 —— 最具体优先
    expect(on.reasons.some((r) => /3 个月/.test(r.text) && /recent Ontario graduate/i.test(r.quote ?? ''))).toBe(true)
    // 语言:72310 属官方点名的技工大组 72 → 走 CLB 5 那一档,CLB6 达标
    expect(on.reasons.some((r) => r.kind === 'met' && /CLB 5/.test(r.text))).toBe(true)
    const nb = byKey(list, 'NB-sw')
    expect(nb.reasons.some((r) => /居住门槛 6 个月/.test(r.text))).toBe(true)
  })

  it('tier2 = NS、SK-offer、RCIP、MB-swm(12 个月)', () => {
    for (const k of ['NS-sw', 'SK-offer', 'RCIP', 'MB-swm']) {
      expect(byKey(list, k).verdict, k).toBe('open')
      expect(tierOf(k), k).toBe(2)
    }
    // RCIP 自雇不计:官方原句在库里,拿它说话
    const rcip = byKey(list, 'RCIP')
    expect(rcip.reasons.some((r) => (r.quote ?? '').includes('not be from a self-employed job'))).toBe(true)
  })

  it('tier3 = AB Opportunity、BC Skilled Worker、BC Build(24 个月)', () => {
    for (const k of ['AB-opportunity', 'BC-sw', 'BC-build']) {
      expect(byKey(list, k).verdict, k).toBe('open')
      expect(tierOf(k), k).toBe(3)
    }
    // BC Build 是定向抽选:72310 在定向清单上、抽选线 97 摆出来但不冒充成「你的分」
    const build = byKey(list, 'BC-build')
    expect(build.reasons.some((r) => /Build: construction trades/i.test(r.evidence?.label ?? ''))).toBe(true)
    expect(build.reasons.some((r) => /97/.test(r.text) && /Build: Construction Trades/.test(r.text))).toBe(true)
    expect(build.score, 'BC 没有自评估分器 → 不给 score,只摆线').toBeUndefined()
  })

  it('MB-swm 三条 warning:外省学习 −100 / 再叠外省工作 → 595 / 估分 695 天花板 715 对照 632 与 825', () => {
    const mb = byKey(list, 'MB-swm')
    expect(mb.score?.system).toBe('MPNP EOI')
    expect(mb.score?.value).toBe(695)
    expect(mb.score?.ceiling).toBe(715)
    expect(mb.score?.refLine).toBe(632)

    const study = mb.reasons.find((r) => (r.quote ?? '') === 'Studies in another province')
    expect(study, '外省学习 −100 必须带官方档位标签').toBeTruthy()
    expect(study!.text).toContain('100')

    const work = mb.reasons.find((r) => (r.quote ?? '') === 'Work experience in another province')
    expect(work, '「若先在外省上班」的反事实必须摆出来').toBeTruthy()
    expect(work!.text).toContain('595')

    const lines = mb.reasons.find((r) => /天花板 715/.test(r.text))
    expect(lines).toBeTruthy()
    expect(lines!.text).toContain('632')
    expect(lines!.text).toContain('825')
    expect(lines!.evidence?.url).toContain('immigratemanitoba.com')

    // 曼省的自雇/在学期间经验不计,官方原句在库里
    expect(mb.reasons.some((r) => /self-employment/i.test(r.quote ?? ''))).toBe(true)
  })

  it('排序:open 按 tier 升序在前 → needs-info → excluded 沉底', () => {
    const rank = (v: PathwayVerdict) => (v.verdict === 'open' ? 0 : v.verdict === 'needs-info' ? 1 : 2)
    const ranks = list.map(rank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    const tiers = list.filter((v) => v.verdict === 'open').map((v) => v.tier as number)
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b))
    expect(list[0].key).toBe('NL-intl-grad')
    expect(list[list.length - 1].verdict).toBe('excluded')
  })
})

// ── 金标 ③:AIP = needs-info(库缺行,不许拿文档记忆当库)────────────────────

describe('金标 ③:AIP 的经验门槛本站没收录', () => {
  it('AIP = needs-info + not-collected,并且一个字都不许提 1,560 小时', () => {
    const aip = byKey(run(), 'AIP')
    expect(aip.verdict).toBe('needs-info')
    expect(aip.availability).toBe('not-collected')
    expect(aip.tier).toBeNull()
    expect(aip.score).toBeUndefined()
    const text = JSON.stringify(aip)
    expect(/1560|1,560/.test(text), '库里没有 AIP 门槛行,任何数字都只能来自文档记忆 = 编造').toBe(false)
    expect(aip.reasons.some((r) => r.kind === 'needs-info' && /本站/.test(r.text))).toBe(true)
  })
  it('库里确实一行 AIP 门槛都没有(断言的是缺口本身)', () => {
    expect(data.requirements.filter((r) => r.program === 'AIP')).toHaveLength(0)
  })
})

// ── 金标 ④:SK 的清单适用范围 ──────────────────────────────────────────────

describe('金标 ④:SK Employment Offer 不受 OID/EE 那张 243 条清单约束', () => {
  it('两张 SK 清单的适用范围与条数(数据实况)', () => {
    const oid = data.occupations.filter((o) => o.province === 'SK' && o.type === 'ineligible' && o.appliesTo === 'OID/EE')
    const offer = data.occupations.filter((o) => o.province === 'SK' && o.type === 'ineligible' && o.appliesTo === 'Employment Offer')
    expect(oid).toHaveLength(152)
    expect(offer).toHaveLength(14)
    expect(oid.map((o) => o.noc)).not.toContain('72310')
    expect(offer.map((o) => o.noc)).not.toContain('72310')
  })
  it('SK-offer 判定里没有任何清单型排除', () => {
    const sk = byKey(run(), 'SK-offer')
    expect(sk.verdict).toBe('open')
    expect(sk.reasons.filter((r) => r.kind === 'excluded')).toHaveLength(0)
  })
  it('OID/EE 清单里的职业不会把 Employment Offer 通道判死(拿清单里的一条真码试)', () => {
    const oidOnly = data.occupations.find((o) => o.province === 'SK' && o.type === 'ineligible' && o.appliesTo === 'OID/EE')!
    const sk = byKey(run({ ...C01, noc: oidOnly.noc, teer: 2 }), 'SK-offer')
    expect(sk.verdict).not.toBe('excluded')
  })
})

// ── 金标 ⑤:杠杆 ──────────────────────────────────────────────────────────

describe('金标 ⑤:杠杆', () => {
  const levers = pathLevers(C01, data)

  it('75110(TEER 5)会把现在开着的通道判死 —— 结论是重跑注册表跑出来的,不是写死的', () => {
    const teer = levers.find((l) => l.key === 'teer-downgrade')
    expect(teer, '必须给出 TEER 降档警告').toBeTruthy()
    expect(teer!.text).toContain('75110')
    // NL(Day 0 那条)与 ON、PE 的门槛行都按 TEER 挑行 → TEER 5 直接掉出来
    expect(teer!.affected).toContain('NL-intl-grad')
    expect(teer!.affected).toContain('ON-workforce')
    for (const r of teer!.reasons ?? []) expect(r.quote).toBeTruthy()
  })

  it('CLB 6 → 8:ON +8、MB +20,两个数都是查官方分值表查出来的', () => {
    const clb = levers.find((l) => l.key === 'clb-boost')
    expect(clb).toBeTruthy()
    const on = clb!.gains?.find((g) => g.province === 'ON')!
    expect([on.from, on.to, on.delta]).toEqual([4, 12, 8])
    const mb = clb!.gains?.find((g) => g.province === 'MB')!
    expect([mb.from, mb.to, mb.delta]).toEqual([695, 715, 20])
    for (const g of clb!.gains ?? []) expect(g.evidence.url).toBeTruthy()
  })
})

// ── 攒满 12 个月曼省工作之后 ───────────────────────────────────────────────

describe('反事实:在曼省同一雇主攒满 12 个月之后', () => {
  const after: VerdictProfile = { ...C01, expCanadaMonths: 12, province: 'MB' }

  it('MB-swm:估分仍是 695(外省学习那 −100 跟着他走),tier 从 2 掉到 0', () => {
    expect(byKey(run(), 'MB-swm').tier).toBe(2)
    const mb = byKey(run(after), 'MB-swm')
    expect(mb.verdict).toBe('open')
    expect(mb.tier).toBe(0)
    expect(mb.score?.value).toBe(695)
    expect(mb.score?.ceiling).toBe(715)
    expect(mb.reasons.some((r) => /达标/.test(r.text) && /12 个月/.test(r.text))).toBe(true)
    // 在曼省上的班不触发「外省工作 −100」
    expect(mb.reasons.some((r) => (r.quote ?? '') === 'Work experience in another province' && /595/.test(r.text))).toBe(true)
  })

  it('同一年经验放在安省:安省 tier 归零,曼省反而被判死(先外省上班再 −100 → 天花板 615 < 632)', () => {
    const onWork: VerdictProfile = { ...C01, expCanadaMonths: 12, province: 'ON' }
    expect(byKey(run(onWork), 'ON-workforce').tier).toBe(0)
    // 曼省:外省工作经历不但不计,还再扣 100 → 语言拉满的上界都低于最近一轮抽选线 = 分数鸿沟
    const mb = byKey(run(onWork), 'MB-swm')
    expect(mb.verdict).toBe('excluded')
    expect(mb.score?.value).toBe(595)
    expect(mb.score!.ceiling as number).toBeLessThan(mb.score!.refLine as number)
  })
})

// ── 红线不变量 ────────────────────────────────────────────────────────────

describe('红线不变量', () => {
  const list = run()
  const allReasons = list.flatMap((v) => v.reasons)

  it('excluded 的理由必带官方 quote', () => {
    for (const v of list) {
      for (const r of v.reasons.filter((x) => x.kind === 'excluded')) {
        expect(r.quote, `${v.key} 的 excluded 理由没带 quote`).toBeTruthy()
      }
    }
  })

  it('每一条 quote 都逐字来自数据行(代码里没有手写的「官方原句」)', () => {
    // 允许的 quote 池:门槛行的 valueText / label、分值表行的 label、清单行按数据字段拼出的串
    const pool = new Set<string>()
    for (const r of data.requirements) { if (r.valueText) pool.add(r.valueText.trim()); if (r.label) pool.add(r.label.trim()) }
    for (const f of data.scoreFactors) if (f.label) pool.add(f.label.trim())
    for (const o of data.occupations) pool.add(`${o.stream} — ${o.noc} ${o.name}`)
    const quotes = allReasons.map((r) => r.quote).filter(Boolean) as string[]
    expect(quotes.length).toBeGreaterThan(10)
    for (const q of quotes) expect(pool.has(q), `这句 quote 不在数据里:${q}`).toBe(true)
  })

  it('挂了 evidence 的都带 url + fetched', () => {
    for (const r of allReasons) {
      if (!r.evidence) continue
      expect(r.evidence.url, r.text).toBeTruthy()
      expect(r.evidence.fetched, r.text).toBeTruthy()
    }
    for (const v of list) if (v.score) { expect(v.score.evidence.url).toBeTruthy(); expect(v.score.evidence.fetched).toBeTruthy() }
  })

  it('四态不合并:只有库里缺门槛行的通道才是 not-collected', () => {
    for (const v of list) {
      if (v.availability === 'not-collected') expect(v.verdict).toBe('needs-info')
      else expect(v.availability).toBe('ok')
    }
    expect(list.filter((v) => v.availability === 'not-collected').map((v) => v.key)).toEqual(['AIP'])
  })

  it('excluded 不带 tier;open 一定有 tier', () => {
    for (const v of list) {
      if (v.verdict === 'excluded') expect(v.tier).toBeNull()
      if (v.verdict === 'open') expect(v.tier).not.toBeNull()
    }
  })

  it('缺档案槽 → needs-info,不硬算(空档案不许出 open,也不许出 excluded)', () => {
    const blank: VerdictProfile = {
      age: null, married: null, clb: null, edu: null, eduYears: null, canadaStudy: null, studyProvince: null,
      noc: null, teer: null, expCanadaMonths: null, expForeignMonths: null, foreignExpSelfEmployed: null,
      status: null, province: null,
    }
    const out = run(blank)
    expect(out.every((v) => v.verdict === 'needs-info')).toBe(true)
    expect(out.every((v) => v.score === undefined)).toBe(true)
  })

  it('NL 指定雇主是 supporting fact:639 家里 3 家申报过 72310', () => {
    const nl = byKey(list, 'NL-intl-grad')
    const fact = nl.reasons.find((r) => /指定雇主/.test(r.text))!
    expect(fact.text).toContain('639')
    expect(fact.text).toContain('3 家')
    expect(fact.quote, 'NL 雇主名录不是官方条文,不许伪装成 quote').toBeUndefined()
  })
})
