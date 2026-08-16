// 估分 × 抽选线三态判定(lib/scoreLine)+ 它在排序里的位置(lib/planRank)。
//
// 为什么值得单测:这条口径改之前**两头都失效**(下界当上界用、partial 一刀切),
// 而失效的形态是「页面照常出数字、排序毫无变化」—— 不炸、不报错、只是悄悄没用。
// 断言按性质写(三态互斥、单调、缺一边不比),不写快照矩阵(见 [[verdict-test-methodology]])。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { isAboveLine, isBelowLine, lineStateOf, marginOf, type ScoreVsLine } from '@/lib/scoreLine'
import { rankRows, type RankableRow, type RankCtx } from '@/lib/planRank'
import {
  pathVerdict, type DesignatedEmployerRow, type OccupationRow,
  type VerdictData, type VerdictDrawRow, type VerdictProfile,
} from '@/lib/pathVerdict'
import type { Requirement } from '@/lib/rules'
import type { ScoreFactor } from '@/lib/pnpSelfScore'
import type { EeGridRow } from '@/lib/crsEstimate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

const ctx: RankCtx = { jobsOf: () => 50, homeProvs: new Set<string>() }
const row = (over: Partial<RankableRow>): RankableRow => ({
  key: 'X', province: 'AB', verdict: 'viable', tier: 1, availability: 'ok', ...over,
})

describe('lineStateOf 三态', () => {
  it('下界 ≥ 线 = 够得着(有加分项没勾也成立)', () => {
    // AB 实况:官方表带 12 条加分项 → partial 恒 true。改之前这一整类恒判 unknown
    const s: ScoreVsLine = { value: 62, ceiling: 88, refLine: 60, partial: true }
    expect(lineStateOf(s)).toBe('above')
    expect(isAboveLine(s)).toBe(true)
    expect(marginOf(s)).toBe(2)
  })

  it('上界 < 线 = 够不着', () => {
    const s: ScoreVsLine = { value: 40, ceiling: 55, refLine: 60, partial: true }
    expect(lineStateOf(s)).toBe('below')
    expect(isBelowLine(s)).toBe(true)
    expect(marginOf(s)).toBeNull()
  })

  it('下界 < 线 ≤ 上界 = 留白,两头都不占', () => {
    const s: ScoreVsLine = { value: 50, ceiling: 88, refLine: 60, partial: true }
    expect(lineStateOf(s)).toBe('unknown')
    expect(isAboveLine(s)).toBe(false)
    expect(isBelowLine(s)).toBe(false)
  })

  it('恰好等于线算够得着(线是「最低被邀分」,等于就是进了)', () => {
    expect(lineStateOf({ value: 60, ceiling: 60, refLine: 60 })).toBe('above')
    expect(marginOf({ value: 60, ceiling: 60, refLine: 60 })).toBe(0)
  })

  it('无加分项的省:ceiling 与 value 同值,两头照常判', () => {
    expect(lineStateOf({ value: 480, ceiling: 480, refLine: 470 })).toBe('above')
    expect(lineStateOf({ value: 460, ceiling: 460, refLine: 470 })).toBe('below')
  })

  it('ceiling 缺失(上界算不出)只退回 value,宁可不沉也不误沉', () => {
    expect(lineStateOf({ value: 40, ceiling: null, refLine: 60 })).toBe('below')
    expect(lineStateOf({ value: 70, ceiling: null, refLine: 60 })).toBe('above')
  })

  it('缺一边就不比:没线 / 没分 / 空对象 / null 一律 unknown', () => {
    for (const s of [null, undefined, {}, { value: 62 }, { refLine: 60 }, { value: null, refLine: 60 },
      { value: 62, refLine: null }, { value: Number.NaN, refLine: 60 }, { value: 62, refLine: Number.NaN }] as (ScoreVsLine | null | undefined)[]) {
      expect(lineStateOf(s)).toBe('unknown')
      expect(marginOf(s)).toBeNull()
    }
  })

  it('三态互斥且穷尽(随分数扫一遍线的两侧)', () => {
    for (let v = 0; v <= 100; v += 5) {
      const s: ScoreVsLine = { value: v, ceiling: v + 20, refLine: 60 }
      const st = lineStateOf(s)
      expect([isAboveLine(s), isBelowLine(s)].filter(Boolean).length).toBe(st === 'unknown' ? 0 : 1)
      expect(st).toBe(v >= 60 ? 'above' : v + 20 < 60 ? 'below' : 'unknown')
    }
  })

  it('单调:分越高越不可能被判够不着', () => {
    const st = (v: number) => lineStateOf({ value: v, ceiling: v + 10, refLine: 60 })
    const order = { below: 0, unknown: 1, above: 2 } as const
    for (let v = 0; v < 100; v += 5) expect(order[st(v + 5)]).toBeGreaterThanOrEqual(order[st(v)])
  })
})

