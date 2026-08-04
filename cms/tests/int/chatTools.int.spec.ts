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

    it('运营统计:AB 官方发了但本站未入库 → not-collected + 官方页;MB 官方不发 → not-published', () => {
      const ab = lookupOps({ prov: 'AB' })
      expect(ab.availability).toBe('not-collected')
      expect(ab.metrics).toHaveLength(0)               // 给不出数就一个数都不给(宁缺不猜)
      expect(ab.officialUrl).toMatch(/alberta\.ca/)
      const mb = lookupOps({ prov: 'MB' })
      expect(mb.availability).toBe('not-published')
      const qc = lookupOps({ prov: 'QC' })
      expect(qc.availability).toBe('not-applicable')
    })

    it('QC 清单 → not-applicable(自有体系,不属 PNP)', async () => {
      const r = await lookupCoverage(pool, { noc: DEV, provs: ['QC'] })
      expect(r.provinces[0].availability).toBe('not-applicable')
    })
  })

  // ── 工具不下结论(红线 ③)──────────────────────────────────────────────
  it('返回值里没有排序名次/推荐/评分这类结论字段', async () => {
    const r = await lookupThresholds(pool, { noc: CARPENTER, provs: ['BC', 'ON'] })
    const json = JSON.stringify(r)
    for (const banned of ['"rank"', '"recommend', '"best"', '"score":']) expect(json).not.toContain(banned)
  })
})
