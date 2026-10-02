// 整理版节内小标题(components/jobs 的 jdSubheadOf + JdSecLines;2026-10-02 Frank「这个应该是一个 title 吧」,
// Maarut 帖 REQS 节里「- Preferred:」被渲成一条要求)。钉住三件:
//   ① 只有剥掉「- 」后整行是裸标签(大写开头、≤ 40 字、冒号收尾)才算小标题,字里不带冒号;
//   ② 「Label: 值」、截断的半句、长句、小写开头都不算;
//   ③ 渲染时列表在小标题前后断成两段,小标题本身不是 li。
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数与组件直接点文件(桶只走门的规矩不管测试)
import { jdSubheadOf } from '@/components/jobs/functions'
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
    expect(host.querySelector('div')!.textContent).toContain('Preferred')
  })
})
