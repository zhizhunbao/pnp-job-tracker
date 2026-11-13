// 公司页的 LMIA 卡与指定雇主卡(2026-11-13 Frank「做成单独的卡 LMIA AIP RCIP FCIP 都是单独的卡。这样比较清晰」
// 「没有信息就不显示这个卡」;lib/jobs 的分卡函数 + components/companies 的两张卡,jsdom 挂件验)。
// 性质:① 分卡:一个项目一张,AIP / RCIP / FCIP 排前面、名单多出来的项目接后面;地点只进项目对得上的那张,
//          登记名只进名单表里记在这个项目下的那张;没命中项目给空表;
//       ② 登记名「在哪」:有地点用地点(自带省码的不再接一遍),没地点用省码,都没有空串;
//       ③ LMIA 卡:岗位数 / 最近季度 / 通道 / 获批职业四样都没有不出,有一样就出;
//       ④ 指定雇主卡:卡名是项目码;地点与登记名都没有不出;登记名先出 10 个(全站清单同一个数),其余点展开。
// 探针:designatedCardsOf 不按项目筛地点 → ①第一条红;toDesignatedName 一律「地点, 省码」→ ②第一条红;
//       hasLmiaOf 只看岗位数 → ③第二条红;CompanyProgramCard 空卡也渲 → ④第二条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { CompanyLmiaCard } from '@/components/companies/companylmiacard'
import { CompanyProgramCard } from '@/components/companies/companyprogramcard'
import { hasLmiaOf } from '@/components/companies/functions'
import type { CompanyDetail } from '@/components/companies/types'
import { designatedCardsOf, toDesignatedName } from '@/lib/jobs/functions'

function t(key: string): string {
  return key
}

function company(over: Partial<CompanyDetail>): CompanyDetail {
  return {
    name: 'Tim Hortons', slug: 'tim-hortons', website: '', websiteSource: '', careersUrl: '', hq: '', hqSource: '',
    industry: '', sectors: '', aliasZh: '', aliasKo: '', wikiUrl: '', sponsorGrade: null, scoreDetail: null, aiBrief: '',
    aiWebsite: '', aiSources: [], aiFetched: '', address: '', province: '', lmiaPositions: null, lmiaLmias: null,
    lmiaLastQuarter: '', lmiaStreams: '', lmiaSkilled: null, lmia4q: null, lmiaNocs: [], designated: [],
    openCount: 0, jobs: [], ...over,
  }
}

