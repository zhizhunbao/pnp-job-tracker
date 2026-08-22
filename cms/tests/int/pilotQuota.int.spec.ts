// pilot_quota(RCIP/FCIP 社区名额状态)测试。
// ① mart 实况:照 mbEoi 惯例直接读 data/mart/pilot_quota.json —— 抽取器/09 改版先在这里炸;
//    断言 = 行数>0、必填齐、每个值与它的 quote/url 成对(quote-anchored 红线)。
// ② 聚合纯函数:喂 fixture 行(不连库),断言 fetchPilotQuota 的返回形状与空值语义
//    (🔴 官网没写 ≠ 0:一组里一个数都没有 → quotaSum=null,禁被 ?? 0 抹成零)。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { aggregatePilotQuota, type PilotQuotaCommunityRow } from '@/lib/pathways'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const martPath = path.resolve(__dirname, '../../../data/mart/pilot_quota.json')

type MartRow = {
  community: string; province: string; type: string; noc: string; status: string
  firstCome: boolean | null; firstComeQuote: string; firstComeUrl: string
  perIntake: number | null; perIntakeQuote: string; perIntakeUrl: string
  remaining: number | null; remainingQuote: string; remainingUrl: string
  quote: string; url: string; asOf: string
}
const martRows: MartRow[] = JSON.parse(fs.readFileSync(martPath, 'utf8'))

describe('mart/pilot_quota 实况(build_pilot_quota → 09 契约)', () => {
  it('行数>0,必填字段齐', () => {
    expect(martRows.length).toBeGreaterThan(0)
    for (const r of martRows) {
      expect(r.community).toBeTruthy()
      expect(r.province).toBeTruthy()
      expect(r.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
  it('每个值与它的 quote/url 成对(quote-anchored,值不许没出处,出处不许没值)', () => {
    for (const r of martRows) {
      for (const k of ['firstCome', 'perIntake', 'remaining'] as const) {
        const has = r[k] !== null && r[k] !== undefined
        expect(!!r[`${k}Quote`], `${r.community} ${k}Quote`).toBe(has)
        expect(!!r[`${k}Url`], `${r.community} ${k}Url`).toBe(has)
      }
      if (r.noc) {
        // 职业行 = 官网明文满额:status/quote/url 三样必须齐
        expect(r.status).toBe('full')
        expect(r.quote).toBeTruthy()
        expect(r.url).toMatch(/^https?:\/\//)
      }
    }
  })
  it('type 已从 pilot-communities 关联(社区级行不许空;身兼两制 = RCIP+FCIP)', () => {
    for (const r of martRows.filter((x) => !x.noc)) expect(['RCIP', 'FCIP', 'RCIP+FCIP']).toContain(r.type)
  })
})

// ── 聚合纯函数(fixture,不连库)──────────────────────────────────────────
const row = (over: Partial<PilotQuotaCommunityRow>): PilotQuotaCommunityRow => ({
  community: 'X', province: 'ON', type: 'RCIP',
  firstCome: null, firstComeQuote: '', firstComeUrl: '',
  perIntake: null, perIntakeQuote: '', perIntakeUrl: '',
  remaining: null, remainingQuote: '', remainingUrl: '',
  asOf: '2026-08-14', ...over,
})

describe('aggregatePilotQuota(省 × 制度聚合契约)', () => {
  it('按 province+type 分组;RCIP+FCIP 社区计入两组', () => {
    const out = aggregatePilotQuota([
      row({ community: 'Sudbury, ON', type: 'RCIP+FCIP' }),
      row({ community: 'Thunder Bay, ON', type: 'RCIP' }),
      row({ community: 'Brandon, MB', province: 'MB', type: 'RCIP' }),
    ])
    expect(out.map((g) => `${g.province}|${g.type}`)).toEqual(['MB|RCIP', 'ON|FCIP', 'ON|RCIP'])
    expect(out.find((g) => g.province === 'ON' && g.type === 'RCIP')?.communities).toBe(2)
    expect(out.find((g) => g.province === 'ON' && g.type === 'FCIP')?.communities).toBe(1)
  })
  it('quotaSum:有数的社区求和(remaining 优先于 perIntake);一个都没有 = null,不许变 0', () => {
    const out = aggregatePilotQuota([
      row({ community: 'A', remaining: 153, remainingQuote: 'q', remainingUrl: 'u' }),
      row({ community: 'B', perIntake: 12, perIntakeQuote: 'q', perIntakeUrl: 'u' }),
      row({ community: 'C', perIntake: 5, perIntakeQuote: 'q', perIntakeUrl: 'u', remaining: 100, remainingQuote: 'q', remainingUrl: 'u' }),
      row({ community: 'D' }),                                    // 官网没写数 → 不计入
      row({ community: 'E', province: 'MB', firstCome: true }),   // 全组没数 → null
    ])
    expect(out.find((g) => g.province === 'ON')?.quotaSum).toBe(153 + 12 + 100)
    expect(out.find((g) => g.province === 'MB')?.quotaSum).toBeNull()
  })
  it('firstComeN 只数官网明说的(null ≠ false ≠ 没写);asOf 取组内最大', () => {
    const out = aggregatePilotQuota([
      row({ community: 'A', firstCome: true, firstComeQuote: 'q', firstComeUrl: 'u', asOf: '2026-08-01' }),
      row({ community: 'B', asOf: '2026-08-14' }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].firstComeN).toBe(1)
    expect(out[0].communities).toBe(2)
    expect(out[0].asOf).toBe('2026-08-14')
  })
  it('type 没接上 pilot-communities 的行不进聚合(空 type 不猜制度)', () => {
    expect(aggregatePilotQuota([row({ type: '' })])).toEqual([])
  })
  it('空输入 = 空输出(表没建/没灌时上游按「没数据」处理)', () => {
    expect(aggregatePilotQuota([])).toEqual([])
  })
})

describe('mart 实况 × 聚合(端到端形状)', () => {
  it('真 mart 行聚出来的每组:communities>0、quotaSum 是正整数或 null', () => {
    const commRows = martRows.filter((r) => !r.noc).map((r) => row({
      community: r.community, province: r.province, type: r.type,
      firstCome: r.firstCome, firstComeQuote: r.firstComeQuote, firstComeUrl: r.firstComeUrl,
      perIntake: r.perIntake, perIntakeQuote: r.perIntakeQuote, perIntakeUrl: r.perIntakeUrl,
      remaining: r.remaining, remainingQuote: r.remainingQuote, remainingUrl: r.remainingUrl,
      asOf: r.asOf,
    }))
    const out = aggregatePilotQuota(commRows)
    expect(out.length).toBeGreaterThan(0)
    for (const g of out) {
      expect(g.communities).toBeGreaterThan(0)
      expect(g.firstComeN).toBeLessThanOrEqual(g.communities)
      if (g.quotaSum !== null) expect(Number.isInteger(g.quotaSum) && g.quotaSum > 0).toBe(true)
      expect(g.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
