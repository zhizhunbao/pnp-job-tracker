/**
 * C5c · 判定层接进对话编排。
 *
 * 被测链路是**真的**:orchestrate → normalizeSlots → collectFacts → lookupVerdict → pathVerdict;
 * 只有「数据库返回什么行」和「模型说什么」是 fixture。
 * 行数据不手抄 —— 直接读 `data/mart/*.json`(同 pathVerdict.int.spec.ts 的手法),再按 seed 白名单
 * 的 snake_case 列名喂回去:mart 改版这里立刻炸,而不是让金标断言去猜。
 *
 * 四条金标(实施文档 C5c 验收):
 *   ① C01 档案一句话进 → facts 里有 FED-EE 排除(CRS 199 对照 CEC 516)、NL tier0、ON tier1、
 *      MB 三条 warning、AIP「本站未收录」;
 *   ② 缺槽(只说职业)→ followups 反问那几个槽,facts 里一个裁决数字都没有;
 *   ③ 普通职位问法**不触发** lookupVerdict(按它独占的那张表计数);
 *   ④ guardAnswer 放行含裁决数字的答复、拦下编造的数字。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({ slots: '{}', answer: '判定结果在下面,每条都带官方出处。' }))
vi.mock('@/lib/llm', () => ({
  LlmError: class LlmError extends Error {},
  completeText: vi.fn(async (messages: { content: string }[]) =>
    (messages[0]?.content?.includes('turn one message') ? H.slots : H.answer)),
}))

import {
  filledProfileSlots, findForeignScript, guardAnswer, isPathQuestion, LBL, MIN_PROFILE_SLOTS,
  normalizeSlots, orchestrate, verdictFollowups, verdictProfileOf,
  type ChatLang, type Fact, type Slots,
} from '@/lib/chatOrchestrate'
import { lookupVerdict } from '@/lib/chatTools'

// ── mart → 「数据库行」(camelCase → seed 白名单的 snake_case)─────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = (name: string): any[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))
/** 只有一个键的驼峰拆法与列名对不上:mart 的 familySize 在库里叫 applies_family_size(见 seed 白名单)。 */
const COL_ALIAS: Record<string, string> = { family_size: 'applies_family_size' }
const snake = (rows: any[]): any[] => rows.map((r) => {
  const out: any = {}
  for (const [k, v] of Object.entries(r)) {
    const c = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    out[COL_ALIAS[c] ?? c] = v
  }
  return out
})

const REQ = snake(mart('pnp_requirements'))
const OCC = snake(mart('pnp_occupations'))
const DRAWS = snake(mart('pnp_draws'))
const FACTORS = snake(mart('pnp_score_factors'))
const GRID = snake(mart('ee_points_grid'))
const EMP = snake(mart('designated_employers')).filter((r) => r.province === 'NL')

const CARPENTER = '72310'
const JOB_ROWS = [
  { province: 'ON', open: 129, named: 0, apprentice: 4 },
  { province: 'MB', open: 24, named: 2, apprentice: 3 },
]

/** lookupVerdict 独占的那张表 —— 触发/不触发的计数探针(别的工具一个都不查它)。 */
const VERDICT_ONLY_TABLE = 'designated_employers'

class FakePool {
  calls: { sql: string; params: unknown[] }[] = []
  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    const has = (t: string) => sql.includes(t)
    if (has('etl_heartbeat')) return { rows: [{ last_seed: '2026-08-06T00:00:00.000Z' }] }
    // 顺序有讲究:noc_descriptions 那条 SQL 里也写着 stats_occupation
    if (has('FROM noc_descriptions')) return { rows: [{ title: 'Carpenters', teer: 2, noc: CARPENTER }] }
    if (has('FROM jobs')) return { rows: JOB_ROWS }
    if (has('FROM pnp_requirements')) return { rows: REQ }
    if (has('FROM pnp_occupations')) return { rows: OCC }
    if (has('FROM pnp_draws')) return { rows: params.length ? DRAWS.filter((d) => d.province === params[0]) : DRAWS }
    if (has('FROM pnp_score_factors')) return { rows: FACTORS }
    if (has('FROM ee_points_grid')) return { rows: GRID }
    if (has(`FROM ${VERDICT_ONLY_TABLE}`)) return { rows: EMP }
    return { rows: [] }         // ee_categories / pnp_ops_stats / stats_occupation / stats
  }
}

