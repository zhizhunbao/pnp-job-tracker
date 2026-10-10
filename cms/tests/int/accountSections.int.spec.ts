// 「我的」四页签照 AIApply 重设计(2026-10-08;docs/design/我的模块-照AIApply-20261007.md;dev 直连生产库不登录,登录后的界面用 jsdom 挂件验)。
// 性质:① 「求职信」段:清单没回来 / 一封没有都不出;草稿卡挂「草稿」+「继续」去投递区(职位删了没有「继续」),发出去的卡挂
//          「已投递」+「打开」PDF;
//       ② 「我的订阅」:免费态 = 「免费版」+ 两档价格 + 「升级 Pro」;Pro 态 = 「Pro」+ 「还剩 N 天」+ 有效期至 + 「续买」;
//          「Pro 包含」五条只出名字;付款记录按 /api/stripe/payments 拉,有才出表(日期 / 内容 / 金额 / 收据);
//       ③ 发出后的成功条写公司名;
//       ④ 行构造器:求职信的「写于」= 发出时刻,草稿退到最近改动时刻;付款的天数读 metadata、金额分换元、收据只认展开到扣款的。
// 探针:CoverLetters 去掉 checked 闸 → ①「没回来不出」红;SubPlan 把 pro 判反 → ② 红;toPaymentRow 不判 intent 是串 → ④ 收据红。
import { act, createElement } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CoverLetters, SentNotice, Subscription } from '@/components/account'
import { toApplyLetter } from '@/lib/apply/functions'
import { toPaymentRow } from '@/lib/stripe/functions'
import type { StripeCheckoutSession } from '@/lib/stripe/types'
// jsdom 里 React 要这面旗才认 act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const DRAFT = { id: 31, jobId: 101, title: 'office manager', company: 'Anurag Homes Team', status: 'draft', wroteAt: '2026-10-07T10:00:00.000Z' }
const SENT = { id: 30, jobId: 102, title: 'retail sales associate', company: 'Fast Time', status: 'sent', wroteAt: '2026-10-04T09:00:00.000Z' }
const GONE = { id: 29, jobId: null, title: 'wire assembler', company: 'Kevtron', status: 'draft', wroteAt: '2026-10-01T09:00:00.000Z' }
const PAY = { id: 'cs_1', paidAt: '2026-10-07T00:00:00.000Z', days: 90, amount: 14.69, currency: 'cad', receiptUrl: 'https://pay.stripe.com/r/1' }

type Reply = { status: number, body: object }

// fetch 桩:按「方法 地址」分账,没配的一律挂起;记下每次请求
function server(routes: Record<string, Reply | 'hang'>) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push(key)
    const r = routes[key]
    if (r == null || r === 'hang') {
      return new Promise(() => undefined)
    }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }))
  return calls
}

async function flush() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

async function mount(comp: typeof CoverLetters | typeof Subscription | typeof SentNotice, props: object) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(comp as never, { t, ...props }))
  })
  await flush()
  return el
}

function hrefs(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('a')).filter((x) => x.textContent === text).map((x) => x.getAttribute('href'))
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('① 求职信段', () => {
  it('清单没回来不出;一封没有不出', async () => {
    server({ 'GET /api/apply/letters': 'hang' })
    expect((await mount(CoverLetters, {})).textContent).toBe('')
    server({ 'GET /api/apply/letters': { status: 200, body: { items: [] } } })
    expect((await mount(CoverLetters, {})).textContent).toBe('')
  })

  it('草稿卡「继续」去投递区(职位删了没有),发出去的卡「打开」PDF', async () => {
    server({ 'GET /api/apply/letters': { status: 200, body: { items: [DRAFT, SENT, GONE] } } })
    const el = await mount(CoverLetters, {})
    expect(el.textContent).toContain('rl.title')
    expect(el.textContent).toContain('office manager')
    expect(hrefs(el, 'mj.cont')).toEqual(['/account?sec=resume&apply=101'])   // 2026-10-09 A 批:就地弹投递框
    expect(hrefs(el, 'mj.open')).toEqual(['/api/apply/file?id=30&kind=cover'])
    expect(el.textContent).toContain('mj.draft')
    expect(el.textContent).toContain('ap.applied')
    expect(el.textContent).toContain('rl.wrote{"d":"2026-10-04"}')
  })
})

