// 整理版节内小标题(components/jobs 的 jdSubheadOf + JdSecLines;2026-10-02 Frank「这个应该是一个 title 吧」,
// Maarut 帖 REQS 节里「- Preferred:」被渲成一条要求)。钉住三件:
//   ① 只有剥掉「- 」后整行是裸标签(大写开头、≤ 40 字、冒号收尾)才算小标题,字里不带冒号;
//   ② 「Label: 值」、截断的半句、长句、小写开头都不算;
//   ③ 渲染时列表在小标题前后断成两段,小标题本身不是 li;有对照就按界面语出小标题(去冒号),不另挂对照行。
// 同日 jdSubgroupsOf(Frank「没有就不加这一项」「Experience 这叫什么 preferred」):
//   ④ 小标题底下与前面某条同词起头的重抄丢掉,丢空的小标题整个不出;⑤ Preferred 换界面语词条。
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数与组件直接点文件(桶只走门的规矩不管测试)
import { jdSubgroupsOf, jdSubheadOf } from '@/components/jobs/functions'
import { JdSecLines } from '@/components/jobs/jdseclines'

describe('jdSubheadOf', () => {
  it('裸标签行给小标题字(去冒号)', () => {
    expect(jdSubheadOf('- Preferred:')).toBe('Preferred')
    expect(jdSubheadOf('Preferred:')).toBe('Preferred')
    expect(jdSubheadOf('- Nice to have:')).toBe('Nice to have')
  })
  it('不是裸标签的一律空串', () => {
    expect(jdSubheadOf('- Expertise i')).toBe('')
    expect(jdSubheadOf('- Salary: $20/hr')).toBe('')
    expect(jdSubheadOf('- preferred:')).toBe('')
    expect(jdSubheadOf('- Experience with cloud platforms and deployment pipelines in production:')).toBe('')
  })
})

describe('JdSecLines', () => {
  it('列表在小标题处断开,小标题不是 li', () => {
    const host = document.createElement('div')
    const pairs = [
      { en: '- Over 8 years of .NET', zh: '' },
      { en: '- Preferred:', zh: '优先考虑条件:' },
      { en: '- Microsoft Azure', zh: '' },
    ]
    act(() => {
      createRoot(host).render(React.createElement(JdSecLines, { pairs: pairs, bullets: true }))
    })
    const tags = Array.from(host.children).map((el) => el.tagName)
    expect(tags).toEqual(['UL', 'DIV', 'UL'])
    expect(host.querySelectorAll('li').length).toBe(2)
    expect(host.querySelector('div')!.textContent).toBe('优先考虑条件')
  })
})

/**
 * 测试用取词函数:回键名,看得出换没换词条。
 */
function tKey(key: string): string {
  return '<' + key + '>'
}

/**
 * 只取原文列,断言好读。
 */
function ensOf(pairs: { en: string, zh: string }[]): string[] {
  return pairs.map(function en(p) {
    return p.en
  })
}

describe('jdSubgroupsOf', () => {
  it('金标:Job Bank「Experience an asset」被重抄成 Preferred 底下的「Experience」→ 整组不出', () => {
    const pairs = [
      { en: '- Experience an asset', zh: '' },
      { en: '- Own transportation', zh: '' },
      { en: 'Preferred:', zh: '优先考虑:' },
      { en: '- Experience', zh: '工作经验' },
    ]
    expect(ensOf(jdSubgroupsOf({ t: tKey, pairs }))).toEqual(['- Experience an asset', '- Own transportation'])
  })
  it('小标题底下一条不剩(占位行已被 jdPairsOf 丢)→ 小标题不出', () => {
    const pairs = [{ en: '- Secondary school', zh: '' }, { en: '- Preferred:', zh: '' }]
    expect(ensOf(jdSubgroupsOf({ t: tKey, pairs }))).toEqual(['- Secondary school'])
  })
  it('有真加分项:小标题留着,Preferred 的对照位换成界面语词条', () => {
    const pairs = [
      { en: '- Over 8 years of .NET', zh: '' },
      { en: '- Preferred:', zh: '优先考虑:' },
      { en: '- Microsoft Azure', zh: '' },
    ]
    const out = jdSubgroupsOf({ t: tKey, pairs })
    expect(ensOf(out)).toEqual(['- Over 8 years of .NET', '- Preferred:', '- Microsoft Azure'])
    expect(out[1]!.zh).toBe('<jd.preferred>')
  })
  it('只丢重抄的那条,同组别的留着;半词不算重抄', () => {
    const pairs = [
      { en: '- Experience an asset', zh: '' },
      { en: '- Preferred:', zh: '' },
      { en: '- Experience', zh: '' },
      { en: '- Expe', zh: '' },
      { en: '- Forklift licence.', zh: '' },
    ]
    expect(ensOf(jdSubgroupsOf({ t: tKey, pairs }))).toEqual(['- Experience an asset', '- Preferred:', '- Expe', '- Forklift licence.'])
  })
  it('非 Preferred 的小标题不换词条;没有小标题的节原样', () => {
    const plain = [{ en: '- A', zh: '' }, { en: '- A', zh: '' }]
    expect(jdSubgroupsOf({ t: tKey, pairs: plain })).toEqual(plain)
    const out = jdSubgroupsOf({ t: tKey, pairs: [{ en: '- Nice to have:', zh: '加分:' }, { en: '- Go', zh: '' }] })
    expect(out[0]!.zh).toBe('加分:')
  })
})
