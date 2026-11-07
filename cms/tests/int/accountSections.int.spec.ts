// 「我的」四页签照 AIApply 重设计(2026-10-08;docs/design/我的/我的求职-20261009.md;dev 直连生产库不登录,登录后的界面用 jsdom 挂件验)。
// 2026-11-07 随「我的」整页照 Fluent 2 / Azure 重做(docs/design/我的/我的框架-20261107.md 2.3 / 2.5)搬到 me 桶:
// 求职信挪成「我的简历」页的第二个页签(一张清单表,点职位名走),订阅挂整页 MeSub(页标题右边「升级 Pro」/「续买」),
// 成功条 SentNotice 随唯一消费者归 apply 桶。
// 性质:① 「求职信」页签:清单没回来只出占位;一封没有出「还没有求职信」(2026-11-07 改:原来整段不出);
//          草稿行的职位名去投递区(职位删了只出字不带链接),发出去的行的职位名开 PDF(新标签);
//          状态胶囊「草稿」/「已投递」;「写于」一列只写日期(2026-11-07 改:原来是「写于 <日期>」一句);页签角标是封数;
//       ② 「我的订阅」:免费态 = 「免费版」+ 两档价格 + 「升级 Pro」;Pro 态 = 「Pro」+ 「还剩 N 天」+ 有效期至 + 「续买」;
//          「Pro 包含」五条只出名字;付款记录按 /api/stripe/payments 拉,有出表(日期 / 内容 / 金额 / 收据),
//          没有出「还没有付款」(2026-11-07 改:原来整段不出),拉失败报错不冒充「还没有付款」;
//          新岗推送设置挪到订阅页(2026-11-07,原在「我的求职」);
//       ③ 发出后的成功条写公司名;
//       ④ 行构造器:求职信的「写于」= 发出时刻,草稿退到最近改动时刻;付款的天数读 metadata、金额分换元、收据只认展开到扣款的。
// 探针:LetterList 去掉 lettersChecked 闸 → ①「没回来只出占位」红;SubPlan 把 pro 判反 → ② 红;
//       SubPays 失败分支落「还没有付款」→ ②「拉失败」红;toPaymentRow 不判 intent 是串 → ④ 收据红。
import { act, createElement } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SentNotice } from '@/components/apply/sentnotice'
import { MeResume, MeSub } from '@/components/me'
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

// 整页件(MeResume / MeSub)要框架三格:宽屏、导航抽屉关着
const FRAME = { narrow: false, open: false, onOpen: () => undefined }

