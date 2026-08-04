/**
 * 对话工具层金标测试(C1;设计《对话即产品-20260803》§八验收)。
 * 金标 = 2026-08-03 那场真实对话:C01 木匠(NOC 72310,ON 毕业,0 经验)/ C02 IT(NOC 21232)。
 *
 * 连**生产只读**(cms/.env 的 DATABASE_URI,全部 SELECT,零写入)—— 工具层的价值就在于
 * 「库里真有什么」,拿 fixture 测等于测了个假库(那正是 /api/advisor 当初被关掉的病根)。
 * 没有 DATABASE_URI 时整组跳过,不让 CI 因缺库变红。
 *
 * 断言分四类:金标数字、三态(有数据 / 官方不公布 / 本站未收录)、evidence 全覆盖、工具不下结论。
 */
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  checkClaims, lookupCoverage, lookupDraws, lookupEE, lookupJobs, lookupOps, lookupThresholds,
  PNP_PROVINCES,
} from '@/lib/chatTools'

const URI = process.env.DATABASE_URI || ''
const CARPENTER = '72310'   // C01 木匠(亚岗昆木工毕业,ON,0 经验)
const DEV = '21232'         // C02 软件开发

let pool: any
const d = URI ? describe : describe.skip

// ── evidence 全覆盖走查(铁律 ①)──────────────────────────────────────────
// 凡是**带数字的行**都必须挂得住出处。判据:对象里出现任何一个我们会返回的数字字段,
// 这个对象就必须有非空 evidence.url。递归走整棵返回值树,漏一处就红。
const NUMERIC_KEYS = ['need', 'needLow', 'have', 'short', 'open', 'named', 'apprentice', 'medianWage', 'score', 'invitations', 'drawCrs', 'drawSize', 'value']
function assertEvidence(node: unknown, path = '$'): number {
  if (Array.isArray(node)) return node.reduce((n: number, v, i) => n + assertEvidence(v, `${path}[${i}]`), 0)
  if (!node || typeof node !== 'object') return 0
  const o = node as Record<string, unknown>
  let n = 0
  const hasNumber = NUMERIC_KEYS.some((k) => typeof o[k] === 'number')
  if (hasNumber) {
    const ev = o.evidence as { url?: string } | undefined
    expect(ev?.url, `${path} 带数字却没有 evidence.url:${JSON.stringify(o).slice(0, 200)}`).toBeTruthy()
    n += 1
  }
  for (const [k, v] of Object.entries(o)) if (k !== 'evidence') n += assertEvidence(v, `${path}.${k}`)
  return n
}