// C01 马龙(案例文档 §一):40 岁 / 已婚但配偶不随行 / CLB6 / 安省两年制大专 / 零经验 / NOC 72310
const C01_TEXT = '我 40 岁,已婚但太太不随行,CLB6,在安省读的两年制大专,零经验想做木工(NOC 72310),走哪条路?'
const C01_SLOTS = JSON.stringify({
  occ_en: 'carpenter', noc: '72310', provs: ['ON'], exp_months: 0, status: 'graduated',
  age: 40, married: false, clb: 6, edu: 'diploma2y', edu_years: 2, canada_study: true, study_prov: 'ON', claims: [],
})
const BARE_SLOTS = JSON.stringify({
  occ_en: 'carpenter', noc: '72310', provs: [], exp_months: null, status: null,
  age: null, married: null, clb: null, edu: null, edu_years: null, canada_study: null, study_prov: null, claims: [],
})

const verdictFacts = (facts: Fact[]) => facts.filter((f) => f.tool === 'lookupVerdict')
const said = (facts: Fact[]) => facts.map((f) => `${f.label}|${f.valueText}`).join('\n')

// ── ① 触发判据(纯函数,不连库)────────────────────────────────────────────────

describe('触发判据:问的是「走哪条路」+ 档案槽够用', () => {
  it('三语的路径问法都认得出来', () => {
    for (const q of ['我该走哪条路?', '走哪条通道最快', '我这种情况怎么移民', '零经验能不能移民',
      '我能不能拿到 PR?', 'which pathway should I take?', 'how can I immigrate with no experience',
      'what are my options here', 'can I qualify?', '어느 경로로 가야 하나요?']) {
      expect(isPathQuestion(q), q).toBe(true)
    }
  })

  it('普通职位/规则问法不算 —— 裁决会铺十几条通道,挤掉的是主线', () => {
    for (const q of ['曼省现在有多少木工岗位?', '安省对木匠的语言要求是多少?', 'What are the PGWP rules?',
      'carpenter jobs in Manitoba', '中介说包省提名可信吗?', '我能不能找到工作?', '最近一轮抽选多少分?',
      '哪个省的省提名不要求工作经验?']) {
      expect(isPathQuestion(q), q).toBe(false)
    }
  })

  it('档案槽计数:false 与 0 都算**有值**(它们是判定,不是缺失)', () => {
    const s = normalizeSlots({ married: false, exp_months: 0, age: 40 })
    expect(filledProfileSlots(s).sort()).toEqual(['age', 'expMonths', 'married'])
    expect(filledProfileSlots(s).length).toBeGreaterThanOrEqual(MIN_PROFILE_SLOTS)
    expect(filledProfileSlots(normalizeSlots({ occ_en: 'carpenter' }))).toEqual([])
  })

  it('数值槽越界当没说,不夹到边界(夹边界=替他编一个没说过的数)', () => {
    expect(normalizeSlots({ age: 400 }).age).toBeNull()
    expect(normalizeSlots({ clb: 0 }).clb).toBeNull()
    expect(normalizeSlots({ age: 40, clb: 6 })).toMatchObject({ age: 40, clb: 6 })
    // 「已婚」判的是**配偶随不随行**;说不清就 null,绝不折成 false(那会直接换一张 CRS 分表)
    expect(normalizeSlots({ married: 'yes' }).married).toBeNull()
    expect(normalizeSlots({ married: false }).married).toBe(false)
    expect(normalizeSlots({ edu: 'college' }).edu).toBeNull()
    expect(normalizeSlots({ edu: 'diploma2y', edu_years: 2, study_prov: '安省' }))
      .toMatchObject({ edu: 'diploma2y', eduYears: 2, studyProvince: 'ON' })
  })

  it('经验月数拆不出「在哪儿攒的」→ 只有 0 无歧义,>0 时两边都留 null', () => {
    const zero = verdictProfileOf({ ...normalizeSlots({ exp_months: 0 }), noc: CARPENTER }, 2)
    expect([zero.expCanadaMonths, zero.expForeignMonths]).toEqual([0, 0])
    const some = verdictProfileOf({ ...normalizeSlots({ exp_months: 24 }), noc: CARPENTER }, 2)
    expect([some.expCanadaMonths, some.expForeignMonths]).toEqual([null, null])
    expect(some.province, '问过的省不是住过的省,不许拿来冒充现居地').toBeNull()
  })
})