describe('② 我的订阅', () => {
  it('免费态:免费版 + 两档价格 + 升级 Pro;没买过不出付款记录', async () => {
    const calls = server({ 'GET /api/stripe/payments': { status: 200, body: { items: [] } } })
    const el = await mount(Subscription, { until: null })
    expect(el.textContent).toContain('acct.plan.free')
    expect(el.textContent).toContain('sub.price')
    expect(el.textContent).toContain('up.cta2')
    expect(el.textContent).not.toContain('sub.renew')
    expect(el.textContent).not.toContain('sub.pay')
    expect(el.textContent).toContain('price.perk.letter')
    expect(el.textContent).not.toContain('price.perk.letter.d')
    expect(calls).toContain('GET /api/stripe/payments')
  })

  it('Pro 态:还剩 N 天 + 有效期至 + 续买;付款记录出表', async () => {
    const until = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
    server({ 'GET /api/stripe/payments': { status: 200, body: { items: [PAY] } } })
    const el = await mount(Subscription, { until })
    expect(el.textContent).toContain('Pro')
    expect(el.textContent).toContain('sub.left{"n":10}')
    expect(el.textContent).toContain('acct.plan.pro')
    expect(el.textContent).toContain('sub.renew')
    expect(el.textContent).not.toContain('up.cta2')
    expect(el.textContent).toContain('sub.pay')
    expect(el.textContent).toContain('2026-10-07')
    expect(el.textContent).toContain('sub.proDays{"n":90}')
    expect(el.textContent).toContain('CA$14.69')
    expect(hrefs(el, 'sub.receipt')).toEqual(['https://pay.stripe.com/r/1'])
  })
})

describe('③ 成功条', () => {
  it('写公司名', async () => {
    const el = await mount(SentNotice, { company: 'i3 Solutions Inc.' })
    expect(el.textContent).toContain('mj.sentTo{"co":"i3 Solutions Inc."}')
  })
})

describe('④ 行构造器', () => {
  it('求职信:写于 = 发出时刻,草稿退到最近改动时刻', () => {
    const base = { id: '5', job_id: '9', job_title: 'Cook', company: 'Pie', status: 'draft', updated_at: new Date('2026-10-07T00:00:00Z'), sent_at: null }
    expect(toApplyLetter(base)).toEqual({ id: 5, jobId: 9, title: 'Cook', company: 'Pie', status: 'draft', wroteAt: '2026-10-07T00:00:00.000Z' })
    expect(toApplyLetter({ ...base, status: 'sent', sent_at: '2026-10-08T00:00:00.000Z' }).wroteAt).toBe('2026-10-08T00:00:00.000Z')
    expect(toApplyLetter({ ...base, job_id: null }).jobId).toBeNull()
  })

  it('付款:天数读 metadata、金额分换元、收据只认展开到扣款的', () => {
    const s = {
      id: 'cs_1', created: 1_790_000_000, amount_total: 1469, currency: 'cad', payment_status: 'paid', metadata: { days: '90' },
      payment_intent: { latest_charge: { receipt_url: 'https://pay.stripe.com/r/1' } },
    } as unknown as StripeCheckoutSession
    expect(toPaymentRow(s)).toEqual({
      id: 'cs_1', paidAt: new Date(1_790_000_000_000).toISOString(), days: 90, amount: 14.69, currency: 'cad',
      receiptUrl: 'https://pay.stripe.com/r/1',
    })
    const bare = { ...s, payment_intent: 'pi_1', metadata: {}, amount_total: null } as unknown as StripeCheckoutSession
    expect(toPaymentRow(bare)).toMatchObject({ days: 0, amount: 0, receiptUrl: '' })
  })
})
