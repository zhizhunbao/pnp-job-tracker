// 整理版「怎么投」一节的显示(2026-11-12 Frank「这个信息整理 jd 的时候没加进来啊」「依次修吧」;components/jobs,jsdom 挂件验)。
// 起因:Opus Art Supplies 帖的「怎么投」写着雇主指定的邮件标题,2026-09-14 起这一节整节不渲,整理版里看不到。
// 性质:① 有内容就出一节行文(小标题 + 原句),有没有原帖链接、有没有投递邮箱都一样;② 行文里不带链接(投递出口只有投递栏的钮);
//       ③ 整节缺(没写 / (not stated) / (none stated) / (dnot stated) 这类变体)不出,有没有原帖链接、投递邮箱都不出;
//       ④ 别的节不受影响。
// 探针:JdSection 把 applyLines 档也当不出 → ①红;把 applyEmail / applyLink 两档放出来 → ③红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { JdFormattedView } from '@/components/jobs/jdformattedview'

const FIVE = '[ROLE]\nBake bread daily.\n[REQS]\n- High school\n[PAY]\n- $18 hourly\n[WORKHOURS]\n- 40 hours per week\n'
const ASK = 'Email resume and brief cover letter to [see original posting] with subject line "Retail Store Manager Application."'
const JB_URL = 'https://www.jobbank.gc.ca/jobsearch/jobposting/50718489'
const URLS = ['', JB_URL]
const MAILS = ['', 'hr@example.com']
const NONE_FORMS = ['', '(not stated)', '- (not stated)', '(none stated)', '(none)', '(none provided in posting)', '(dnot stated)', "(don't stated)"]

function t(key: string): string {
  return key
}

function mount(x: { apply: string; applyUrl: string; applyEmail: string }): HTMLElement {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const el = document.createElement('div')
  document.body.appendChild(el)
  act(() => {
    createRoot(el).render(createElement(JdFormattedView, {
      text: FIVE + '[APPLY]\n' + x.apply, t, trans: '', fallbackPay: '', applyUrl: x.applyUrl, applyEmail: x.applyEmail,
      underTitle: false,
    }))
  })
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('整理版「怎么投」一节', () => {
  it('有内容就出小标题和原句,不带链接', () => {
    for (const applyUrl of URLS) {
      for (const applyEmail of MAILS) {
        const el = mount({ apply: ASK, applyUrl, applyEmail })
        expect(el.textContent).toContain('act.f.apply')
        expect(el.textContent).toContain('with subject line "Retail Store Manager Application."')
        expect(el.querySelectorAll('a').length).toBe(0)
      }
    }
  })

  it('整节缺不出,有没有原帖链接、投递邮箱都不出', () => {
    for (const apply of NONE_FORMS) {
      for (const applyUrl of URLS) {
        for (const applyEmail of MAILS) {
          const el = mount({ apply, applyUrl, applyEmail })
          expect(el.textContent, apply + '|' + applyUrl + '|' + applyEmail).not.toContain('act.f.apply')
          expect(el.textContent).not.toContain('stated')
          expect(el.textContent).not.toContain('hr@example.com')
        }
      }
    }
  })

  it('别的节照常出', () => {
    const el = mount({ apply: ASK, applyUrl: JB_URL, applyEmail: '' })
    expect(el.textContent).toContain('Bake bread daily.')
    expect(el.textContent).toContain('40 hours per week')
  })
})