describe('排序里的位置', () => {
  it('够得着的排同档前头', () => {
    const out = rankRows([row({ key: 'plain' }), row({ key: 'above', aboveLine: true })], ctx)
    expect(out.map((r) => r.key)).toEqual(['above', 'plain'])
  })

  it('够不着的沉队尾,够得着救不了别的档', () => {
    const out = rankRows([row({ key: 'sunk', belowLine: true }), row({ key: 'plain' })], ctx)
    expect(out.map((r) => r.key)).toEqual(['plain', 'sunk'])
  })

  it('够得着**不许**翻越本省优先 —— 分够不够是「多久到手」,不是「能不能走」', () => {
    const home: RankCtx = { jobsOf: () => 50, homeProvs: new Set(['ON']) }
    const out = rankRows([
      row({ key: 'ab-above', province: 'AB', aboveLine: true }),
      row({ key: 'on-home', province: 'ON' }),
    ], home)
    expect(out[0].key).toBe('on-home')
  })

  it('够得着也翻不过 0 岗沉底', () => {
    const zero: RankCtx = { jobsOf: (r) => (r.key === 'zero' ? 0 : 50), homeProvs: new Set<string>() }
    const out = rankRows([row({ key: 'zero', aboveLine: true }), row({ key: 'plain' })], zero)
    expect(out.map((r) => r.key)).toEqual(['plain', 'zero'])
  })
})

// ── 加分项回流(2026-08-16 Frank 拍第 1 条)────────────────────────────────────
// 病灶:勾选留在分值卡的 localStorage 里,从不上行 ⇒ 服务端一律按「没勾=0」算 ⇒
// 带加分项的省(AB 12 条)估分恒是全 0 下界 ⇒ 恒落「取决于加分项」,「够得着」出不来。
// 这里用**真数据**(data/mart)钉住:同一份档案,勾了加分项分必须涨,且涨到线上时转 above。
describe('加分项勾选进估分', () => {
  const data: VerdictData = {
    requirements: mart<Requirement>('pnp_requirements'),
    occupations: mart<OccupationRow>('pnp_occupations'),
    draws: mart<VerdictDrawRow>('pnp_draws'),
    scoreFactors: mart<ScoreFactor>('pnp_score_factors'),
    eeGrid: mart<EeGridRow>('ee_points_grid'),
    designatedEmployers: mart<DesignatedEmployerRow>('designated_employers'),
  }
  const base: VerdictProfile = {
    age: 30, married: false, clb: 8, edu: 'bachelor', eduYears: 4, canadaStudy: true, studyProvince: 'AB',
    noc: '72310', teer: 2, expCanadaMonths: 36, expForeignMonths: 24, foreignExpSelfEmployed: false,
    hasOffer: true, inCanada: true, status: 'work', province: 'AB', permit: 'work',
    fieldMatch: true, frenchOk: null,
  }
  const abScore = (p: VerdictProfile) => pathVerdict(p, data).find((v) => v.province === 'AB' && v.score)?.score ?? null

  it('AB 表确实带加分项(前提变了这条先炸)', () => {
    expect(data.scoreFactors.filter((f) => f.province === 'AB' && f.kind === 'bonus').length).toBeGreaterThan(0)
  })

  it('勾了加分项,估分下界必须涨(上界不动 —— 它本来就按满分算)', () => {
    const before = abScore(base)
    expect(before?.value).toBeTypeOf('number')
    const ticks: Record<string, boolean> = {}
    for (const f of data.scoreFactors.filter((x) => x.province === 'AB' && x.kind === 'bonus')) {
      const i = Object.keys(ticks).filter((k) => k.startsWith(`AB:${f.factor}:`)).length
      ticks[`AB:${f.factor}:${i}`] = true
    }
    const after = abScore({ ...base, scoreTicks: ticks })
    expect(after!.value).toBeGreaterThan(before!.value)
    expect(after!.ceiling).toBe(before!.ceiling)
  })

  it('别省的勾选一分都不许算进本省', () => {
    const before = abScore(base)
    const after = abScore({ ...base, scoreTicks: { 'BC:wage:0': true, 'SK:connection:0': true } })
    expect(after!.value).toBe(before!.value)
  })

  it('勾满之后若下界过线,三态从留白转「够得着」', () => {
    const ticks: Record<string, boolean> = {}
    for (const f of data.scoreFactors.filter((x) => x.province === 'AB' && x.kind === 'bonus')) {
      const i = Object.keys(ticks).filter((k) => k.startsWith(`AB:${f.factor}:`)).length
      ticks[`AB:${f.factor}:${i}`] = true
    }
    const after = abScore({ ...base, scoreTicks: ticks })
    // 线来自官方抽选史;勾满后下界 ≥ 线 ⇒ above。线若某天涨过上界,这条会如实炸
    if (after!.refLine != null && after!.value >= after!.refLine) expect(lineStateOf(after!)).toBe('above')
    else expect(lineStateOf(after!)).not.toBe('below')
  })
})