// ── ② 金标 C01:一句话进,裁决出 ────────────────────────────────────────────

describe('金标 C01:一句话进 → 不编数字的路径裁决', () => {
  let pool: FakePool
  beforeEach(() => { pool = new FakePool(); H.slots = C01_SLOTS; H.answer = '判定结果在下面,每条都带官方出处。' })

  it('facts 里有 FED-EE 排除(CRS 199 对照 CEC 516)、NL tier0、ON tier1、MB 三条 warning、AIP 未收录', async () => {
    const r = await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })
    const v = verdictFacts(r.facts)
    expect(v.length, '裁决 facts 没接进来').toBeGreaterThan(8)
    const T = LBL.zh
    const text = said(v)

    // FED-EE:排除 + 官方原句 + CRS 估分与抽选线
    const fed = v.filter((f) => f.label.includes('Express Entry'))
    expect(fed.some((f) => f.label.includes(T.vExcluded)), 'FED-EE 应判排除').toBe(true)
    expect(fed.some((f) => f.valueText.trim().length > 0), '排除的理由必须带官方原句').toBe(true)
    expect(fed.some((f) => f.value === 199 && f.unit === 'points'), 'CRS 估分 199(配偶不随行)').toBe(true)
    expect(fed.some((f) => f.value === 516), '最近一轮 CEC 的 516 要摆出来').toBe(true)
    // 抽选线那个数的出处必须是抽选页,不是分值表
    const ref = fed.find((f) => f.value === 516)!
    expect(ref.evidence.url).toBeTruthy()
    expect(ref.evidence.url).not.toBe(fed.find((f) => f.value === 199)!.evidence.url)

    // NL = Day 0(tier0),ON = tier1
    expect(v.some((f) => f.label.includes('NL ') && f.label.includes(T.vTier[0])), 'NL 应是 tier0').toBe(true)
    expect(v.some((f) => f.label.includes('ON ') && f.label.includes(T.vTier[1])), 'ON 应是 tier1').toBe(true)

    // MB 三条 warning:外省学习 −100 / 再叠外省工作 → 595 / 估分 695 天花板 715 对照 632
    expect(text).toContain('Studies in another province')
    expect(text).toContain('Work experience in another province')
    expect(text).toContain('595')
    expect(v.some((f) => f.value === 695)).toBe(true)
    expect(v.some((f) => f.value === 715)).toBe(true)
    expect(v.some((f) => f.value === 632)).toBe(true)

    // AIP:库里一行门槛都没有 → 四态说「本站未收录」,**不许**说成官方没有要求,更不许冒出 1,560
    const aip = v.find((f) => f.label.includes('Atlantic Immigration Program'))!
    expect(aip, 'AIP 那条要出现在 facts 里').toBeTruthy()
    expect(aip.unit).toBe('status')
    expect(aip.valueText).toContain('本站尚未收录')
    // 「1,560 小时」是 CEC/FSW 官方原句里的数(联邦那条通道真有),但它**不许出现在 AIP 这一行上** ——
    // 库里一行 AIP 门槛都没有,那条上的任何小时数都只能来自文档记忆 = 编造
    expect(/1,?560/.test(`${aip.label}|${aip.valueText}`), 'AIP 那条冒出了库里没有的小时数').toBe(false)

    // 杠杆:CLB 6→8 的加分是查官方分值表查出来的
    expect(v.some((f) => f.label.includes(T.vLeverClb(8)) && f.value === 8 && f.label.startsWith('ON'))).toBe(true)
    expect(v.some((f) => f.label.includes(T.vLeverClb(8)) && f.value === 20 && f.label.startsWith('MB'))).toBe(true)
  })

  it('每条裁决 fact 要么带出处、要么是我们自己的口径注(不许有没出处的裸数字)', async () => {
    const r = await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })
    for (const f of verdictFacts(r.facts)) {
      if (f.value == null) continue
      expect(f.evidence.url, `没出处的数字:${f.label}`).toBeTruthy()
      expect(f.evidence.fetched, `没抓取日的数字:${f.label}`).toBeTruthy()
    }
  })

  it('C6 选项卡:裁决已出而身份不明 → options 弹工签三选(推荐位第一);身份已知 → 不弹', async () => {
    // C01_SLOTS 带 status:'graduated' → 不弹(需要决定才弹,宁缺勿滥)
    const r1 = await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })
    expect(r1.options).toBeUndefined()
    // 同一份档案抠掉 status → 弹三张 + 理由行;followups[0] 同步点名问工签
    H.slots = C01_SLOTS.replace('"status":"graduated"', '"status":null')
    const r2 = await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })
    expect(r2.options).toBeTruthy()
    expect(r2.options!.items).toHaveLength(3)
    expect(r2.options!.items[0].recommended).toBe(true)
    expect(r2.options!.items[0].label).toContain('PGWP')
    expect(r2.options!.reason.length).toBeGreaterThan(3)
    for (const o of r2.options!.items) expect(o.sendText.length).toBeGreaterThan(3)
    // 工签问句只走选项卡,不再重复进 followups(chip 点击=以用户身份发话,发一句「助手问用户」的话是语义事故)
    expect(r2.followups).not.toContain(LBL.zh.vAsk.status)
  })

  it('配偶随行就换一张官方分表:CRS 183(和 C5a-1 的修正值一致)', async () => {
    H.slots = C01_SLOTS.replace('"married":false', '"married":true')
    const r = await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })
    const v = verdictFacts(r.facts)
    expect(v.some((f) => f.value === 183)).toBe(true)
    expect(v.some((f) => f.value === 199)).toBe(false)
  })

  it('英文答复的材料里一个汉字都不许有(pathVerdict 的理由是中文硬编码,只给中文用户)', async () => {
    const r = await orchestrate(pool, { text: 'I am 40, married, CLB 6, NOC 72310, no experience — which pathway should I take?', lang: 'en' })
    const v = verdictFacts(r.facts)
    expect(v.length).toBeGreaterThan(8)
    for (const f of v) {
      expect(findForeignScript(`${f.label} ${f.valueText}`, 'en'), `英文 facts 里混进了中文:${f.label}`).toEqual([])
    }
    // 中文没了,但数字与官方原句一条不少
    expect(v.some((f) => f.value === 199)).toBe(true)
    expect(v.some((f) => f.value === 516)).toBe(true)
    expect(said(v)).toContain('Studies in another province')
  })

  it('三语的裁决名目都是用户语言(降级清单直接印这些字)', async () => {
    for (const lang of ['zh', 'en', 'ko'] as ChatLang[]) {
      const T = LBL[lang]
      for (const s of [T.vScope, T.vPaths, T.vExcluded, T.vNeedsInfo, T.vWhy, T.vScore, T.vCeiling, T.vRefLine, ...T.vTier]) {
        expect(s.length, `${lang} 的裁决名目缺了`).toBeGreaterThan(3)
        expect(findForeignScript(s, lang), `${lang} 的裁决名目掺了别的语言:${s}`).toEqual([])
      }
      // tier 是区间分档,不是月数 —— 写成具体月数就是给一个区间编了一个精度
      for (const s of T.vTier) expect(/\d/.test(s), `${lang} 的 tier 文案里出现了数字:${s}`).toBe(false)
    }
  })
})

