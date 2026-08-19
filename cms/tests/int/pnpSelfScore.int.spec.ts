// NLPNP Express Entry Skilled Worker 官方 Annex A 分值表接入测试。
// fixture 不手抄:直接消费 ETL 产出的 mart；官网表或解析器一变，这里会先失败。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { scoreProvince, type ScoreFactor, type SelfProfile } from '@/lib/score/pnpSelfScore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const martPath = path.resolve(__dirname, '../../../data/mart/pnp_score_factors.json')
const allFactors: ScoreFactor[] = JSON.parse(fs.readFileSync(martPath, 'utf8'))
const nlRows = allFactors.filter((f) => f.province === 'NL')

const profile = (over: Partial<SelfProfile> = {}): SelfProfile => ({
  edu: 'highschool', expRecent: 0, expOlder: 0, clb1: 0, clb2: 0, age: 52, ...over,
})

describe('NLPNP Annex A 数据实况', () => {
  it('28 行、100 分制、67 分门槛，且只声明适用于 EE Skilled Worker', () => {
    expect(nlRows).toHaveLength(28)
    expect(new Set(nlRows.map((r) => r.factor))).toEqual(new Set([
      'education', 'work5', 'work610', 'language1', 'age', 'connection',
    ]))
    expect(nlRows[0].maxTotal).toBe(100)
    expect(nlRows[0].passMark).toBe(67)
    expect(nlRows[0].system).toContain('(Express Entry Skilled Worker)')
    for (const row of nlRows) {
      expect(row.url).toBe('https://www.gov.nl.ca/immigration/files/AnnexA_PNP.pdf')
      expect(row.fetched).toBeTruthy()
    }
  })
})

describe('NLPNP Annex A 估分', () => {
  it('未达到官方最低档时为 0，不能白送学历、经验或语言最低档分', () => {
    const r = scoreProvince(allFactors, 'NL', profile(), {}, {})!
    expect(r.total).toBe(0)
    expect(r.parts.find((p) => p.factor === 'education')?.pts).toBe(0)
    expect(r.parts.find((p) => p.factor === 'work5')?.pts).toBe(0)
    expect(r.parts.find((p) => p.factor === 'language1')?.pts).toBe(0)
  })

  it('最高基础项 87 分；三项纽省关联全选后为官方上限 100 分', () => {
    const p = profile({ edu: 'master', expRecent: 5, expOlder: 5, clb1: 8, age: 30 })
    const base = scoreProvince(allFactors, 'NL', p, {}, {})!
    expect(base.total).toBe(87) // 学历28 + 工作20(15+7 后组封顶) + 语言27 + 年龄12

    const ticks = Object.fromEntries(nlRows.filter((r) => r.kind === 'bonus')
      .map((r) => [`NL:${r.factor}:${r.seq}`, true]))
    const withConnections = scoreProvince(allFactors, 'NL', p, {}, ticks)!
    expect(withConnections.total).toBe(100)
    expect(withConnections.passMark).toBe(67)
  })

  it('典型档位按官方行命中：本科23 + 近三年9 + CLB7 23 + 34岁10 = 65', () => {
    const r = scoreProvince(allFactors, 'NL', profile({
      edu: 'bachelor', expRecent: 3, clb1: 7, age: 34,
    }), {}, {})!
    expect(r.total).toBe(65)
  })
})

// ── AAIP Worker EOI Points Grid(AB,2026-08-14 加省)────────────────────────────
// fixture 同上不手抄:直接消费 mart。官方 PDF:
// data/crawl/ab-aaip/im-worker-stream-expression-of-interest-points-grid.pdf(2025-08-07 版)
const abRows = allFactors.filter((f) => f.province === 'AB')

