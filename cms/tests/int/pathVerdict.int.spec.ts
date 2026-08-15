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
  jobPathways, pathVerdict, pathLevers,
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
  foreignExpSelfEmployed: true, hasOffer: false, inCanada: true,   // 在找工作(无 offer)+ 持 PGWP 在境内
  status: 'pgwp',
  province: 'ON',
  permit: 'pgwp',
  fieldMatch: null,
  frenchOk: null,
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
    // 2026-08-09 批B AIP 36 行入库后更新:门槛表 259 → 300(264 既有 + 36 AIP);
    // 2026-08-14 L2-09 用例横测补 RCIP 语言 3 行(TEER 档 CLB 6/5/4)→ 303
    // 2026-08-15 FCIP 立成通道,补它自己的 3 行(1,560 小时 / 指定雇主 offer / NCLC 5 法语)→ 306
    expect(data.requirements).toHaveLength(306)
    expect(data.requirements.filter((r) => r.program === 'FCIP')).toHaveLength(3)
    expect(data.requirements.filter((r) => r.program === 'AIP')).toHaveLength(36)
    expect(data.requirements.filter((r) => r.program === 'RCIP' && r.factor === 'language')).toHaveLength(3)
    expect(data.occupations).toHaveLength(630)
    // 分值表**按省钉**,不钉总数:钉总数时加一个省(2026-08-10 接纽省)只会报「164 变 192」,
    // 看不出是哪张表动了,红了也没人认领。按省钉,失败信息自己说出是哪个省的官方表变了。
    const byProvince: Record<string, number> = {}
    for (const row of data.scoreFactors) byProvince[row.province] = (byProvince[row.province] ?? 0) + 1
    // 2026-08-14 AB 入列(AAIP Worker EOI Points Grid 30 行,官方 PDF 人工核对)
    expect(byProvince).toEqual({ AB: 30, BC: 32, MB: 44, NL: 28, ON: 51, SK: 37 })
    expect(data.eeGrid).toHaveLength(380)
    // 抽选表与指定雇主名录**按周增长**(抽选每轮一行、名录每次抓取补差)——钉死行数是纯脆断言,
    // 只守「不许倒退」;门槛/清单/分值表那四张是政策表,改版要炸得出来,继续钉死。
    // 只守**抽选**不许倒退(kind='draw' 是历史,已发生的轮次不会消失;2026-08-12 起 ETL 并回历史)。
    // 不连 notice 一起数:那是官方「最新通告」,新的一来就替掉旧的,少一条是正常更替不是数据丢失
    //(实撞:总行数 146→145 全由一条 ON 通告更替造成,kind='draw' 两次都是 144)。
    expect(data.draws.filter((d) => d.kind === 'draw').length).toBeGreaterThanOrEqual(144)
    expect(data.designatedEmployers.length).toBeGreaterThanOrEqual(3867)
  })
  // 2026-08-15 FCIP 立成第 14 条(Frank「还有法语区,都拆成不同的策略文件吧」):
  // 它与 RCIP 社区不同、语言尺子不同(NCLC 5 法语一刀切),不是 RCIP 的别名
  it('注册表 14 条通道全部出结果', () => {
    const keys = run().map((v) => v.key).sort()
    expect(keys).toEqual([
      'AB-opportunity', 'AIP', 'BC-build', 'BC-sw', 'FCIP', 'FED-EE', 'MB-swm', 'NB-sw',
      'NL-intl-grad', 'NS-sw', 'ON-workforce', 'PE-sw', 'RCIP', 'SK-offer',
    ])
  })
})

// ── 金标 ①:excluded 两条 ───────────────────────────────────────────────────

