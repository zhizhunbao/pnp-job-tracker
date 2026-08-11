// NLPNP Express Entry Skilled Worker 官方 Annex A 分值表接入测试。
// fixture 不手抄:直接消费 ETL 产出的 mart；官网表或解析器一变，这里会先失败。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { scoreProvince, type ScoreFactor, type SelfProfile } from '@/lib/pnpSelfScore'

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