describe('AAIP Worker EOI 数据实况', () => {
  it('30 行、100 分制、EOI 无及格线,组上限 69/31', () => {
    expect(abRows).toHaveLength(30)
    expect(new Set(abRows.map((r) => r.factor))).toEqual(new Set([
      'education', 'eduLocationCanada', 'language', 'workMonths', 'workLocationCanada',
      'age', 'familyAlberta', 'offer', 'offerSector', 'offerArea', 'regulated',
    ]))
    expect(abRows[0].maxTotal).toBe(100)
    expect(abRows[0].passMark).toBeNull()
    const gI = abRows.find((r) => r.factorGroup === 'I')!, gII = abRows.find((r) => r.factorGroup === 'II')!
    expect(gI.groupMax).toBe(69)
    expect(gII.groupMax).toBe(31)
    for (const row of abRows) {
      expect(row.url).toBe('https://www.alberta.ca/system/files/im-worker-stream-expression-of-interest-points-grid.pdf')
      expect(row.fetched).toBeTruthy()
    }
  })
})

describe('AAIP Worker EOI 估分', () => {
  it('自动项手算对照:本科 + CLB 6 + 2 年经验 + 28 岁 = 7+10+11+5 = 33', () => {
    const r = scoreProvince(allFactors, 'AB', profile({ edu: 'bachelor', clb1: 6, expRecent: 2, age: 28 }), {}, {})!
    expect(r.parts.find((p) => p.factor === 'education')?.pts).toBe(7)
    expect(r.parts.find((p) => p.factor === 'language')?.pts).toBe(10)
    expect(r.parts.find((p) => p.factor === 'workMonths')?.pts).toBe(11)
    expect(r.parts.find((p) => p.factor === 'age')?.pts).toBe(5)
    expect(r.parts.find((p) => p.factor === 'offer')?.pts).toBe(0)   // 没答 offer 不白送
    expect(r.total).toBe(33)
  })

  it('勾选项:阿省亲属 8 + 学历阿省完成 10 + 他省经验 6 + 英法双语 3 → 总分 60', () => {
    const ticks = { 'AB:familyAlberta:0': true, 'AB:eduLocationCanada:0': true, 'AB:workLocationCanada:1': true, 'AB:language:0': true }
    const r = scoreProvince(allFactors, 'AB', profile({ edu: 'bachelor', clb1: 6, expRecent: 2, age: 28 }), {}, ticks)!
    expect(r.total).toBe(60)
  })

  it('二选一簇双勾只算大的:学历完成地 10/6 全勾 → 只得 10', () => {
    const ticks = { 'AB:eduLocationCanada:0': true, 'AB:eduLocationCanada:1': true }
    const r = scoreProvince(allFactors, 'AB', profile(), {}, ticks)!
    expect(r.parts.find((p) => p.factor === 'eduLocationCanada')?.pts).toBe(10)
  })

  it('边界档:CLB 5→8 分、CLB 3→0 分;零经验落「不足 6 个月」3 分;50 岁与 20 岁各 3 分', () => {
    expect(scoreProvince(allFactors, 'AB', profile({ clb1: 5 }), {}, {})!.parts.find((p) => p.factor === 'language')?.pts).toBe(8)
    expect(scoreProvince(allFactors, 'AB', profile({ clb1: 3 }), {}, {})!.parts.find((p) => p.factor === 'language')?.pts).toBe(0)
    expect(scoreProvince(allFactors, 'AB', profile({ expRecent: 0 }), {}, {})!.parts.find((p) => p.factor === 'workMonths')?.pts).toBe(3)
    expect(scoreProvince(allFactors, 'AB', profile({ age: 50 }), {}, {})!.parts.find((p) => p.factor === 'age')?.pts).toBe(3)
    expect(scoreProvince(allFactors, 'AB', profile({ age: 20 }), {}, {})!.parts.find((p) => p.factor === 'age')?.pts).toBe(3)
  })

  it('红线⑤保守:普通大专不得白拿 Trades 行的 7 分(两行同梯度,取 4 分那行)', () => {
    const r = scoreProvince(allFactors, 'AB', profile({ edu: 'diploma2y' }), {}, {})!
    const edu = r.parts.find((p) => p.factor === 'education')!
    expect(edu.pts).toBe(4)
    expect(edu.matched).toBe('Diploma/Certificate')
  })
})
