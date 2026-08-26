import { describe, expect, it } from 'vitest'
import { pathwayMatchesTargets, splitDecorated } from '@/lib/ruling/server'
import type { PathwayVerdict, SplitRow } from '@/lib/ruling/server'

// 引擎行的最小夹具:判定字段随手可辨(tier 当探针),形状照 PathwayVerdict 填全。
function rowFix(key: string, province: string): PathwayVerdict {
  return {
    key, province, stream: '', verdict: 'viable', tier: 0, tierBasis: 'now',
    reasons: [], availability: 'ok',
  }
}

describe('profile pathway province scope', () => {
  it('keeps nationwide programs but removes regional federal programs outside selected provinces', () => {
    expect(pathwayMatchesTargets({ key: 'FED-EE', province: 'FED', targets: ['BC', 'SK'] })).toBe(true)
    expect(pathwayMatchesTargets({ key: 'AIP', province: 'FED', targets: ['BC', 'SK'] })).toBe(false)
    expect(pathwayMatchesTargets({ key: 'AIP', province: 'FED', targets: ['NS'] })).toBe(true)
    expect(pathwayMatchesTargets({ key: 'RCIP', province: 'FED', targets: ['ON'] })).toBe(true)
    expect(pathwayMatchesTargets({ key: 'RCIP', province: 'FED', targets: ['NL'] })).toBe(false)
    expect(pathwayMatchesTargets({ key: 'SK-offer', province: 'SK', targets: ['BC', 'SK'] })).toBe(true)
    expect(pathwayMatchesTargets({ key: 'ON-workforce', province: 'ON', targets: ['BC', 'SK'] })).toBe(false)
  })
})

describe('splitDecorated(2026-08-15 Frank「aip 别四个省放一起,分开来算」「rcip 也需要拆」)', () => {
  const rows = [rowFix('AIP', 'FED'), rowFix('RCIP', 'FED'), rowFix('NS-sw', 'NS')]
  it('目标省∩区域省逐省一行,判定字段原样复制', () => {
    const out = splitDecorated({ rows, targets: ['NL', 'NS', 'AB', 'MB'], comp: {} })
    expect(out.filter((r: SplitRow) => r.key === 'AIP').map((r: SplitRow) => r.province).sort()).toEqual(['NL', 'NS'])
    expect(out.filter((r: SplitRow) => r.key === 'RCIP').map((r: SplitRow) => r.province).sort()).toEqual(['AB', 'MB', 'NS'])
    expect(out.filter((r: SplitRow) => r.key === 'AIP' || r.key === 'RCIP').every((r: SplitRow) => r.tier === 0)).toBe(true)
  })
  it('不限省 = 区域省全拆(AIP 4 省、RCIP 6 省)', () => {
    const out = splitDecorated({ rows, targets: [], comp: {} })
    expect(out.filter((r: SplitRow) => r.key === 'AIP')).toHaveLength(4)
    expect(out.filter((r: SplitRow) => r.key === 'RCIP')).toHaveLength(6)
  })
  it('非区域行原样保留一行(竞争度按省挂,查无该省 = null)', () => {
    const out = splitDecorated({ rows, targets: [], comp: {} })
    const ns = out.filter((r: SplitRow) => r.key === 'NS-sw')
    expect(ns).toHaveLength(1)
    expect(ns[0]?.province).toBe('NS')
    expect(ns[0]?.competition).toBeNull()
  })
})
