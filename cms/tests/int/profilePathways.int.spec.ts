import { describe, expect, it } from 'vitest'
import { pathwayMatchesTargets, splitAipByProvince } from '@/app/api/profile-pathways/route'

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

describe('splitAipByProvince(2026-08-15 Frank「aip 别四个省放一起,分开来算」)', () => {
  const rows = [
    { key: 'AIP', province: 'FED', tier: 0 },
    { key: 'NS-sw', province: 'NS', tier: 0 },
  ]
  it('目标省∩大西洋四省逐省一行,判定字段原样复制', () => {
    const out = splitAipByProvince(rows, ['NL', 'NS', 'AB', 'MB'])
    expect(out.filter((r) => r.key === 'AIP').map((r) => r.province).sort()).toEqual(['NL', 'NS'])
    expect(out.filter((r) => r.key === 'AIP').every((r) => r.tier === 0)).toBe(true)
  })
  it('不限省 = 四省全拆', () => {
    expect(splitAipByProvince(rows, []).filter((r) => r.key === 'AIP')).toHaveLength(4)
  })
  it('非 AIP 行原样,不动序', () => {
    const out = splitAipByProvince(rows, ['NS'])
    expect(out[out.length - 1]).toEqual({ key: 'NS-sw', province: 'NS', tier: 0 })
  })
})