d('对话工具层(生产库只读)', () => {
  beforeAll(() => { pool = new pg.Pool({ connectionString: URI, max: 2 }) })
  afterAll(async () => { await pool?.end() })

  // ── C01 木匠 72310 ────────────────────────────────────────────────────
  describe('C01 木匠 72310(ON 毕业,0 经验)', () => {
    it('九省门槛:每省要么给出官方门槛行、要么明说本站未收录,数字全带出处', async () => {
      const r = await lookupThresholds(pool, { noc: CARPENTER, profile: { clb: null, totalExpMonths: 0, canadianExpMonths: 0 } })
      expect(r.provinces.map((p) => p.province)).toEqual(PNP_PROVINCES)
      expect(r.teer).toBe(2)                                   // NOC 2021 第 2 位即 TEER
      for (const p of r.provinces) {
        if (p.availability === 'ok') expect(p.rows.length).toBeGreaterThan(0)
        else { expect(p.rows).toHaveLength(0); expect(p.note).toBeTruthy() }   // 空行必须配一句"为什么空"
      }
      // 至少有一个省真的判出了「差多少」(0 经验 → experience fail/unknown 都可以,但门槛数必须在)
      const withExp = r.provinces.flatMap((p) => p.rows).filter((x) => x.factor === 'experience')
      expect(withExp.length).toBeGreaterThan(0)
      expect(withExp.every((x) => x.need != null)).toBe(true)
      expect(assertEvidence(r)).toBeGreaterThan(0)
    })

    // G6 2026-08-04:金标那句临门一脚 —— 外省毕业生想走曼省,官方要的是「与该雇主连续全职 1 年」
    // (一般情形 6 个月)。这一条以前只写在 ETL 注释里,库里查不到 = 报告说不出 = 用户以为没这条路。
    it('MB SWM 在职时长:一般 6 个月 / 外省毕业 1 年,两档各挂自己的官方原句,且**不下判定**', async (ctx) => {
      const r = await lookupThresholds(pool, {
        noc: CARPENTER,
        provs: ['MB'],
        // 故意给一个「同职业总经验 5 年」的人:口径不同,引擎绝不能据此说他达标
        profile: { totalExpMonths: 60, canadianExpMonths: 60 },
      })
      const mb = r.provinces[0]
      expect(mb.availability).toBe('ok')
      const exp = mb.rows.find((x) => x.factor === 'experience')
      expect(exp, 'MB 的在职时长门槛一行都没有 —— 官方写在 SWM 资格页,查不到就是本站没灌').toBeTruthy()
      expect(exp!.need).toBe(6)
      expect(exp!.unit).toBe('months')
      // 🔴 口径隔离:量的是「在这家雇主干了多久」,本站没问过 → 只摆门槛,永远 unknown
      expect(exp!.verdict, '拿同职业总经验去判在职时长 = 假话').toBe('unknown')
      expect(exp!.have).toBeNull()
      // 两档并列,外省毕业那档是 12 个月,且挂的是**它自己那一行**的原文。
      // applies_condition 是 additive 列(docs/sql/g6-pnp-requirements-condition.sql):
      // DDL + 重灌 seed 之后两档才分得开。列还没上生产时整条跳过(同 streamKey 那条的先例)——
      // 不让「先跑 SQL 还是先 push」的排期顺序把测试染红;上了就自动开始守。
      if (!exp!.tiers?.some((t) => t.area)) return ctx.skip()
      const grad = exp!.tiers?.find((t) => t.area === 'grad-other-province')
      expect(grad, '外省毕业那一档没出来').toBeTruthy()
      expect(grad!.value).toBe(12)
      expect(grad!.evidence.label).toMatch(/graduated from a post-secondary program in another Canadian province/i)
      expect(grad!.evidence.url).toMatch(/immigratemanitoba\.com/)
      expect(exp!.evidence.label).toMatch(/six months or more of continuous full-time employment/i)
      assertEvidence(r)
    })

    it('清单覆盖:NS 具名命中(Critical Vacancies)出得来,ON 是「官方不公布」不是空清单', async () => {
      const r = await lookupCoverage(pool, { noc: CARPENTER })
      const ns = r.provinces.find((p) => p.province === 'NS')!
      expect(ns.availability).toBe('ok')
      expect(ns.hits.length).toBeGreaterThan(0)
      expect(ns.hits[0].stream).toMatch(/Critical/i)
      expect(ns.hits[0].evidence.url).toBeTruthy()
      expect(ns.excluded).toBe(false)
      // BC / MB 同为具名命中(金标里的三省)
      for (const p of ['BC', 'MB']) {
        const c = r.provinces.find((x) => x.province === p)!
        expect(c.availability, p).toBe('ok')
        expect(c.hits.length, p).toBeGreaterThan(0)
      }
      assertEvidence(r)
    })

    it('学徒岗计数:按省给数,口径写在返回值里(0 ≠ 该省没有)', async () => {
      const r = await lookupJobs(pool, { noc: CARPENTER, apprentice: true })
      expect(r.availability).toBe('ok')
      expect(r.scope).toMatch(/不代表该省没有空缺/)
      expect(r.rows.length).toBeGreaterThan(0)
      expect(r.rows.every((x) => x.apprentice > 0)).toBe(true)
      expect(r.rows.every((x) => x.evidence.url.includes(CARPENTER))).toBe(true)
      // 点名省份时即使 0 也照给(让他看见 0,而不是拿不到行)
      const one = await lookupJobs(pool, { noc: CARPENTER, prov: 'PE' })
      expect(one.rows).toHaveLength(1)
      expect(one.rows[0].province).toBe('PE')
      assertEvidence(r)
    })

    it('中介对账三分法:说了的核到 MB,没说的把 BC/NS 单列出来', async () => {
      const r = await checkClaims(pool, {
        noc: CARPENTER, teer: 2,
        claims: [{ text: '中介说曼省有合作公司,让我去曼省', topic: 'coverage', province: 'MB' }],
      })
      expect(r.checked).toHaveLength(1)
      expect(r.checked[0].availability).toBe('ok')
      const unsaidProvs = r.unsaid.map((u) => u.province)
      expect(unsaidProvs).toContain('BC')
      expect(unsaidProvs).toContain('NS')
      expect(unsaidProvs).not.toContain('MB')          // 他说过的不进第三格
      assertEvidence(r)
    })
  })

  // ── C02 IT 21232 ──────────────────────────────────────────────────────
  describe('C02 软件开发 21232', () => {
    it('清单命中三省(AB/MB/SK),ON 仍是官方不公布', async () => {
      const r = await lookupCoverage(pool, { noc: DEV })
      const hit = r.provinces.filter((p) => p.hits.length > 0).map((p) => p.province)
      expect(hit.sort()).toEqual(['AB', 'MB', 'SK'])
      expect(r.provinces.find((p) => p.province === 'ON')!.availability).toBe('not-published')
      assertEvidence(r)
    })

    it('抽选史:AB 逐轮给分数线与邀请数,分制名必须在(各省分制互不相通)', async () => {
      const r = await lookupDraws(pool, { prov: 'AB' })
      expect(r.availability).toBe('ok')
      expect(r.rows.length).toBeGreaterThan(0)
      expect(r.rows[0].evidence.url).toBeTruthy()
      expect(r.rows.some((x) => x.score != null)).toBe(true)
      expect(r.rows.every((x) => x.drawDate.length === 10)).toBe(true)
      assertEvidence(r)
    })

    it('EE 类别:查过全表就敢说「不在任何类别里」,并说明仍可走全类别轮次', async () => {
      const r = await lookupEE(pool, { noc: DEV })
      expect(r.availability).toBe('ok')
      expect(r.matched).toBe(false)
      expect(r.note).toMatch(/查过/)
      // 对照组:木匠命中 trade 类别,分数线与日期带出处
      const t = await lookupEE(pool, { noc: CARPENTER })
      expect(t.matched).toBe(true)
      expect(t.rows[0].drawCrs).toBeGreaterThan(0)
      expect(t.rows[0].evidence.url).toBeTruthy()
      assertEvidence(t)
    })
  })

  // ── 三态断言(红线 ②:「没有」与「没查到」不许混)────────────────────────
  describe('三态', () => {
    it('ON 职业清单 → not-published(制度性不公布),不是空数组', async () => {
      const r = await lookupCoverage(pool, { noc: CARPENTER, provs: ['ON'] })
      const on = r.provinces[0]
      expect(on.availability).toBe('not-published')
      expect(on.coverage).toBe('exclusion')
      expect(on.note).toMatch(/不公布/)
      expect(on.hits).toHaveLength(0)                  // 空是空,但 availability 已经说清为什么空
    })

    it('SK 抽选 → not-published(EO 不进池,制度上没有抽选这一步)', async () => {
      const r = await lookupDraws(pool, { prov: 'SK' })
      expect(r.availability).toBe('not-published')
      expect(r.rows).toHaveLength(0)
      expect(r.note).toMatch(/EOI|抽选/)
    })

    it('NS 抽选 → not-collected(本站未收录),绝不说成 0 轮', async () => {
      const r = await lookupDraws(pool, { prov: 'NS' })
      expect(r.availability).toBe('not-collected')
      expect(r.rows).toHaveLength(0)
      expect(r.note).toMatch(/未收录/)
    })

    // 2026-08-04(G5 入库后)改写:AB 已有 52 行 → 不再是 not-collected。三态断言留在下面 lookupOps 专组。
    // 同日(G6)再改:MB 那半原写「官方不发 → not-published」,是错的(MPNP 月度数据页 + 年报都在发),
    // 改成 ok —— 详见下面 lookupOps 专组里那条注释。
    it('运营统计:AB 已入库 → ok + 官方页;MB 也已入库 → ok', async () => {
      const ab = await lookupOps(pool, { prov: 'AB' })
      expect(ab.availability).toBe('ok')
      expect(ab.metrics.length).toBeGreaterThan(0)
      expect(ab.officialUrl).toMatch(/alberta\.ca/)
      const mb = await lookupOps(pool, { prov: 'MB' })
      expect(mb.availability).toBe('ok')
      expect(mb.officialUrl).toMatch(/immigratemanitoba\.com/)
      const qc = await lookupOps(pool, { prov: 'QC' })
      expect(qc.availability).toBe('not-applicable')
    })

    it('QC 清单 → not-applicable(自有体系,不属 PNP)', async () => {
      const r = await lookupCoverage(pool, { noc: DEV, provs: ['QC'] })
      expect(r.provinces[0].availability).toBe('not-applicable')
    })
  })

  // ── ⑤ lookupOps 真查库(G5,2026-08-04 pnp_ops_stats 入库 93 行)──────────────
  // 这张表存在的全部目的:让「0 / 官方压了这个数 / 本站没收录 / 官方不公布」四件事分得开。
  describe('运营统计 lookupOps(pnp_ops_stats)', () => {
    it('金标 AB:EOI 池 Alberta Opportunity Stream = 23056,带出处', async () => {
      const r = await lookupOps(pool, { prov: 'AB' })
      expect(r.availability).toBe('ok')
      const aos = r.metrics.find((m) => m.key === 'eoi_pool' && m.scope === 'Alberta Opportunity Stream')!
      expect(aos, 'AB EOI 池里没有 Alberta Opportunity Stream 这一行').toBeTruthy()
      expect(aos.value).toBe(23056)
      expect(aos.unit).toBe('people')
      expect(aos.scopeKind).toBe('stream')
      expect(aos.evidence.url).toBeTruthy()
      expect(r.officialUrl).toBe(aos.evidence.url)      // 出处指向数字真正的来源页,不是常量表里的别名
      // 省级总数与逐 stream 分母同时在(AAIP 是全国唯一发分母的省)
      expect(r.metrics.find((m) => m.key === 'eoi_pool_total')?.value).toBe(36948)
      assertEvidence(r)
    })

    it('金标 SK:省级配额 4761 / YTD 提名 2628,统计期 2026Q2(SK 无 as_of)', async () => {
      const r = await lookupOps(pool, { prov: 'SK' })
      expect(r.availability).toBe('ok')
      const prov = (key: string) => r.metrics.find((m) => m.key === key && m.scope === '')!
      expect(prov('allocation').value).toBe(4761)
      expect(prov('allocation').unit).toBe('spots')
      expect(prov('nominations_ytd').value).toBe(2628)
      expect(prov('nominations_ytd').unit).toBe('nominations')
      for (const k of ['allocation', 'nominations_ytd']) {
        expect(prov(k).period, k).toBe('2026Q2')
        expect(prov(k).asOf, `${k}:SK 官方不给口径日,asOf 必须留空而不是编一个`).toBe('')
        expect(prov(k).evidence.url, k).toBeTruthy()
      }
      // 处理时长按 category 分行(「等多久」的答案就在这)
      expect(r.metrics.filter((m) => m.key === 'processing_weeks').length).toBeGreaterThan(0)
      assertEvidence(r)
    })

    it('金标 BC:SIRS 注册池 11 个分数段齐全,每档带出处与口径日', async () => {
      const r = await lookupOps(pool, { prov: 'BC' })
      expect(r.availability).toBe('ok')
      const pool11 = r.metrics.filter((m) => m.key === 'sirs_pool')
      expect(pool11).toHaveLength(11)
      expect(pool11.every((m) => m.scopeKind === 'scoreRange' && m.scope !== '')).toBe(true)
      expect(pool11.every((m) => !!m.evidence.url && !!m.asOf)).toBe(true)
      expect(pool11.find((m) => m.scope === '100 - 109')?.value).toBe(1728)
      // 官方页别名坑:出处必须是 ETL 实抓的那一页(about-the-…/invitations-to-apply)
      expect(r.officialUrl).toMatch(/welcomebc\.ca\/.*invitations-to-apply/)
      assertEvidence(r)
    })

    // G6 2026-08-04:站内曾写着「BC 没有处理时长」,是错的 —— 通道页印着三档。
    it('金标 BC 处理时长:申请 3 个月 / 提名后请求 1 个月 / 复核 6 个月,单位是月不是周', async () => {
      const r = await lookupOps(pool, { prov: 'BC' })
      const proc = r.metrics.filter((m) => m.key === 'processing_months')
      expect(proc, 'BC 处理时长一行都没有 —— 官方是发的,查不到就是本站没灌').toHaveLength(3)
      const of = (stage: string) => proc.find((m) => m.scope === stage)!
      expect(of('Application').value).toBe(3)
      expect(of('Post-nomination request').value).toBe(1)
      expect(of('Request for review').value).toBe(6)
      // 🔴 官方给的是月,不许折算成周(折算=替官方编了它没给的精度)
      expect(proc.every((m) => m.unit === 'months')).toBe(true)
      expect(r.metrics.some((m) => m.key === 'processing_weeks'), 'BC 不该出现 processing_weeks').toBe(false)
      // 「约 80% 的案子」是这三个数的全部意义,必须在每一行的官方原文里
      expect(proc.every((m) => /80% of cases/i.test(m.evidence.label ?? ''))).toBe(true)
      expect(proc.every((m) => m.scopeKind === 'stage' && /welcomebc\.ca/.test(m.evidence.url))).toBe(true)
      assertEvidence(r)
    })

    // G6 2026-08-04:MB 从「官方不发」→ 全国披露最厚的省之一。这条守住两件事:
    // ① 处理时长确实查得到(逐通道天数 + 6 个月服务承诺);② 配额与提名摆得出「还剩多少」。
    it('金标 MB:配额 6239 / 至 6 月提名 2673 / SWM 平均 207 天 / 承诺 6 个月', async () => {
      const r = await lookupOps(pool, { prov: 'MB' })
      expect(r.availability).toBe('ok')
      const one = (key: string, scope = '') => r.metrics.find((m) => m.key === key && m.scope === scope)!
      expect(one('allocation').value).toBe(6239)
      expect(one('allocation').unit).toBe('spots')
      expect(one('nominations_ytd').value).toBe(2673)
      expect(one('nominations_enhanced_ytd').value).toBe(886)
      // 库存(在审 + 待审):「等多久」的另一半分母,必须写明是哪个月的快照,不能说成「当前」
      expect(one('in_assessment').value).toBe(1050)
      expect(one('pending_assessment').value).toBe(641)
      expect(one('inventory').value).toBe(1691)
      expect(one('inventory').period).toMatch(/^\d{4}-\d{2}$/)
      // 年报 §9:逐通道平均处理天数(官方单位是天,不折算)
      const swm = one('processing_days', 'Skilled Worker in Manitoba')
      expect(swm.value).toBe(207)
      expect(swm.unit).toBe('days')
      expect(r.metrics.find((m) => m.key === 'processing_days_approved' && m.scope === 'Skilled Worker in Manitoba')!.value).toBe(205)
      expect(r.metrics.find((m) => m.key === 'processing_days_refused' && m.scope === 'Skilled Worker in Manitoba')!.value).toBe(379)
      expect(one('processing_commitment').value).toBe(6)
      expect(one('processing_commitment').unit).toBe('months')
      // 两个源不同页:年报的天数不许挂月度页的出处
      expect(swm.evidence.url).toMatch(/annual-report/)
      expect(one('allocation').evidence.url).toMatch(/monthly-data/)
      assertEvidence(r)
    })

    it('🔴 红线:value=null 必须配官方原文;全表不许拿 0 冒充「官方压了这个数」', async () => {
      const all = (await Promise.all(['AB', 'SK', 'BC', 'MB'].map((p) => lookupOps(pool, { prov: p })))).flatMap((r) => r.metrics)
      expect(all.length).toBeGreaterThan(80)
      const suppressed = all.filter((m) => m.value === null)
      expect(suppressed.length, '一行 null 都没有 = 抑制值多半被折成了数字,先查 ETL').toBeGreaterThan(0)
      for (const m of suppressed) {
        expect(m.valueText, `${m.key}/${m.scope} 是 null 却没有官方原文,等于什么都没说`).toBeTruthy()
      }
      // 0 是「真的一个都没有」,不是「官方没给」——本表里目前一个 0 都不该出现。
      // ⚠️ MB 加进来之后这条更容易红:官方哪年真出个「某通道整年零提名」就是合法的 0。
      //    红了先去核官方页,确认是真 0 再单独放行,**别顺手改成 >= 0** —— 那就把这道防线拆了。
      const zeros = all.filter((m) => m.value === 0)
      expect(zeros, `疑似把抑制值折成了 0:${JSON.stringify(zeros).slice(0, 300)}`).toHaveLength(0)
      // assessing_up_to 是纯文本游标:恒 null + 原文,不许被读成数字
      const cursor = all.filter((m) => m.key === 'assessing_up_to')
      expect(cursor.length).toBeGreaterThan(0)
      expect(cursor.every((m) => m.value === null && !!m.valueText && m.unit === 'text')).toBe(true)
    })

    // 2026-08-04(G6)改写:原断言是「MB → not-published」,**那条断言本身是错的** ——
    // MPNP 每年一页月度运营数据 + 每年一份年报(§9 处理时长),官方公布得比多数省都厚。
    // 错因是 2026-08-03 那轮爬取只圈了 immigratemanitoba.com/mpnp/,漏了 /resources/data/,
    // 把「这一轮没爬到」写成了「官方不公布」。测试跟着假结论一起绿,是这类错最贵的地方。
    // 现在 not-published 这一态改用**清单侧**的 ON 守(那条是真的:2026-06 改制后不公布职业清单)。
    it('三态:MB → ok(官方公布,已入库)、QC → not-applicable、NS → 本站未收录', async () => {
      const mb = await lookupOps(pool, { prov: 'MB' })
      expect(mb.availability, 'MB 官方公布运营统计,查不到行说明 seed 没灌(先跑 DDL+seed)').toBe('ok')
      expect(mb.metrics.length).toBeGreaterThan(0)
      expect(mb.note).toBeTruthy()
      expect(mb.note, 'MB 的 note 不许再说「不发/不公布」').not.toMatch(/不发|不公布/)
      const qc = await lookupOps(pool, { prov: 'QC' })
      expect(qc.availability).toBe('not-applicable')
      expect(qc.metrics).toHaveLength(0)
      expect(qc.note).toBeTruthy()
      // 常量表里没有的省 = 本站未收录,绝不能说成「官方不公布」
      const ns = await lookupOps(pool, { prov: 'NS' })
      expect(ns.availability).toBe('not-collected')
      expect(ns.metrics).toHaveLength(0)
      expect(ns.note).toBeTruthy()
    })

    // 跨指标拼装(G5 补漏 2026-08-04):AAIP 官网两张表对同一条通道措辞不一致 ——
    // streams[]「Accelerated Tech Pathway (eligible list…)」vs eoiPool[]「Accelerated Tech Pathway」,
    // 拿 scope 等值 join 会**静默漏配**(8 条通道只有 4 条拼得齐,而且不报错)。金标那条
    // Alberta Opportunity Stream 恰好三处同名,所以上面几条断言测不出来 —— 这条专测措辞不一致的。
    // 归一在 ETL(mart)侧算,本层只读 streamKey(CLAUDE.md:清洗下沉)。
    it('跨指标可拼:AB 至少 6 条通道能按 streamKey 同时拿到 allocation + eoi_pool', async (ctx) => {
      const r = await lookupOps(pool, { prov: 'AB' })
      const streams = r.metrics.filter((m) => m.scopeKind === 'stream')
      expect(streams.length).toBeGreaterThan(0)
      // stream_key 是 additive 列(docs/sql/g5-ops-stream-key.sql):DDL + 重灌 seed 之后才有值。
      // 列还没上生产时整条跳过 —— 不让「先跑 SQL 还是先 push」的排期顺序把测试染红;上了就自动开始守。
      if (!streams.some((m) => m.streamKey)) return ctx.skip()
      const byKey = new Map<string, Set<string>>()
      for (const m of streams) {
        expect(m.streamKey, `${m.key}/${m.scope}:stream 行的 streamKey 不该为空`).toBeTruthy()
        if (!byKey.has(m.streamKey)) byKey.set(m.streamKey, new Set())
        byKey.get(m.streamKey)!.add(m.key)
      }
      const joined = [...byKey].filter(([, ks]) => ks.has('allocation') && ks.has('eoi_pool'))
      expect(joined.length, `按 streamKey 只拼齐 ${joined.length} 条:${JSON.stringify([...byKey.keys()])}`).toBeGreaterThanOrEqual(6)
      // 修之前正是这三条漏配(括号补充说明只出现在一张表里)
      for (const k of ['accelerated tech pathway', 'dedicated health care pathways', 'priority sector draws and other initiatives']) {
        expect([...(byKey.get(k) ?? [])].sort(), `通道「${k}」没拼齐`).toEqual(
          expect.arrayContaining(['allocation', 'assessing_up_to', 'eoi_pool', 'issued', 'remaining', 'to_process']))
      }
      // 反向红线:归一切过头会把两条不同通道压成一个键 —— 同一 metric 内一个 key 只许对应一个官方 scope
      const seen = new Map<string, string>()
      for (const m of streams) {
        const k = `${m.key}|${m.streamKey}`
        expect(seen.get(k) ?? m.scope, `${k}:两条不同通道压成了同一个 streamKey`).toBe(m.scope)
        seen.set(k, m.scope)
      }
    })

    it('metrics 顺序稳定:同一次查询连查两遍必须一模一样', async () => {
      const key = (r: { metrics: { key: string; scope: string }[] }) => r.metrics.map((m) => `${m.key}|${m.scope}`).join(',')
      for (const p of ['AB', 'SK', 'BC']) {
        const [a, b] = await Promise.all([lookupOps(pool, { prov: p }), lookupOps(pool, { prov: p })])
        expect(key(a), p).toBe(key(b))
      }
    })
  })

  // ── 工具不下结论(红线 ③)──────────────────────────────────────────────
  it('返回值里没有排序名次/推荐/评分这类结论字段', async () => {
    const r = await lookupThresholds(pool, { noc: CARPENTER, provs: ['BC', 'ON'] })
    const json = JSON.stringify(r)
    for (const banned of ['"rank"', '"recommend', '"best"', '"score":']) expect(json).not.toContain(banned)
  })
})
