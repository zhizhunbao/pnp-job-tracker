import { describe, expect, it } from 'vitest'
import { pathwayMatchesTargets } from '@/app/api/profile-pathways/route'

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
