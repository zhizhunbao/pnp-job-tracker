// 雇主省提名门槛判定单测(design/雇主省提名门槛判定-20260808.md B4)。纯函数,不需要 DB。
// 六类锁死:达标 / 差年限 / 缺员工数 / 公共部门 / 营业额省(恒旁证不进 state)/ 门槛缺省份。
import { describe, it, expect } from 'vitest'
import { employerVerdict as rulingEmployerVerdict } from '@/lib/ruling'
import type { EmployerFacts, ReqRow } from '@/lib/ruling'

/** 垫片:金标沿用位置参数,判定域收对象参数(换实现时用例一个字不动) */
function employerVerdict(
  facts: EmployerFacts, province: string, reqs: ReqRow[], nowYear = new Date().getFullYear(),
) {
  return rulingEmployerVerdict({ facts: facts, province: province, reqs: reqs, nowYear: nowYear })
}

import type { Requirement } from '@/lib/rules'

const R = (o: Partial<Requirement>): Requirement => ({
  province: 'AB', program: 'PNP', stream: '', subject: 'employer', factor: '', op: '>=', value: null,
  valueText: '', unit: '', appliesTeer: '', appliesArea: '', familySize: null, basis: '', label: 'official text',
  section: '', effective: '', url: 'https://example.gov/req', pageUrl: '', fetched: '2026-08-08', ...o,
})

// AB 门槛(docs/sql/b2-employer-bars-sk-ab-pe.sql 实际值):2 年 · $400,000 · 3 名全职,三项均不分区
const AB_REQS: Requirement[] = [
  R({ factor: 'empYears', value: 2, unit: 'years' }),
  R({ factor: 'empRevenue', value: 400000, unit: 'CAD/yr' }),
  R({ factor: 'empStaff', value: 3, unit: 'employees' }),
]
// SK 门槛:24 个月(注意单位是月不是年),官方没发布通用雇员数/营业额门槛
const SK_REQS: Requirement[] = [R({ province: 'SK', factor: 'empYears', value: 24, unit: 'months' })]
// ON 门槛(分档,appliesArea 全非空——本函数只吃不分区通用门槛,这里应查不到雇员数)
const ON_REQS: Requirement[] = [
  R({ province: 'ON', factor: 'empYears', value: 3, unit: 'years' }),
  R({ province: 'ON', factor: 'empRevenue', value: 1000000, unit: 'CAD/yr', appliesArea: 'gta' }),
  R({ province: 'ON', factor: 'empRevenue', value: 500000, unit: 'CAD/yr', appliesArea: 'on-listed-cd' }),
  R({ province: 'ON', factor: 'empStaff', value: 5, unit: 'employees', appliesArea: 'gta' }),
  R({ province: 'ON', factor: 'empStaff', value: 3, unit: 'employees', appliesArea: 'outside-gta' }),
]

const F = (o: Partial<EmployerFacts> = {}): EmployerFacts =>
  ({ foundedYear: null, registryStatus: null, staffEst: null, staffEstSrc: null, sector: null, ...o })

const NOW = 2026

describe('employerVerdict', () => {
  it('达标:AB 公司成立 5 年 + 5 名员工,年限/雇员数双达标', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 5, staffEst: 5 }), 'AB', AB_REQS, NOW)
    expect(v.state).toBe('met')
    expect(v.failed).toEqual([])
    expect(v.missing).toEqual([])
    expect(v.items.find((i) => i.factor === 'years')).toMatchObject({ verdict: 'pass', need: 2, have: 5 })
    expect(v.items.find((i) => i.factor === 'staff')).toMatchObject({ verdict: 'pass', need: 3, have: 5 })
  })

  it('差年限:SK 公司才成立 1 年(需 24 个月=2 年),单位月→年换算后判 fail', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 1 }), 'SK', SK_REQS, NOW)
    expect(v.state).toBe('short')
    expect(v.failed).toEqual(['years'])
    const years = v.items.find((i) => i.factor === 'years')!
    expect(years.verdict).toBe('fail')
    expect(years.need).toBe(2)   // 24 个月换算成 2 年
    expect(years.short).toBe(1)
  })

  it('缺员工数:AB 公司年限达标但没查到员工数估算,该项 unknown 但不误判 fail', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 5, staffEst: null }), 'AB', AB_REQS, NOW)
    expect(v.state).toBe('unknown')
    expect(v.missing).toEqual(['staff'])
    expect(v.failed).toEqual([])
    const staff = v.items.find((i) => i.factor === 'staff')!
    expect(staff.verdict).toBe('unknown')
    expect(staff.evidence).toBe('missing')
  })

  it('公共部门:sector=public 整体旁路,不管其余事实有没有都不硬判', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 20, staffEst: 500, sector: 'public' }), 'AB', AB_REQS, NOW)
    expect(v.state).toBe('public')
    expect(v.items).toEqual([])
    expect(v.revenue).toBeNull()
  })

  it('营业额省:AB 有营业额门槛,revenue 恒 unknown 且不拖累已判定的年限/雇员数(state 仍能到 met)', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 5, staffEst: 5 }), 'AB', AB_REQS, NOW)
    expect(v.revenue).toMatchObject({ verdict: 'unknown', need: 400000, have: null })
    expect(v.state).toBe('met')   // revenue 不进 failed/missing,不影响整体
    // ON 分档省份同理:revenue 恒 unknown,且分档雇员数认不出档位时该项也是 unknown(不瞎猜哪档)
    const von = employerVerdict(F({ foundedYear: NOW - 10 }), 'ON', ON_REQS, NOW)
    expect(von.revenue?.verdict).toBe('unknown')
    expect(von.missing).toEqual(['staff'])   // ON 雇员数门槛全分档,本函数认不出单一地址该套哪档
  })

  it('门槛缺省份:reqs 里压根没有该省的雇主侧行,items 为空、state=unknown', () => {
    const v = employerVerdict(F({ foundedYear: NOW - 5, staffEst: 5 }), 'QC', [], NOW)
    expect(v.state).toBe('unknown')
    expect(v.items).toEqual([])
    expect(v.revenue).toBeNull()
    expect(v.missing).toEqual([])
    expect(v.failed).toEqual([])
  })
})
