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
  noc: '31301', province: 'all', titleEn: 'Registered nurses', titleZh: '注册护士', titleKo: '등록 간호사', teer: 1, broad: '3', mid: '31', fine: '3130',
  open: 300, named: 120, medianWage: 90_000, medianPosted: 81_000, ...p,
})
const occ = (p: Partial<OccStats> = {}): OccStats => ({ self: occStat({}), byProv: [], peers: [], sponsors: 0, sponsorsLmia: 0, sponsorList: [], ...p })

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

  // B2-2/B2-3(2026-08-03):LMIA 家数是比「发过可提名岗」硬一档的证据,与 sponsors 同一个 WHERE 数出来;
  // 合规行(联邦规定雇主不得转嫁招聘费)跟着雇主句走 —— 「包 offer 套餐」最贵的部分是违法的,这句免费。
  it('雇主句多态:有 LMIA 记录带「其中 M 家」;合规提醒跟随;0 家雇主两句都不出', () => {
    const withLmia = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 40, sponsorsLmia: 12 }))
    expect(withLmia.conclusions.find((c) => c.key === 'rpt.j.sponsorsLmia')?.params).toMatchObject({ n: 40, m: 12 })
    const noFee = withLmia.conclusions.find((c) => c.key === 'rpt.j.noFee')!
    expect(noFee.source?.url).toContain('protected-rights')
    const noLmia = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 40 }))
    expect(noLmia.conclusions.some((c) => c.key === 'rpt.j.sponsors')).toBe(true)
    expect(noLmia.conclusions.some((c) => c.key === 'rpt.j.sponsorsLmia')).toBe(false)
    const zero = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ())
    expect(zero.conclusions.some((c) => c.key.startsWith('rpt.j.sponsors') || c.key === 'rpt.j.noFee')).toBe(false)
    // 免费层必留(ALWAYS_FREE):这两句是免费层的 aha 与法律提醒,不许被「其余 N 条」桶吃掉
    const free = gateReport(withLmia, false)
    expect(free.conclusions.some((c) => c.key === 'rpt.j.sponsorsLmia')).toBe(true)
    expect(free.conclusions.some((c) => c.key === 'rpt.j.noFee')).toBe(true)
  })

  it('没选职业 → 单缺口报告(不给空页)', () => {
    const r = buildJobReport(normalizeProfile({}), dims, { ...facts, noc: '' }, occ({ self: null }))
    expect(r.conclusions).toHaveLength(0)
    expect(r.gaps[0].key).toBe('rpt.g.noNoc')
  })

  it('相关职业也在招:同小类邻居免费给两条,各带自己的报告深链(一个人不该被一个 NOC 框死)', () => {
    const peers = [
      occStat({ noc: '21231', titleEn: 'Software engineers', titleZh: '软件工程师', open: 900 }),
      occStat({ noc: '21211', titleEn: 'Data scientists', titleZh: '数据科学家', open: 300 }),
      occStat({ noc: '21220', titleEn: 'Cybersecurity', titleZh: '网络安全', open: 0 }),   // 零在招不进
    ]
    const r = buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ peers }))
    const rel = r.conclusions.filter((c) => c.key === 'rpt.j.related')
    expect(rel.map((c) => c.params.noc)).toEqual(['21231', '21211'])
    expect(rel[0].url).toBe('/plan/job?noc=21231&view=report')
  })

  // 2026-08-01 雇主线索落地时改口径:「有 N 家雇主发过清单岗」这句**留在免费层**
  //(它是这张卡最像 aha 的一句,锁掉等于免费层什么都没有);锁的是名单本体,锁行由 employers 非空触发。
  it('免费端:在招/薪资/「有 N 家」照给,雇主名单进锁区', () => {
    const sponsorList = [{ name: 'A Health', slug: 'a-health', named: 2, eligible: 2, city: 'Regina', province: 'SK', lastPosted: '2026-07-17', lmiaPositions: 5, lmiaQuarter: '2026Q1', aip: false }]
    const r = gateReport(buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 7, sponsorList })), false)
    // B2-3 起雇主句后跟合规行(联邦不得转嫁招聘费);此例 sponsorsLmia=0 → 雇主句走无 LMIA 形态
    expect(r.conclusions.map((c) => c.key)).toEqual(['rpt.j.openNamed', 'rpt.j.wageBelow', 'rpt.j.sponsors', 'rpt.j.noFee'])
    expect(r.employers).toEqual([])     // 名单不在响应体里(不是前端打码)
    expect(r.locked).toEqual(['sponsors'])
    expect(r.lanes).toHaveLength(0)     // 三卡是拿 PR 那张卡的三条轴,别张卡不硬套
  })

  it('免费端:名单为空时不挂锁行(不卖不存在的东西)', () => {
    const r = gateReport(buildJobReport(normalizeProfile({ targetProvinces: ['BC'] }), dims, facts, occ({ sponsors: 0 })), false)
    expect(r.locked).not.toContain('sponsors')
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

  // 2026-08-03 把四张卡读全文之后拆掉这张卡的付费墙:锁区只有「$130K 比 $90K 高 44%」这一次除法,
  // 加上再多 3 个同门职业的在招与中位 —— 而本卡的「下一步」正把用户往 /stats 送,那页免费列着同样两列。
  // 卖我们同时白送的东西,会把拿 PR 那张卡(真有货)的付费信任一起赔进去。
  it('整卡不设锁:跃迁幅度与完整榜都免费(锁区只有一次除法,那不值钱)', () => {
    const r = gateReport(buildCareerReport(normalizeProfile({}), facts, occ({ peers })), false)
    expect(r.locked).toEqual([])
    expect(r.conclusions.map((c) => c.key)).toEqual(['rpt.k.selfWage', 'rpt.k.peer', 'rpt.k.peer', 'rpt.k.peerGap'])
    expect(r.alternatives.length).toBeGreaterThan(0)     // 完整榜照给
  })

  it('跃迁幅度以你自己的职业为基准算(免费给,但数得对)', () => {
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
      { province: 'ON', open: 43, named: 0 }, { province: 'AB', open: 40, named: 0 },
      { province: 'QC', open: 60, named: 0 }, { province: 'NL', open: 3, named: 0 },
    ],
  }

  // 2026-08-03:命中清单仍排前面,但「首选」这个词只给**够得着**的省(在招 ≥ 全国最大省的 1/10)。
  // 实撞:软开 21232 在 AB 科技清单上却只有 2 个在招(ON 有 47),旧文案照样叫「首选 AB」——
  // 具名通道再好,没 offer 一切归零。降级会让「清单收了你」整条消失,所以改措辞不改排序。
  it('命中但当地几乎没岗:不叫「首选」,并指出岗位实际在哪', () => {
    const thin = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, {
      ...provFacts, byProv: [{ province: 'BC', open: 2, named: 2 }, { province: 'ON', open: 47, named: 0 }],
    })
    // 2026-08-03 当天二次改判:ON 是 exclusion 省(不公布清单),TEER 达标即算「能走」,
    // 47 岗的它当首选;2 岗的 BC 落到后面,但**「清单收了你、可惜没岗」这句仍要出**,不许整条消失。
    const thinLine = thin.conclusions.find((c) => c.key === 'rpt.p.thinHit')!
    expect(thinLine.params).toMatchObject({ prov: 'BC', open: 2, maxProv: 'ON', maxOpen: 47 })
    expect(thin.conclusions.filter((c) => c.key === 'rpt.p.best' || c.key === 'rpt.p.bestAll')
      .every((c) => c.params.prov !== 'BC')).toBe(true)   // 2 岗的省不许叫「首选」
  })

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

  // 2026-08-03 实撞:路由没把 answers.goal 传进 ProvExtra(与 body.goal 卡种同名不同物),
  // 生产上两种诉求返回逐字节相同 —— 排序目标形同虚设。引擎侧从这条锁死两种诉求必须排出不同的头名。
  it('诉求改变排序:先找工作按在招量排,拿身份按清单排', () => {
    const pr = buildProvReport(normalizeProfile({}), { hasJobOffer: null, goal: 'pr' }, provDims, provFacts)
    expect(pr.conclusions[0].params.prov).toBe('BC')
    const work = buildProvReport(normalizeProfile({}), { hasJobOffer: null, goal: 'work' }, provDims, provFacts)
    expect(work.conclusions[0].params.prov).toBe('ON')       // 43 岗,在招量第一
    expect(work.conclusions[0].key).toBe('rpt.p.screen')     // ON 制度性无清单 → 粗筛措辞,不冒充查过
    expect(work.conclusions[1]).toMatchObject({ key: 'rpt.p.second', params: expect.objectContaining({ prov: 'SK' }) })
  })

  // 2026-08-01 Frank 点名的那句废话(「就一个职位,怎么叫全部」):清单收的是**职业**,
  // 该职业在清单上,该省这个职业的在招岗自然全都算 —— 拿 PR 与找工作当天改成了多态,这张卡漏了,
  // 2026-08-03 读全文才发现(实见 SK「在招 12 岗,其中 12 个是省提名清单岗」)。
  it('全命中不说「其中 N 个」;0 具名也不说(会跟上半句「在清单上」打架)', () => {
    const all = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, {
      ...provFacts, byProv: [{ province: 'BC', open: 19, named: 19 }, { province: 'SK', open: 12, named: 12 }],
    })
    expect(all.conclusions.map((c) => c.key)).toEqual(['rpt.p.bestAll', 'rpt.p.secondAll'])
    // 部分命中才值得说 N/M(BC 19 开 18 具名 = ON 那种 GTA 限制岗/AIP 分路的真·部分)
    expect(buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, provFacts)
      .conclusions[0].key).toBe('rpt.p.best')
    // 在清单上却 0 具名(该省岗位没打 pnp_stream 的数据缺口)→ 走全量句式,不写「其中 0 个」
    const zero = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, {
      ...provFacts, byProv: [{ province: 'BC', open: 19, named: 0 }],
    })
    expect(zero.conclusions[0].key).toBe('rpt.p.bestAll')
  })

  it('QC 单独说明走自己体系,不参与排序', () => {
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, provDims, provFacts)
    expect(r.gaps.some((g) => g.key === 'rpt.c.qc')).toBe(true)
    expect(r.conclusions.some((c) => c.params.prov === 'QC')).toBe(false)
  })

  // 2026-08-03:NL 已核为 exclusion(主线不列职业),不再算「未收录」→ 十省里已无 uncovered。
  // 这条护栏改成盯**真没数据的辖区**(如未核对的三级地区),口径不变:只计数,不冒充「查过没有」。
  it('本站没收录清单的辖区只计数,不冒充「查过没有」', () => {
    const dims = { ...provDims }
    const facts = { ...provFacts, byProv: [...provFacts.byProv, { province: 'YT', open: 3, named: 0 }] }
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null }, dims, facts)
    expect(r.gaps.find((g) => g.key === 'rpt.g.uncoveredN')?.params.n).toBe(1)   // YT
    expect(r.conclusions.every((c) => c.key !== 'rpt.c.listedMiss')).toBe(true)
  })

  // B1-2 学徒序(2026-08-03 木匠案例):0 经验时「选省」是第二步。缺口行拿**最宽松那档**官方经验门槛
  // 说话(TEER 不匹配的行不算;库里没有经验行就不出 —— 判不了不编);下一步同一条链接换措辞:
  // 「看在招岗」→「先拿下第一份岗」。有经验或没答 → 一切照旧。
  it('0 经验:出学徒序缺口(最宽松官方门槛)+ 下一步换成先找第一份岗', () => {
    const reqs = [
      { province: 'SK', subject: 'applicant', factor: 'experience', value: 12, appliesTeer: '' },
      { province: 'AB', subject: 'applicant', factor: 'experience', value: 24, appliesTeer: '' },
      { province: 'PE', subject: 'applicant', factor: 'experience', value: 6, appliesTeer: '4,5' },   // TEER 不匹配,不许当最宽松
    ] as unknown as import('@/lib/rules').Requirement[]
    const r = buildProvReport(normalizeProfile({}), { hasJobOffer: null, totalExpMonths: 0 }, provDims, { ...provFacts, requirements: reqs })
    expect(r.gaps.find((g) => g.key === 'rpt.g.zeroExp')?.params.need).toBe(12)
    expect(r.nextSteps.some((s) => s.key === 'rpt.n.firstJob')).toBe(true)
    expect(r.nextSteps.some((s) => s.key === 'rpt.n.jobs')).toBe(false)
    const exp = buildProvReport(normalizeProfile({}), { hasJobOffer: null, totalExpMonths: 24 }, provDims, { ...provFacts, requirements: reqs })
    expect(exp.gaps.some((g) => g.key === 'rpt.g.zeroExp')).toBe(false)
    expect(exp.nextSteps.some((s) => s.key === 'rpt.n.jobs')).toBe(true)
    // 库里没有官方经验行 → 缺口不出(不拿「先攒经验」冒充官方结论),但下一步措辞照换(那是建议不是判定)
    const bare = buildProvReport(normalizeProfile({}), { hasJobOffer: null, totalExpMonths: 0 }, provDims, provFacts)
    expect(bare.gaps.some((g) => g.key === 'rpt.g.zeroExp')).toBe(false)
    expect(bare.nextSteps.some((s) => s.key === 'rpt.n.firstJob')).toBe(true)
    // B1-3:首选省有官方标「不要经验/带训」的岗 → 第一份岗那条带具体数(rpt.n.firstJobA)
    const withA = buildProvReport(normalizeProfile({}), { hasJobOffer: null, totalExpMonths: 0 }, provDims, {
      ...provFacts, requirements: reqs,
      byProv: provFacts.byProv.map((r) => (r.province === 'BC' ? { ...r, apprentice: 4 } : r)),
    })
    const fj = withA.nextSteps.find((s) => s.key === 'rpt.n.firstJobA')!
    expect(fj.params).toMatchObject({ prov: 'BC', aN: 4 })
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