describe('金标 ①:排除两条,各带官方 quote', () => {
  const list = run()

  // 2026-08-12 晚改口径:PE-sw 不再因为「不在 OID 清单上」整条判死 —— 官方原句(就在我们库里那行
  // 经验门槛的 label 里)写明「the Occupations in Demand stream requires only 12 months, but is
  // limited to its named NOC list」—— 受限的是 **OID 那个子通道**,Skilled Worker 走 TEER 0-3 + 24 个月,
  // 与清单无关。C01 是 TEER 3 的木匠 → Skilled Worker 适用 → 不该 excluded。
  it('excluded 恰好只剩 FED-EE', () => {
    expect(list.filter((v) => v.verdict === 'excluded').map((v) => v.key).sort()).toEqual(['FED-EE'])
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

  it('PE-sw:清单只关 OID 子通道不关整条线;24 个月经验差距单列为 gap', () => {
    const pe = byKey(list, 'PE-sw')
    // TEER 3 走得上 Skilled Worker 子通道(门槛行 applies_teer=0,1,2,3)→ 不在 OID 清单上不构成硬伤
    expect(pe.verdict).not.toBe('excluded')
    expect(pe.reasons.filter((r) => r.kind === 'excluded')).toHaveLength(0)
    // 24 个月是可积累项 → 摆成 gap,带官方原句
    const gap = pe.reasons.find((r) => r.kind === 'gap' && /24 个月/.test(r.text))
    expect(gap, 'PE 的 24 个月经验差距要单独摆出来').toBeTruthy()
    expect(gap!.quote).toContain('24 months')
    expect(gap!.evidence?.url).toContain('princeedwardisland.ca')
  })

  it('TEER 4/5 时清单仍然关死这条线(本站只收录了 SW/OID 两个子通道)', () => {
    // 同一份档案换成 TEER 5 职业:Skilled Worker 的 applies_teer 盖不到他 → 只剩 OID 可走 → 不在清单上就是硬伤
    const pe5 = run({ ...C01, noc: '65200', teer: 5 }).find((v) => v.key === 'PE-sw')!
    const hard = pe5.reasons.filter((r) => r.kind === 'excluded')
    expect(hard).toHaveLength(1)
    expect(hard[0].quote).toContain('named NOC list')
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

  // 2026-08-15 专业对口立成第四类闸后,C01 这份档案(没答对口题)在 NL 上**judged 不出来**了 ——
  // 这正是新闸要的:官方要求岗位与所学专业相关,没答就不许说「能走」。tier/理由的金标照旧验,
  // 只是要先把那道题答上(fieldMatch: true = 对口)。
  const nlProfile: VerdictProfile = { ...C01, fieldMatch: true }
  it('专业对口没答 → NL 判不了(不许当成对口放行)', () => {
    const nl = byKey(list, 'NL-intl-grad')
    expect(nl.verdict).toBe('needs-info')
    expect(nl.missingSlots ?? []).toContain('fieldMatch')
    expect(nl.reasons.some((r) => r.key === 'pv.gate.fieldMatch.unknown')).toBe(true)
  })

  it('tier0 = NL 国际毕业生(官方明说不设经验门槛)', () => {
    const nl = byKey(run(nlProfile), 'NL-intl-grad')
    expect(nl.verdict).toBe('open')
    expect(nl.tier).toBe(0)
    // 文案 2026-08-11 收短成「不要工作经验」;守的规矩没变:op=none 必须说成**官方没有这条门槛**,
    // 不能说成「本站没查到」—— 两者在用户那里意思相反。官方原句仍挂在这条理由上(下一行断言)。
    const none = nl.reasons.find((r) => /不要工作经验/.test(r.text))
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
    expect(byKey(list, 'AB-opportunity').verdict).toBe('open')
    expect(tierOf('AB-opportunity')).toBe(3)
    // BC 两条 08-12 白天还是 needs-info(指南没进 crawl → 境内/学历两类闸 unknown);当晚直提官方
    // Program Guide PDF 逐节读完(§3.1-3.13 通用 + §4.1 技术工人),两类闸都落实 → **自动翻回 open**。
    // 这正是当时留的话:「补上指南就自动翻回 open」—— 判定跟着数据走,没有一行代码为它开特例。
    for (const k of ['BC-sw', 'BC-build']) {
      expect(byKey(list, k).verdict, k).toBe('open')
      expect(byKey(list, k).availability, k).toBe('ok')
    }
    // BC Build 是定向抽选:72310 在定向清单上、抽选线 97 摆出来但不冒充成「你的分」
    const build = byKey(list, 'BC-build')
    expect(build.reasons.some((r) => /Build: construction trades/i.test(r.evidence?.label ?? ''))).toBe(true)
    // 抽选线**从数据里取最近一轮**,不钉死分数:Build 每轮都开(08-06 那轮 88 分已把 07-09 的 97 顶掉),
    // 钉一个分数 = 每来一轮抽选炸一次,炸的还不是引擎(2026-08-09 随批B 金标更新一并改口径)
    const lastBuild = data.draws.filter((d) => d.province === 'BC' && /Build: Construction Trades/.test(d.stream) && d.score != null)
      .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))[0]
    expect(lastBuild, 'BC Build 抽选行不该消失').toBeTruthy()
    expect(build.reasons.some((r) => r.text.includes(String(lastBuild.score)) && /最低邀请分/.test(r.text))).toBe(true)
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

    const lines = mb.reasons.find((r) => /上界 715/.test(r.text))
    expect(lines).toBeTruthy()
    expect(lines!.text).toContain('632')
    expect(lines!.text).toContain('825')
    expect(lines!.evidence?.url).toContain('immigratemanitoba.com')

    // 曼省的自雇/在学期间经验不计,官方原句在库里
    expect(mb.reasons.some((r) => /self-employment/i.test(r.quote ?? ''))).toBe(true)
  })

  it('排序:按**最难拆的那道障碍**排,excluded 沉底,同难度按 tier 升序', () => {
    // 2026-08-12 二拍(Frank 实拍):先前按判定桶排(能走→被卡住→判不了→排除),
    // 于是「被卡住」整桶压在「判不了」前面,**要读几年书的加拿大学历排在几周能拿的 offer 前面**。
    // 桶不是难度。现在是一把尺:none 0 < offer 1 < 境内 2 < 自雇 3 < 判不了 4 < 语言 5 < 加拿大学历 6 < 排除 9。
    const RANK: Record<string, number> = { offer: 1, statusInCanada: 2, selfEmployed: 3, language: 5, credentialCanada: 6 }
    const obstacle = (v: PathwayVerdict) =>
      v.verdict === 'excluded' ? 9 : v.blockedBy ? RANK[v.blockedBy] ?? 4 : v.verdict === 'needs-info' ? 4 : 0
    const ranks = list.map(obstacle)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    // 同难度内按 tier 升序
    for (const r of new Set(ranks)) {
      const tiers = list.filter((v) => obstacle(v) === r).map((v) => v.tier ?? 9)
      expect(tiers, `难度 ${r} 档内 tier 应升序`).toEqual([...tiers].sort((a, b) => a - b))
    }
    expect(list[list.length - 1].verdict).toBe('excluded')
  })

  it('语言差档不再冒充「现在就能走」:联邦 EE 被标 blockedBy=language 并让位', () => {
    // 2026-08-11 Frank 实拍:厨师 + 在加读书 + CLB 4 + 加拿大经验 0 → 方案第一条是联邦 EE。
    // CEC 要加拿大经验、FSW 要 CLB 7、FST 要 CLB 5 口语听力,三条全不通。
    // 档案照 Frank 那张截图配:基础卷只问 6 项,年龄/学历都没问过 → 传 null(与 /api/profile-pathways 一致)
    const weak = pathVerdict({
      age: null, married: null, clb: 4, edu: null, eduYears: null, canadaStudy: null, studyProvince: null,
      noc: '63200', teer: 3, expCanadaMonths: 0, expForeignMonths: 60, foreignExpSelfEmployed: null,
      hasOffer: false, inCanada: true,     // 在加读书、还没拿到 offer(新卷这两题都会问)
      status: 'study', province: null, permit: null, fieldMatch: null, frenchOk: null,
    }, data)
    const ee = weak.find((v) => v.key === 'FED-EE')!
    expect(ee.blockedBy).toBe('language')
    expect(weak[0].key).not.toBe('FED-EE')
    // 理由还在(判定卡照旧摆官方门槛),只是不再顶到方案第一位
    expect(ee.reasons.some((r) => r.kind === 'gap' && /语言门槛/.test(r.text))).toBe(true)
  })

  it('反事实(L2-09):hasOffer=true 重跑后,被 offer 卡住的路不再报 offer 缺口', () => {
    // /api/profile-pathways 的 afterOffer 就靠这个不变量:offer 闸放行后,徽标要么写「即可申请」,
    // 要么暴露下一道更硬的闸(语言/身份/学历)—— 绝不能还是 offer。
    // 档案照 Frank 2026-08-14 实拍:软件职业、在加读书、CLB 5、海外 5 年经验、有加拿大学历、无 offer
    const profile = {
      age: null, married: null, clb: 5, edu: null, eduYears: null, canadaStudy: true, studyProvince: null,
      noc: '21231', teer: 1, expCanadaMonths: 0, expForeignMonths: 60, foreignExpSelfEmployed: null,
      hasOffer: false, inCanada: true, status: 'study' as const, province: null, permit: null, fieldMatch: null, frenchOk: null,
    }
    const before = pathVerdict(profile, data)
    const offerBlocked = before.filter((v) => v.blockedBy === 'offer')
    expect(offerBlocked.length, '该档案至少一条路被 offer 卡住(实拍是三条)').toBeGreaterThan(0)
    const after = pathVerdict({ ...profile, hasOffer: true }, data)
    for (const v of offerBlocked) {
      const cf = after.find((x) => x.key === v.key)!
      expect(cf.blockedBy, `${v.key} 反事实后不许再报 offer`).not.toBe('offer')
      expect(cf.reasons.some((r) => r.kind === 'gap' && r.key === 'pv.gate.offer.gap'), `${v.key} 不许再有 offer 缺口理由`).toBe(false)
    }
  })

  // ── statusInCanada 拆闸(2026-08-15):「境内身份」底下是三种官方要求,inCanada 一个 bool 答不了 ──
  // 病灶实拍(Frank 学签档):AB「must have a valid work permit」、NL「Must hold a valid PGWP」
  // 全被「人在境内」放行,NL 排到第一只差 offer;NB「住满 6 个月」/MB「曼省在职」对安省居民照样放行。
  const student: VerdictProfile = {
    age: null, married: null, clb: 5, edu: 'bachelor', eduYears: null, canadaStudy: true, studyProvince: null,
    noc: '21234', teer: 1, expCanadaMonths: 0, expForeignMonths: 60, foreignExpSelfEmployed: null,
    hasOffer: false, inCanada: true, status: 'study', province: 'ON', permit: 'study', fieldMatch: null, frenchOk: null,
  }
  it('学签在读不再被工签/PGWP 闸放行:AB、PE 报差工签,NL 报差 PGWP(都不再只差 offer)', () => {
    const rows = pathVerdict(student, data)
    for (const key of ['AB-opportunity', 'PE-sw', 'NL-intl-grad']) {
      const v = byKey(rows, key)
      expect(v.blockedBy, `${key} 挡路的是身份闸,不是 offer`).toBe('statusInCanada')
    }
    // 文案跟判据对得上:AB 说工签、NL 说 PGWP,不再统称「境内身份」
    expect(byKey(rows, 'AB-opportunity').reasons.some((r) => r.key === 'pv.gate.statusInCanada.workPermit.gap')).toBe(true)
    expect(byKey(rows, 'NL-intl-grad').reasons.some((r) => r.key === 'pv.gate.statusInCanada.pgwp.gap')).toBe(true)
  })
  it('NB/MB 按现居省判:人在安省 → 两条都卡身份闸;没答现居省 → 判不了,不默认放行', () => {
    const rows = pathVerdict(student, data)
    expect(byKey(rows, 'NB-sw').reasons.some((r) => r.key === 'pv.gate.statusInCanada.provResidence.gap')).toBe(true)
    expect(byKey(rows, 'MB-swm').reasons.some((r) => r.key === 'pv.gate.statusInCanada.provEmployment.gap')).toBe(true)
    const noProv = pathVerdict({ ...student, province: null }, data)
    for (const key of ['NB-sw', 'MB-swm']) {
      const v = byKey(noProv, key)
      expect(v.verdict, `${key} 缺现居省只能判不了`).toBe('needs-info')
      expect(v.missingSlots ?? []).toContain('statusInCanada')
    }
  })
  it('工签在职的人照常过闸:在曼省工作 → MB 身份闸 met;在阿省持工签 → AB 只差 offer', () => {
    const worker: VerdictProfile = { ...student, status: 'worker', permit: 'work', province: 'MB', canadaStudy: null }
    const mb = byKey(pathVerdict(worker, data), 'MB-swm')
    expect(mb.reasons.some((r) => r.key === 'pv.gate.statusInCanada.provEmployment.met')).toBe(true)
    const ab = byKey(pathVerdict({ ...worker, province: 'AB' }, data), 'AB-opportunity')
    expect(ab.blockedBy).toBe('offer')
  })
  // ── 专业对口闸(2026-08-15 Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」→「加」)──────────
  // 官方:NL 国际毕业生的岗位要与所学专业相关;例外只给本省院校(Memorial/CNA)毕业生,
  // 且岗位要落在 TEER 0-3(TEER 4 要对紧缺清单 → 本站判不了)。省外院校反而更严。
  const grad = (over: Partial<VerdictProfile> = {}): VerdictProfile => ({
    ...C01, canadaStudy: true, permit: 'pgwp', status: 'pgwp', hasOffer: true, ...over,
  })
  it('对口 → 闸达标;跨专业 + 省外院校 → 报缺口(不是判不了)', () => {
    const ok = byKey(pathVerdict(grad({ fieldMatch: true }), data), 'NL-intl-grad')
    expect(ok.reasons.some((r) => r.key === 'pv.gate.fieldMatch.met')).toBe(true)
    // 安省院校 + 跨专业:官方明写省外院校 offer 要与专业**直接**相关 → 明确缺口
    const cross = byKey(pathVerdict(grad({ fieldMatch: false, studyProvince: 'ON' }), data), 'NL-intl-grad')
    expect(cross.blockedBy).toBe('fieldMatch')
    expect(cross.reasons.some((r) => r.key === 'pv.gate.fieldMatch.gap')).toBe(true)
  })
  it('本省院校例外按 TEER 分档:TEER 0-3 跨专业照走,TEER 4/5 判不了(要对紧缺清单)', () => {
    const inNl = (teer: number) => byKey(pathVerdict(
      grad({ fieldMatch: false, studyProvince: 'NL', noc: teer === 2 ? '72310' : '65310', teer }), data), 'NL-intl-grad')
    expect(inNl(2).reasons.some((r) => r.key === 'pv.gate.fieldMatch.met'), 'TEER 2 落在例外里').toBe(true)
    const t5 = inNl(5)
    expect(t5.reasons.some((r) => r.key === 'pv.gate.fieldMatch.unknown'), 'TEER 5 例外覆盖不到 → 判不了').toBe(true)
    expect(t5.blockedBy, '判不了不许写成缺口').not.toBe('fieldMatch')
  })
  it('选配闸不误伤别人:另外 12 条通道没声明这道闸 → 不因此判不了', () => {
    const rows = pathVerdict(grad({ fieldMatch: null }), data)
    for (const v of rows.filter((x) => x.key !== 'NL-intl-grad')) {
      expect(v.missingSlots ?? [], `${v.key} 不该因专业对口缺槽`).not.toContain('fieldMatch')
      expect(v.reasons.some((r) => String(r.key).startsWith('pv.gate.fieldMatch')), `${v.key} 不该出专业对口理由`).toBe(false)
    }
  })

  it('境外档不回归:inCanada=false 时五条通道的身份闸照旧全是缺口', () => {
    const overseas: VerdictProfile = { ...student, inCanada: false, status: 'other', permit: null, province: null, canadaStudy: false }
    const rows = pathVerdict(overseas, data)
    for (const key of ['AB-opportunity', 'PE-sw', 'NL-intl-grad', 'NB-sw', 'MB-swm']) {
      expect(byKey(rows, key).reasons.some((r) => r.kind === 'gap' && String(r.key).startsWith('pv.gate.statusInCanada.')), `${key} 境外必须是身份缺口`).toBe(true)
    }
  })
})

// ── 金标 ③:AIP 门槛已入库(2026-08-09 批B),从「缺口」翻成「判得了」──────────
//
// 本节原来断言的是**缺口本身**(AIP 0 行 → needs-info + not-collected,且一个字都不许提 1,560 小时)。
// 批B 把 36 行 quote-anchored 灌进库之后,那套断言测的是一个已经不存在的世界。
// 这里整节翻成**正向**:判得了、数字全部来自官方原句、TEER 分档挑得对。

describe('金标 ③:AIP 门槛已入库,判得了', () => {
  it('AIP = open + ok + tier2;1,560 小时按官方自写的「1 年」折成 12 个月', () => {
    // 2026-08-09 批B AIP 36 行入库后更新(原断言:needs-info + not-collected + 禁止出现 1,560)
    const aip = byKey(run(), 'AIP')
    expect(aip.verdict).toBe('open')
    expect(aip.availability).toBe('ok')
    expect(aip.tier).toBe(2)
    expect(aip.score, 'AIP 没有自评估分器 → 不给分').toBeUndefined()
    // 数字必须**出现**,而且必须来自官方原句(quote),不是代码里手写的
    expect(aip.reasons.some((r) => /1,560 hours/.test(r.quote ?? ''))).toBe(true)
    expect(aip.reasons.some((r) => r.kind === 'gap' && /工作经验门槛 12 个月/.test(r.text))).toBe(true)
    // 折算口径:小时数不许拿工时去除,只认 basis 里官方自己写的 minYears
    expect(aip.reasons.some((r) => /52|30 小时/.test(r.text)), '不许出现按工时反推的月数').toBe(false)
  })

  it('库里 AIP 门槛 36 行(断言的是数据在位,不再是缺口)', () => {
    // 2026-08-09 批B AIP 36 行入库后更新(原断言:toHaveLength(0))
    const aipRows = data.requirements.filter((r) => r.program === 'AIP')
    expect(aipRows).toHaveLength(36)
    expect(aipRows.every((r) => !!(r.valueText || r.label)), '每行都得有官方原句').toBe(true)
    expect(aipRows.every((r) => !!r.url), '每行都得有出处').toBe(true)
  })

  // ── 区间解析回归(2026-08-09 批C 修 fedLangApplies)───────────────────────
  // `teer-a-b` 是闭区间不是端点枚举。CEC/FSW 的 teer-0-1 / teer-2-3 端点=全集,当枚举读从没炸过;
  // 批B 的 AIP teer-0-3 当枚举读会让 **TEER 1 / TEER 2** 一条语言行都挑不到 →
  // 上游 langRowsSeen=0 输出「本站尚未收录 AIP 的语言门槛条文」,而库里明明有 = 假话。
  const aipLangOf = (teer: number) =>
    byKey(run({ ...C01, teer }), 'AIP').reasons.filter((r) => /语言门槛/.test(r.text))

  for (const teer of [0, 1, 2, 3]) {
    it(`teer-0-3 闭区间:TEER ${teer} 的 offer 挑得到 AIP 语言行 CLB 5`, () => {
      const rows = aipLangOf(teer)
      expect(rows, `TEER ${teer} 一条语言行都没挑到`).toHaveLength(1)
      expect(rows[0].text).toContain('CLB 5')
      expect(rows[0].kind).toBe('met')                    // C01 是 CLB 6
      expect(rows[0].quote).toContain('CLB 5 for job offer in TEER 0, 1, 2 or 3')
    })
  }

  it('teer-4:TEER 4 走 CLB 4 那一档,不串到 CLB 5', () => {
    const rows = aipLangOf(4)
    expect(rows).toHaveLength(1)
    expect(rows[0].text).toContain('CLB 4')
  })

  it('未收录语言门槛的假话不再出现(TEER 1/2 曾是重灾区)', () => {
    for (const teer of [0, 1, 2, 3, 4]) {
      const aip = byKey(run({ ...C01, teer }), 'AIP')
      expect(aip.reasons.some((r) => /尚未收录.*语言/.test(r.text)), `TEER ${teer}`).toBe(false)
    }
  })

  it('两种写法的解析:teer-0-3(区间)与 teer-4-5(区间,端点=全集)各自只覆盖自己那几档', () => {
    // 库里眼下只有 teer-0-3 / teer-4 两种;teer-4-5 这种写法用合成门槛行验,防下一批改口径时又踩回去
    const synth = (stream: string, value: number): Requirement => ({
      ...(data.requirements.find((r) => r.program === 'AIP' && r.factor === 'language') as Requirement),
      stream, value,
    })
    const synthData: VerdictData = {
      ...data,
      requirements: [
        ...data.requirements.filter((r) => !(r.program === 'AIP' && r.factor === 'language')),
        synth('teer-0-3', 5), synth('teer-4-5', 4),
      ],
    }
    const clbOf = (teer: number) => pathVerdict({ ...C01, teer }, synthData)
      .find((v) => v.key === 'AIP')!.reasons.filter((r) => /语言门槛/.test(r.text)).map((r) => /CLB (\d)/.exec(r.text)?.[1])
    expect([0, 1, 2, 3].map(clbOf)).toEqual([['5'], ['5'], ['5'], ['5']])
    expect([4, 5].map(clbOf)).toEqual([['4'], ['4']])
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
    // 找不到就当场报「没这一行」,而不是靠 `?.find(...)!` 把 undefined 断言掉 ——
    // 后者失败时抛的是「读不到 from」,看不出真正缺的是那条省份记录
    const on = clb!.gains?.find((g) => g.province === 'ON')
    expect(on, 'ON gain').toBeTruthy()
    expect([on!.from, on!.to, on!.delta]).toEqual([4, 12, 8])
    const mb = clb!.gains?.find((g) => g.province === 'MB')
    expect(mb, 'MB gain').toBeTruthy()
    expect([mb!.from, mb!.to, mb!.delta]).toEqual([695, 715, 20])
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
    // 2026-08-09 批B AIP 36 行入库后更新(原断言:['AIP'])——最后一条 not-collected 的通道被补齐了,
    // 13 条现在门槛行齐全。这条断言的意思不变:availability 只许由「库里有没有那条通道的门槛行」决定。
    // 2026-08-12:availability 的判据从「库里有没有门槛行」扩到「**门槛清单里那几类闸有没有条文**」——
    // 两者都是「本站未收录」。当晚把最后三条的窟窿补完(BC/PE 的官方指南 PDF、NB 换版后的新资格页),
    // **13 条通道现在一条 not-collected 都没有**。这个空数组是硬指标:再有通道掉进未收录,这条就红。
    // 2026-08-15 当晚补完:FCIP 的 3 行入库(build_ee_rules → mart → seed),**又回到一条不剩**。
    // 空数组仍是硬指标:再有通道掉进未收录,这条就红。
    expect(list.filter((v) => v.availability === 'not-collected').map((v) => v.key).sort())
      .toEqual([])
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
      noc: null, teer: null, expCanadaMonths: null, expForeignMonths: null, foreignExpSelfEmployed: null, hasOffer: null, inCanada: null,
      status: null, province: null, permit: null, fieldMatch: null, frenchOk: null,
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

// ── C6 · 职业级通道行(职位详情页通道卡的无档案态,一个个人档案槽都不吃)────────

describe('jobPathways:72310 TEER 2 的职业级名单', () => {
  const rows = jobPathways('72310', 2, data)
  const byK = (k: string) => rows.find((r) => r.key === k)!

  it('14 条全出;按经验门槛升序;NL(0 月)第一;PE 清单排除沉底', () => {
    expect(rows).toHaveLength(14)
    expect(rows[0].key).toBe('NL-intl-grad')
    expect(rows[0].months).toBe(0)
    expect(rows[rows.length - 1].key).toBe('PE-sw')
    expect(rows[rows.length - 1].excludedByList).toBe(true)
    const months = rows.filter((r) => !r.excludedByList && r.availability === 'ok').map((r) => r.months as number)
    expect(months).toEqual([...months].sort((a, b) => a - b))
  })

  it('口径与清单信号:MB 是同雇主在职时长;BC Build 清单点名;AIP 门槛已收录', () => {
    expect(byK('MB-swm').tenure).toBe(true)
    expect(byK('MB-swm').months).toBe(6)
    expect(byK('BC-build').listedIn).toBe(true)
    // 2026-08-09 批B AIP 36 行入库后更新(原断言:not-collected + months=null)
    expect(byK('AIP').availability).toBe('ok')
    expect(byK('AIP').months, '1,560 小时 = 官方自写的 1 年 → 12 个月').toBe(12)
    expect(byK('AIP').tenure, 'AIP 量的是同职业经验,不是同雇主在职时长').toBe(false)
  })

  it('清单适用范围不越界:SK OID/EE 那 152 条不把 Employment Offer 通道判死', () => {
    const oidOnly = data.occupations.find((o) => o.province === 'SK' && o.type === 'ineligible' && o.appliesTo === 'OID/EE')!
    const sk = jobPathways(oidOnly.noc, 2, data).find((r) => r.key === 'SK-offer')!
    expect(sk.excludedByList).toBe(false)
  })
})