function mount(node: ReturnType<typeof createElement>): HTMLElement {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const el = document.createElement('div')
  document.body.appendChild(el)
  act(() => {
    createRoot(el).render(node)
  })
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('指定雇主:按项目分卡', () => {
  const rows = [
    { name: 'A Ltd. o/a Tim Hortons', program: 'AIP', where: 'NS' },
    { name: 'B Ltd. (Tim Hortons)', program: 'RCIP', where: 'Peace Liard, BC' },
    { name: 'C Ltd.', program: 'AIP', where: 'NB' },
    { name: 'D Ltd.', program: 'XYZ', where: 'ON' },
  ]
  const places = ['AIP|NB', 'AIP|Marystown', 'RCIP|Peace Liard, BC', 'FCIP|Acadian Peninsula, NB', 'XYZ|Somewhere']

  it('一个项目一张:地点与登记名各归各的项目', () => {
    const cards = designatedCardsOf({ programs: ['RCIP', 'AIP', 'FCIP'], places, rows })
    expect(cards.map((c) => c.program)).toEqual(['AIP', 'RCIP', 'FCIP'])
    expect(cards[0]).toEqual({
      program: 'AIP', places: ['NB', 'Marystown'],
      names: [{ name: 'A Ltd. o/a Tim Hortons', where: 'NS' }, { name: 'C Ltd.', where: 'NB' }],
    })
    expect(cards[1]).toEqual({
      program: 'RCIP', places: ['Peace Liard, BC'], names: [{ name: 'B Ltd. (Tim Hortons)', where: 'Peace Liard, BC' }],
    })
    expect(cards[2]).toEqual({ program: 'FCIP', places: ['Acadian Peninsula, NB'], names: [] })
  })

  it('名单多出来的项目接在后面,不用改代码;没命中项目给空表', () => {
    const cards = designatedCardsOf({ programs: ['XYZ', 'RCIP+FCIP', 'AIP'], places, rows })
    expect(cards.map((c) => c.program)).toEqual(['AIP', 'XYZ', 'RCIP+FCIP'])
    expect(cards[1]).toEqual({ program: 'XYZ', places: ['Somewhere'], names: [{ name: 'D Ltd.', where: 'ON' }] })
    expect(designatedCardsOf({ programs: [], places, rows })).toEqual([])
  })

  it('任意项目组合:每个项目恰好一张,地点与登记名不串到别的项目', () => {
    const all = ['AIP', 'RCIP', 'FCIP', 'XYZ']
    for (let mask = 0; mask < 16; mask += 1) {
      const programs = all.filter((_, i) => (mask & (1 << i)) !== 0)
      const cards = designatedCardsOf({ programs, places, rows })
      expect(cards.map((c) => c.program).sort()).toEqual([...programs].sort())
      for (const c of cards) {
        expect(c.places).toEqual(places.filter((p) => p.startsWith(c.program + '|')).map((p) => p.slice(c.program.length + 1)))
        expect(c.names.map((n) => n.name)).toEqual(rows.filter((r) => r.program === c.program).map((r) => r.name))
      }
    }
  })
})

describe('指定雇主:登记名在哪', () => {
  it('地点自带省码不再接一遍;不带的接上;没地点用省码;都没有空串', () => {
    const of = (location: string | null, province: string | null) => toDesignatedName({
      name: 'N', source: 'RCIP', province, location,
    }).where
    expect(of('Peace Liard, BC', 'BC')).toBe('Peace Liard, BC')
    expect(of('Marystown', 'NL')).toBe('Marystown, NL')
    expect(of('', 'NS')).toBe('NS')
    expect(of(null, 'NS')).toBe('NS')
    expect(of('Whitbourne', '')).toBe('Whitbourne')
    expect(of(null, null)).toBe('')
  })

  it('名字与项目缺格按空串', () => {
    expect(toDesignatedName({ name: null, source: null, province: null, location: null })).toEqual({
      name: '', program: '', where: '',
    })
  })
})

describe('LMIA 卡', () => {
  it('四样都没有不出', () => {
    expect(hasLmiaOf({ company: company({}) })).toBe(false)
    expect(hasLmiaOf({ company: company({ lmiaPositions: 0 }) })).toBe(false)
    const el = mount(createElement(CompanyLmiaCard, { company: company({}), t, lang: 'zh' }))
    expect(el.textContent).toBe('')
  })

  it('有一样就出', () => {
    expect(hasLmiaOf({ company: company({ lmiaPositions: 3 }) })).toBe(true)
    expect(hasLmiaOf({ company: company({ lmiaLastQuarter: '2026Q2' }) })).toBe(true)
    expect(hasLmiaOf({ company: company({ lmiaStreams: 'Low Wage 3' }) })).toBe(true)
    expect(hasLmiaOf({
      company: company({ lmiaNocs: [{ noc: '62020', positions: 2, title: '', titleZh: '', titleKo: '' }] }),
    })).toBe(true)
  })

  it('岗位数、份数、最近季度、近四个季度都在卡上', () => {
    const el = mount(createElement(CompanyLmiaCard, {
      company: company({ lmiaPositions: 208, lmiaLmias: 128, lmiaLastQuarter: '2026Q2', lmia4q: 29 }), t, lang: 'zh',
    }))
    expect(el.textContent).toContain('co.lmia')
    expect(el.textContent).toContain('208')
    expect(el.textContent).toContain('2026Q2')
    expect(el.textContent).toContain('29')
  })
})

describe('指定雇主卡', () => {
  it('卡名是项目码,列出地点与登记名', () => {
    const el = mount(createElement(CompanyProgramCard, {
      card: { program: 'RCIP', places: ['Claresholm, AB'], names: [{ name: 'B Ltd.', where: 'Claresholm, AB' }] }, t,
    }))
    expect(el.textContent).toContain('RCIP')
    expect(el.textContent).toContain('Claresholm, AB')
    expect(el.textContent).toContain('B Ltd.')
  })

  it('地点与登记名都没有不出', () => {
    const el = mount(createElement(CompanyProgramCard, { card: { program: 'AIP', places: [], names: [] }, t }))
    expect(el.textContent).toBe('')
  })

  it('登记名先出 10 个,其余点展开', () => {
    const names = []
    for (let i = 1; i <= 13; i += 1) {
      names.push({ name: 'Name-' + i + '-end', where: 'NS' })
    }
    const el = mount(createElement(CompanyProgramCard, { card: { program: 'AIP', places: [], names }, t }))
    expect(el.textContent).toContain('Name-10-end')
    expect(el.textContent).not.toContain('Name-11-end')
    const more = el.querySelector('button')
    expect(more).not.toBeNull()
    act(() => {
      more?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(el.textContent).toContain('Name-13-end')
  })
})