async function mount(comp: typeof MeResume | typeof MeSub | typeof SentNotice, props: object) {
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

// 「我的简历」页的「求职信」页签:点开它,交回它的面板与页签钮(按属性选 id:jsdom 里 `#id` 走全文档,同一测里挂两回会取到上一回的)
async function letterTab(el: HTMLElement) {
  const tab = el.querySelector('[id="meresume-letter"]') as HTMLButtonElement
  await act(async () => {
    tab.click()
  })
  await flush()
  const panel = el.querySelector('[id="meresume-panel-letter"]') as HTMLElement
  expect(panel.hidden).toBe(false)
  return { tab, panel }
}

// jsdom 没有 matchMedia(窄屏判定按它);给一个「不是窄屏」的桩
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('① 求职信页签', () => {
  it('清单没回来只出占位;一封没有出「还没有求职信」(2026-11-07 改)', async () => {
    server({ 'GET /api/resume/files': 'hang', 'GET /api/apply/letters': 'hang' })
    let got = await letterTab(await mount(MeResume, FRAME))
    expect(got.panel.textContent).toBe('')
    expect(got.tab.textContent).toBe('rl.title')
    server({ 'GET /api/resume/files': 'hang', 'GET /api/apply/letters': { status: 200, body: { items: [] } } })
    got = await letterTab(await mount(MeResume, FRAME))
    expect(got.panel.textContent).toBe('rl.empty')
    expect(got.panel.querySelector('tr')).toBeNull()
    expect(got.tab.textContent).toBe('rl.title0')
  })

  it('草稿行职位名去投递区(职位删了不带链接),发出去的行职位名开 PDF;状态胶囊;写于只写日期(2026-11-07 改)', async () => {
    server({ 'GET /api/resume/files': 'hang', 'GET /api/apply/letters': { status: 200, body: { items: [DRAFT, SENT, GONE] } } })
    const { tab, panel } = await letterTab(await mount(MeResume, FRAME))
    expect(tab.textContent).toBe('rl.title3')
    expect(panel.querySelectorAll('tbody tr').length).toBe(3)
    expect(hrefs(panel, 'office manager')).toEqual(['/account?sec=resume&apply=101'])   // 2026-10-09 A 批:就地弹投递框
    const sent = Array.from(panel.querySelectorAll('a')).find((x) => x.textContent === 'retail sales associate')
    expect(sent?.getAttribute('href')).toBe('/api/apply/file?id=30&kind=cover')
    expect(sent?.getAttribute('target')).toBe('_blank')
    expect(panel.textContent).toContain('wire assembler')
    expect(hrefs(panel, 'wire assembler')).toEqual([])
    const rowOf = (title: string) => Array.from(panel.querySelectorAll('tbody tr')).find((tr) => tr.textContent?.includes(title))
    expect(rowOf('office manager')?.textContent).toContain('mj.draft')
    expect(rowOf('office manager')?.textContent).toContain('Anurag Homes Team')
    expect(rowOf('retail sales associate')?.textContent).toContain('ap.applied')
    expect(rowOf('retail sales associate')?.textContent).not.toContain('mj.draft')
    expect(rowOf('retail sales associate')?.textContent).toContain('2026-10-04')
    expect(rowOf('wire assembler')?.textContent).toContain('mj.draft')
  })
})

describe('② 我的订阅', () => {
  it('免费态:免费版 + 两档价格 + 升级 Pro;没买过出「还没有付款」(2026-11-07 改)', async () => {
    const calls = server({ 'GET /api/stripe/payments': { status: 200, body: { items: [] } } })
    const el = await mount(MeSub, { ...FRAME, until: null })
    expect(el.textContent).toContain('acct.plan.free')
    expect(el.textContent).toContain('sub.price')
    expect(el.textContent).toContain('up.cta2')
    expect(el.textContent).not.toContain('sub.renew')
    expect(el.textContent).not.toContain('sub.left')
    expect(el.textContent).toContain('sub.pay')
    expect(el.textContent).toContain('sub.noPay')
    expect(el.querySelector('table')).toBeNull()
    expect(el.textContent).toContain('price.perk.letter')
    expect(el.textContent).not.toContain('price.perk.letter.d')
    expect(calls).toContain('GET /api/stripe/payments')
  })

  it('Pro 态:还剩 N 天 + 有效期至 + 续买;付款记录出表', async () => {
    const until = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
    server({ 'GET /api/stripe/payments': { status: 200, body: { items: [PAY] } } })
    const el = await mount(MeSub, { ...FRAME, until })
    expect(el.textContent).toContain('Pro')
    expect(el.textContent).toContain('sub.left{"n":10}')
    expect(el.textContent).toContain('acct.plan.pro')
    expect(el.textContent).toContain('sub.renew')
    expect(el.textContent).not.toContain('up.cta2')
    expect(el.textContent).not.toContain('acct.plan.free')
    expect(el.textContent).toContain('sub.pay')
    expect(el.textContent).not.toContain('sub.noPay')
    expect(el.textContent).toContain('2026-10-07')
    expect(el.textContent).toContain('sub.proDays{"n":90}')
    expect(el.textContent).toContain('CA$14.69')
    expect(hrefs(el, 'sub.receipt')).toEqual(['https://pay.stripe.com/r/1'])
  })

  it('付款记录拉失败报错,不冒充「还没有付款」(2026-11-07 立)', async () => {
    server({ 'GET /api/stripe/payments': { status: 500, body: {} } })
    const el = await mount(MeSub, { ...FRAME, until: null })
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('sub.noPay')
  })

  it('新岗推送设置在订阅页(2026-11-07 自「我的求职」挪来):拉到偏好才出设置行', async () => {
    const calls = server({
      'GET /api/stripe/payments': { status: 200, body: { items: [] } },
      'GET /api/alerts/prefs': { status: 200, body: { freq: 'weekly', email: 'li@example.com' } },
    })
    const el = await mount(MeSub, { ...FRAME, until: null })
    expect(calls).toContain('GET /api/alerts/prefs')
    expect(el.textContent).toContain('mj.push')
    expect(el.textContent).toContain('mj.pushSave')
    expect(Array.from(el.querySelectorAll('input')).map((x) => x.value)).toContain('li@example.com')
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
