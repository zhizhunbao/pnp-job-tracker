// 公司卡的简介(2026-11-13 Frank「主营业务也应该是 AI 整理的 bullets」「选项一」;components/companies,jsdom 挂件验)。
// 起因:Caressant Care 的「主营业务」是一屏导航菜单文字 —— 官网抓来的原文盖住了 AI 整理版。
// 性质:① 有 AI 整理版就出它,「主营业务」是圆点列表,别的节不是;
//       ② 要点拆法:按行拆、空行丢、行首项目符号剥掉;公司名里的 Ltd. / Inc. 不被句号切开;
//       ③ 对照:条数对得上一条配一条,对不上整段挂最后一条,没有译文都不挂;
//       ④ 没缓存简介、有名字 = 要点开时现查;取到公司且不是英文界面 = 出对照钮。
// 探针:CompanyBriefBody 的「主营业务」退回 CompanyBriefSec → ①红;briefLinesOf 改按句号拆 → ②第二条红;
//       briefItemsOf 条数对不上也硬配 → ③第二条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { CompanyBriefBody } from '@/components/companies/companybriefbody'
import { briefItemsOf, briefLinesOf, canTransOf, needsAiFetchOf } from '@/components/companies/functions'
import type { CompanyDetail } from '@/components/companies/types'

const BRIEF = '[WHAT] Caressant Care operates long-term care homes and adjoined retirement homes.\n'
  + '[BASE] Woodstock, Ontario\n[SIZE] 15 long term care homes\n[FOUNDED] 1975'

function t(key: string): string {
  return key
}

function company(over: Partial<CompanyDetail>): CompanyDetail {
  return {
    name: 'Caressant Care', slug: 'caressant-care', website: '', websiteSource: '', careersUrl: '', hq: '', hqSource: '',
    industry: '', sectors: '', aliasZh: '', aliasKo: '', wikiUrl: '', sponsorGrade: null, scoreDetail: null, aiBrief: '',
    aiWebsite: '', aiSources: [], aiFetched: '', address: '', province: '', lmiaPositions: null, lmiaLmias: null,
    lmiaLastQuarter: '', lmiaStreams: '', lmiaSkilled: null, lmiaNocs: [], designatedPrograms: [],
    designatedProvinces: [], openCount: 0, jobs: [], ...over,
  }
}

function mount(brief: string, trans: string | null): HTMLElement {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const el = document.createElement('div')
  document.body.appendChild(el)
  act(() => {
    createRoot(el).render(createElement(CompanyBriefBody, { brief, trans, t, flat: false, skipBase: false, baseZh: '' }))
  })
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('公司简介:主营业务是要点列表', () => {
  it('「主营业务」出圆点列表,别的节不进列表', () => {
    const el = mount(BRIEF, null)
    const items = [...el.querySelectorAll('ul li')].map((li) => li.textContent)
    expect(items).toEqual(['Caressant Care operates long-term care homes and adjoined retirement homes.'])
    expect(el.querySelectorAll('ul').length).toBe(1)
    expect(el.textContent).toContain('Woodstock, Ontario')
    expect(el.textContent).toContain('1975')
  })

  it('多行的主营业务一行一条,带各自的对照', () => {
    const brief = '[WHAT] - Sells ramen.\n- Runs three locations.\n[BASE] Halifax'
    const trans = '[WHAT] - 卖拉面。\n- 开三家店。\n[BASE] 哈利法克斯'
    const el = mount(brief, trans)
    const items = [...el.querySelectorAll('ul li')].map((li) => li.textContent)
    expect(items).toEqual(['Sells ramen.卖拉面。', 'Runs three locations.开三家店。'])
  })
})

describe('公司简介:要点拆法', () => {
  it('按行拆、丢空行、剥行首项目符号', () => {
    expect(briefLinesOf('- A\n\n• B\r\n* C\n  D  ')).toEqual(['A', 'B', 'C', 'D'])
    expect(briefLinesOf('')).toEqual([])
    expect(briefLinesOf('   \n  ')).toEqual([])
  })

  it('一行里的句号不拆(公司名带 Ltd. / Inc. / St.)', () => {
    for (const line of ['Acme Ltd. operates stores. It also ships.', 'St. Mary Inc. runs a clinic.', 'A. B. C.']) {
      expect(briefLinesOf(line)).toEqual([line])
    }
  })
})

describe('公司简介:对照怎么配', () => {
  it('条数对得上一条配一条', () => {
    expect(briefItemsOf({ text: 'A\nB', zh: '甲\n乙' })).toEqual([{ en: 'A', zh: '甲' }, { en: 'B', zh: '乙' }])
  })

  it('条数对不上整段挂最后一条,前面的不挂', () => {
    expect(briefItemsOf({ text: 'A\nB\nC', zh: '甲乙丙' })).toEqual([
      { en: 'A', zh: '' }, { en: 'B', zh: '' }, { en: 'C', zh: '甲乙丙' },
    ])
    expect(briefItemsOf({ text: 'A', zh: '甲\n乙' })).toEqual([{ en: 'A', zh: '甲 乙' }])
  })

  it('没有译文都不挂;没有正文没有要点', () => {
    expect(briefItemsOf({ text: 'A\nB', zh: '' })).toEqual([{ en: 'A', zh: '' }, { en: 'B', zh: '' }])
    expect(briefItemsOf({ text: '', zh: '甲' })).toEqual([])
  })
})

describe('公司简介:现查与对照钮', () => {
  it('没缓存简介、有名字才现查', () => {
    expect(needsAiFetchOf({ company: company({ aiBrief: '' }) })).toBe(true)
    expect(needsAiFetchOf({ company: company({ aiBrief: BRIEF }) })).toBe(false)
    expect(needsAiFetchOf({ company: company({ aiBrief: '', name: '' }) })).toBe(false)
  })

  it('取到公司且不是英文界面就出对照钮', () => {
    expect(canTransOf({ company: company({}), lang: 'zh' })).toBe(true)
    expect(canTransOf({ company: company({}), lang: 'ko' })).toBe(true)
    expect(canTransOf({ company: company({}), lang: 'en' })).toBe(false)
    expect(canTransOf({ company: null, lang: 'zh' })).toBe(false)
  })
})