// ── ③ 缺槽:反问,不硬算 ───────────────────────────────────────────────────

describe('缺槽 → 反问那几个槽,一个裁决数字都不出', () => {
  it('只说了职业:followups 反问年龄/语言/学历,facts 里没有裁决行', async () => {
    const pool = new FakePool()
    H.slots = BARE_SLOTS
    const r = await orchestrate(pool, { text: '我想做木工(NOC 72310),走哪条路?', lang: 'zh' })
    expect(verdictFacts(r.facts), '槽都没有就不许出裁决').toEqual([])
    expect(pool.calls.some((c) => c.sql.includes(VERDICT_ONLY_TABLE))).toBe(false)
    const T = LBL.zh
    expect(r.followups.slice(0, 3)).toEqual([T.vAsk.age, T.vAsk.clb, T.vAsk.edu])
  })

  it('反问只问缺的那几个(已经说过的不再问一遍)', () => {
    const s = normalizeSlots({ age: 40, clb: 6 }) as Slots
    expect(verdictFollowups(s, 'zh')).toEqual([LBL.zh.vAsk.edu, LBL.zh.vAsk.married, LBL.zh.vAsk.canadaStudy])
    for (const lang of ['zh', 'en', 'ko'] as ChatLang[]) {
      for (const q of verdictFollowups(normalizeSlots({}) as Slots, lang)) {
        expect(findForeignScript(q, lang), `${lang} 的反问句掺了别的语言:${q}`).toEqual([])
      }
    }
  })
})

