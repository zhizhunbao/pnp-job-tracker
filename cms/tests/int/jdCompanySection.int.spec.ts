// 整理版的可选节「公司简介」(2026-11-10 Frank「描述里有包含公司的信息,整理的时候也要加一项公司简介」):
// ① 有 [COMPANY] → 展示多一节,排在工作形式之后、怎么投之前;② 没有 → 仍是五节,不摆「原帖未提及」;
// ③ 标记挤在一行时 [COMPANY] 也顶到行首;④ 只有公司套话、五节全空的整理版照旧算全空(不许盖掉原文)。
import { describe, expect, it } from 'vitest'
import { jdSectionViewsOf } from '@/components/jobs/functions'
import { jdAllEmptyOf, jdMarkLinesOf } from '@/lib/jobs/functions'

const FIVE = '[ROLE]\nBake bread daily.\n[REQS]\n- High school\n[PAY]\n- $18 hourly\n[WORKHOURS]\n- 40 hours per week\n'
const APPLY = '[APPLY]\nApply on the company website.'
const COMPANY = '[COMPANY]\nMaple Bakery has served Ottawa since 1990. Our mission is fresh bread for every table.\n'

function t(key: string): string {
  return key
}

function marksOf(text: string): string[] {
  const views = jdSectionViewsOf({
    text, t, trans: '', fallbackPay: '', applyUrl: '', applyEmail: '', underTitle: false,
  })
  return views.map((v) => v.m)
}

describe('整理版可选节:公司简介', () => {
  it('有 [COMPANY] 就多一节,排在工作形式之后、怎么投之前', () => {
    expect(marksOf(FIVE + COMPANY + APPLY)).toEqual(['ROLE', 'REQS', 'PAY', 'WORKHOURS', 'COMPANY', 'APPLY'])
  })

  it('公司简介一节带着原帖句子', () => {
    const views = jdSectionViewsOf({
      text: FIVE + COMPANY + APPLY, t, trans: '', fallbackPay: '', applyUrl: '', applyEmail: '', underTitle: false,
    })
    const sec = views.find((v) => v.m === 'COMPANY')
    expect(sec?.head).toBe('act.f.company')
    expect(sec?.pairs.map((p) => p.en).join(' ')).toContain('Our mission is fresh bread')
  })

  it('没有 [COMPANY] 仍是五节,不出空的公司简介', () => {
    expect(marksOf(FIVE + APPLY)).toEqual(['ROLE', 'REQS', 'PAY', 'WORKHOURS', 'APPLY'])
  })

  it('[COMPANY] 底下只有 (not stated) 也不出', () => {
    expect(marksOf(FIVE + '[COMPANY]\n(not stated)\n' + APPLY)).toEqual(['ROLE', 'REQS', 'PAY', 'WORKHOURS', 'APPLY'])
  })

  it('标记挤在一行时 [COMPANY] 也顶到行首', () => {
    const one = '[WORKHOURS] - 40 hours [COMPANY] We bake. [APPLY] Apply online.'
    expect(jdMarkLinesOf(one).split('\n')).toContain('[COMPANY] We bake.')
  })

  it('只有公司套话、五节全空的整理版照旧算全空', () => {
    const blank = '[ROLE]\n(not stated)\n[REQS]\n(not stated)\n[PAY]\n(not stated)\n[WORKHOURS]\n(not stated)\n'
      + COMPANY + '[APPLY]\n(not stated)'
    expect(jdAllEmptyOf(blank)).toBe(true)
    expect(jdAllEmptyOf(FIVE + COMPANY + APPLY)).toBe(false)
  })
})
