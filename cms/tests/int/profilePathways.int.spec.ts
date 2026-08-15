import { describe, expect, it } from 'vitest'
import { pathwayMatchesTargets, splitRegionalByProvince } from '@/app/api/profile-pathways/route'

describe('profile pathway province scope', () => {
  it('keeps nationwide programs but removes regional federal programs outside selected provinces', () => {
    expect(pathwayMatchesTargets('FED-EE', 'FED', ['BC', 'SK'])).toBe(true)
    expect(pathwayMatchesTargets('AIP', 'FED', ['BC', 'SK'])).toBe(false)
    expect(pathwayMatchesTargets('AIP', 'FED', ['NS'])).toBe(true)
    expect(pathwayMatchesTargets('RCIP', 'FED', ['ON'])).toBe(true)
    expect(pathwayMatchesTargets('RCIP', 'FED', ['NL'])).toBe(false)
    expect(pathwayMatchesTargets('SK-offer', 'SK', ['BC', 'SK'])).toBe(true)
    expect(pathwayMatchesTargets('ON-workforce', 'ON', ['BC', 'SK'])).toBe(false)
  })
})

describe('splitRegionalByProvince(2026-08-15 Frank「aip 别四个省放一起,分开来算」「rcip 也需要拆」)', () => {
  const rows = [
    { key: 'AIP', province: 'FED', tier: 0 },
    { key: 'RCIP', province: 'FED', tier: 0 },
    { key: 'NS-sw', province: 'NS', tier: 0 },
  ]
  it('目标省∩区域省逐省一行,判定字段原样复制', () => {
    const out = splitRegionalByProvince(rows, ['NL', 'NS', 'AB', 'MB'])
    expect(out.filter((r) => r.key === 'AIP').map((r) => r.province).sort()).toEqual(['NL', 'NS'])
    expect(out.filter((r) => r.key === 'RCIP').map((r) => r.province).sort()).toEqual(['AB', 'MB', 'NS'])
    expect(out.filter((r) => r.key === 'AIP' || r.key === 'RCIP').every((r) => r.tier === 0)).toBe(true)
  })
  it('不限省 = 区域省全拆(AIP 4 省、RCIP 6 省)', () => {
    const out = splitRegionalByProvince(rows, [])
    expect(out.filter((r) => r.key === 'AIP')).toHaveLength(4)
    expect(out.filter((r) => r.key === 'RCIP')).toHaveLength(6)
  })
  it('非区域行原样,不动序', () => {
    const out = splitRegionalByProvince(rows, ['NS'])
    expect(out[out.length - 1]).toEqual({ key: 'NS-sw', province: 'NS', tier: 0 })
  })
})