// ── ③b 主张只认用户自己的话(2026-08-06 生产实录 #36/#37)─────────────────────

describe('claims 硬闸:自家上一轮答复不许被抽成「你听到的」主张', () => {
  const OUR_LINE = '安省要求申请人的语言达到CLB6,工作经验满3个月,年薪至少$100,006/年'

  it('抽槽把 assistant 历史里的句子抽成 claim → 整条丢弃;真第三方主张原样留下', async () => {
    const pool = new FakePool()
    H.slots = JSON.stringify({
      occ_en: 'carpenter', noc: '72310', provs: ['ON'], exp_months: 0, status: null,
      age: null, married: null, clb: null, edu: null, edu_years: null, canada_study: null, study_prov: null,
      claims: [
        { text: OUR_LINE, topic: 'thresholds', province: 'ON' },              // 自家答复被误抽 → 该死
        { text: '中介说曼省有合作公司包提名', topic: 'private-promise', province: 'MB' },  // 真主张 → 该活
      ],
    })
    const r = await orchestrate(pool, {
      text: '其他省有机会吗', lang: 'zh',
      history: [
        { role: 'user', content: '安省大专毕业,做木工,还没工作,毕业后能留下吗?' },
        { role: 'assistant', content: `安省大专毕业后能否留下,取决于雇主工作。\n\n- ${OUR_LINE}\n- 目前安省在招岗位…` },
      ],
    })
    expect(r.slots.claims.map((c) => c.text), '自家门槛行还在 claims 里').toEqual(['中介说曼省有合作公司包提名'])
    expect(JSON.stringify(r.facts), 'facts 里不许出现拿自家答复当主张的对账行').not.toContain('100,006')
  })
})

// ── ④ 零回归:普通问法不触发 ───────────────────────────────────────────────

describe('普通职位问法不触发裁决(既有行为一步不改)', () => {
  it('问岗位数:一次都不查裁决专属的表,facts 里没有裁决行', async () => {
    const pool = new FakePool()
    H.slots = JSON.stringify({ occ_en: 'carpenter', noc: '72310', provs: ['MB'], exp_months: 0, status: null, claims: [] })
    const r = await orchestrate(pool, { text: '曼省现在有多少木工岗位?(NOC 72310)', lang: 'zh' })
    expect(pool.calls.some((c) => c.sql.includes(VERDICT_ONLY_TABLE)), 'lookupVerdict 不该被调起').toBe(false)
    expect(verdictFacts(r.facts)).toEqual([])
    expect(r.facts.some((f) => f.tool === 'lookupJobs'), '主线还在').toBe(true)
  })

  it('档案槽够了但问的不是路径 —— 照样不触发(两条判据缺一不可)', async () => {
    const pool = new FakePool()
    H.slots = C01_SLOTS
    const r = await orchestrate(pool, { text: '安省对木匠的语言要求是多少?(NOC 72310)', lang: 'zh' })
    expect(pool.calls.some((c) => c.sql.includes(VERDICT_ONLY_TABLE))).toBe(false)
    expect(verdictFacts(r.facts)).toEqual([])
  })
})

// ── ⑤ 出口校验:裁决的数字放行,编的数字照拦 ────────────────────────────────

describe('guardAnswer 对裁决数字的账', () => {
  let facts: Fact[]
  beforeEach(async () => {
    const pool = new FakePool()
    H.slots = C01_SLOTS
    facts = verdictFacts((await orchestrate(pool, { text: C01_TEXT, lang: 'zh' })).facts)
  })

  it('裁决算出来的数(199 / 516 / 695 / 715 / 632)照抄放行', () => {
    const g = guardAnswer('你现在的估分 199,对照最近一轮的 516;曼省算下来 695,语言拉满 715,那一轮的线是 632。', facts)
    expect(g.ok, `被误伤:${g.bad.join(',')}`).toBe(true)
  })

  it('🔴 编出来的裁决数字必须抓得到(这条是接线的立身之本)', () => {
    const g = guardAnswer('你的估分 461,曼省那一轮的线是 588,大概还差 37 分。', facts)
    expect(g.ok).toBe(false)
    expect(g.bad).toContain('461')
    expect(g.bad).toContain('588')
    expect(g.bad).toContain('37')
  })

  it('facts 为空时,裁决数字一个都不许出现(降级也不给凭空的分)', () => {
    expect(guardAnswer('你现在的估分 199。', []).ok).toBe(false)
    expect(guardAnswer('你现在缺的是第一份算数的工作。', []).ok).toBe(true)
  })
})

// ── ⑥ 工具层薄封装本身 ────────────────────────────────────────────────────

describe('lookupVerdict(薄封装)', () => {
  it('13 条通道 + 杠杆原样带出,四态按库里有没有门槛行说话', async () => {
    const pool = new FakePool()
    const r = await lookupVerdict(pool, verdictProfileOf({
      ...normalizeSlots({ age: 40, married: false, clb: 6, edu: 'diploma2y', edu_years: 2, canada_study: true, study_prov: 'ON', exp_months: 0 }),
      noc: CARPENTER,
    }, 2))
    expect(r.availability).toBe('ok')
    expect(r.pathways).toHaveLength(13)
    expect(r.pathways.filter((v) => v.verdict === 'excluded').map((v) => v.key).sort()).toEqual(['FED-EE', 'PE-sw'])
    expect(r.pathways.find((v) => v.key === 'AIP')!.availability).toBe('not-collected')
    expect(r.levers.map((l) => l.key).sort()).toEqual(['clb-boost', 'teer-downgrade'])
  })

  it('门槛表一行都查不到 → not-collected(本站的缺口),不判、也不说成「官方没有要求」', async () => {
    const empty = { query: async () => ({ rows: [] }) }
    const r = await lookupVerdict(empty, verdictProfileOf(normalizeSlots({ age: 40 }) as Slots, 2))
    expect(r.availability).toBe('not-collected')
    expect(r.pathways).toEqual([])
    expect(r.note).toContain('不等于官方没有要求')
  })
})
