// 「今日待投」(2026-10-08 照 AIApply 的 Quick Review;components/queue,数据口 /api/queue;dev 直连生产库不登录,用 jsdom 挂件验)。
// 性质:① 队列没回来 / 拉不到都不出;② 关着开关或条件没齐 → 设置清单(简历 / 想做的工作 / 英文姓名三行),缺的那行才有入口,
//       「去选」链去答题带 next,填英文姓名「保存」PATCH { senderName };三样齐才出「开启智能投递」,点了 PATCH { autoQueue: true };
//       ③ 开着、条件齐而空 → 「今天没有新岗」;
//       ④ 有岗 → 第一岗一张卡(职位名链职位页、公司、信预览);「投出」POST /api/apply/send 带 jobId,成功后那一岗没了、外面收到公司名;
//          「跳过」POST /api/queue/decline,成功后那一岗没了;发信回 429 limit → 错因一行、岗还在;
//       ⑤ 「全部投出」:免费档开升级框、不发请求;Pro 逐岗发;
//       ⑥ 「改信」就地弹框:多行框里是这一岗的信,「保存」PATCH /api/queue/cover { jobId, cover },成功后卡上预览换成新信、岗还在。
// 探针:sendOne 不调 onSent → ④「外面收到」红;makeSendAll 去掉 pro 闸 → ⑤ 免费档红;makeLoad 失败不落 fail → ① 红;
//       isReadyOf 少判一样 → ② 「开启」钮提前出来红;makeEditSave 不 withCover → ⑥ 预览没换红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { QueueReview } from '@/components/queue'
// jsdom 里 React 要这面旗才认 act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, refresh: () => undefined }),
  usePathname: () => '/account',
}))

const A = { id: 31, jobId: 101, title: 'office manager', company: 'Anurag Homes Team', cover: 'Dear Hiring Manager,\n\nI apply.\n\nBest,\nZhang', resumeId: 7, city: 'Kitchener', cityZh: '基奇纳', cityKo: '', province: 'ON', salary: '$80K/yr', closed: false }
const B = { ...A, id: 32, jobId: 102, title: 'cook', company: 'Pie Wood' }
const FULL = { auto: true, hasNocs: true, hasName: true, hasResume: true }

type Reply = { status: number, body: object }

function server(routes: Record<string, Reply | 'hang'>) {
  const calls: { key: string, body: string }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push({ key, body: String(init?.body ?? '') })
    const r = routes[key]
    if (r == null || r === 'hang') {
      return new Promise(() => undefined)
    }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }))
  return calls
}

async function flush() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

async function mount(pro: boolean, onSent: (x: { company: string }) => void = () => undefined) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(QueueReview, { t, plan: { isPro: pro, loggedIn: true } as never, onSent }))
  })
  await flush()
  return el
}

function btn(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('button')).find((b) => b.textContent === text)
}

async function type(el: HTMLElement, sel: string, value: string) {
  const box = el.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement
  const proto = box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const set = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  await act(async () => {
    set?.call(box, value)
    box.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

async function click(el: HTMLElement, text: string) {
  await act(async () => {
    btn(el, text)?.click()
  })
  await flush()
}

window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('① 出不出', () => {
  it('没回来不出;拉不到不出', async () => {
    server({ 'GET /api/queue': 'hang' })
    expect((await mount(false)).textContent).toBe('')
    server({ 'GET /api/queue': { status: 500, body: {} } })
    expect((await mount(false)).textContent).toBe('')
  })
})

describe('② 设置清单', () => {
  it('关着、三样都缺 → 三行各有入口、没有开启钮;填英文姓名保存 PATCH senderName', async () => {
    const calls = server({
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: false, hasName: false, hasResume: false, items: [] } },
      'PATCH /api/queue/prefs': { status: 200, body: { ok: true, senderName: 'Zhang San' } },
    })
    const el = await mount(false)
    expect(el.textContent).toContain('qu.title')
    expect(el.textContent).not.toContain('qu.auto')
    expect(btn(el, 'qu.upload')).toBeDefined()
    expect(Array.from(el.querySelectorAll('a')).find((a) => a.textContent === 'qu.pick')?.getAttribute('href')).toBe('/plan/pr?quiz=1&next=%2Faccount%3Fsec%3Dsjobs')
    expect(btn(el, 'qu.save')).toBeDefined()
    expect(btn(el, 'qu.enable')).toBeUndefined()
    await type(el, 'input[type="text"], input:not([type])', 'Zhang San')
    await click(el, 'qu.save')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/prefs')?.body).toBe('{"senderName":"Zhang San"}')
  })

  it('三样齐、没开 → 只剩开启钮;点了 PATCH autoQueue:true,进队列态、转圈找岗;5 秒后重拉,有岗了出卡', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: Record<string, Reply | 'hang'> = {
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: true, hasName: true, hasResume: true, items: [], lastQueueAt: '' } },
      'PATCH /api/queue/prefs': { status: 200, body: { ok: true, autoQueue: true } },
    }
    const calls = server(routes)
    const el = await mount(false)
    expect(btn(el, 'qu.upload')).toBeUndefined()
    expect(btn(el, 'qu.save')).toBeUndefined()
    expect(btn(el, 'qu.enable')).toBeDefined()
    await click(el, 'qu.enable')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/prefs')?.body).toBe('{"autoQueue":true}')
    expect(el.textContent).toContain('qu.auto')
    expect(el.textContent).toContain('qu.finding')
    expect(el.textContent).not.toContain('qu.none')
    routes['GET /api/queue'] = { status: 200, body: { ...FULL, items: [A], lastQueueAt: '2026-10-08T12:00:00Z' } }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200)
    })
    await flush()
    expect(el.textContent).toContain('office manager')
    expect(el.textContent).not.toContain('qu.finding')
    vi.useRealTimers()
  })

  it('开启后这一轮跑完没挑到岗(lastQueueAt 变了、队列空)→ 今天没有新岗,不再转圈', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: Record<string, Reply | 'hang'> = {
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: true, hasName: true, hasResume: true, items: [], lastQueueAt: '' } },
      'PATCH /api/queue/prefs': { status: 200, body: { ok: true, autoQueue: true } },
    }
    server(routes)
    const el = await mount(false)
    await click(el, 'qu.enable')
    expect(el.textContent).toContain('qu.finding')
    routes['GET /api/queue'] = { status: 200, body: { ...FULL, items: [], lastQueueAt: '2026-10-08T12:00:00Z' } }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200)
    })
    await flush()
    expect(el.textContent).toContain('qu.none')
    expect(el.textContent).not.toContain('qu.finding')
    vi.useRealTimers()
  })

  it('开着但缺一样 → 还是清单(只那一行有入口),不出岗', async () => {
    server({ 'GET /api/queue': { status: 200, body: { auto: true, hasNocs: false, hasName: true, hasResume: true, items: [A] } } })
    const el = await mount(false)
    expect(btn(el, 'qu.upload')).toBeUndefined()
    expect(el.textContent).toContain('qu.pick')
    expect(el.textContent).not.toContain('office manager')
    expect(btn(el, 'qu.enable')).toBeUndefined()
  })
})

describe('③ 空队列', () => {
  it('开着、条件齐而空 → 今天没有新岗', async () => {
    server({ 'GET /api/queue': { status: 200, body: { ...FULL, items: [] } } })
    expect((await mount(false)).textContent).toContain('qu.none')
  })
})

describe('④ 一岗一卡:投出 / 跳过 / 失败', () => {
  it('卡、投出、跳过', async () => {
    const sent: string[] = []
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A, B] } },
      'POST /api/apply/send': { status: 200, body: { ok: true, id: 31 } },
      'POST /api/queue/decline': { status: 200, body: { ok: true } },
    })
    const el = await mount(false, (x: { company: string }) => { sent.push(x.company) })
    expect(Array.from(el.querySelectorAll('a')).find((a) => a.textContent === 'office manager')?.getAttribute('href')).toBe('/jobs/101')
    expect(el.textContent).toContain('Anurag Homes Team')
    expect(el.textContent).toContain('Dear Hiring Manager,')
    expect(el.textContent).toContain('qu.sendAll{"n":2}')
    await click(el, 'qu.send')
    expect(calls.find((c) => c.key === 'POST /api/apply/send')?.body).toBe('{"jobId":101}')
    expect(sent).toEqual(['Anurag Homes Team'])
    expect(el.textContent).not.toContain('office manager')
    expect(el.textContent).toContain('cook')
    expect(el.textContent).not.toContain('qu.sendAll')
    await click(el, 'qu.skip')
    expect(calls.find((c) => c.key === 'POST /api/queue/decline')?.body).toBe('{"jobId":102}')
    expect(el.textContent).not.toContain('cook')
  })

  it('发信失败:错因一行、岗还在', async () => {
    server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A] } },
      'POST /api/apply/send': { status: 429, body: { error: 'limit' } },
    })
    const el = await mount(false)
    await click(el, 'qu.send')
    expect(el.textContent).toContain('ap.e.limit')
    expect(el.textContent).toContain('office manager')
  })
})

describe('⑤ 全部投出', () => {
  it('免费档开升级框、不发;Pro 逐岗发', async () => {
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A, B] } },
      'POST /api/apply/send': { status: 200, body: { ok: true } },
    })
    const el = await mount(false)
    await click(el, 'qu.sendAll{"n":2}')
    expect(calls.filter((c) => c.key === 'POST /api/apply/send')).toHaveLength(0)
    expect(el.textContent).toContain('qu.allReason')
    document.body.innerHTML = ''
    const calls2 = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A, B] } },
      'POST /api/apply/send': { status: 200, body: { ok: true } },
    })
    const el2 = await mount(true)
    await click(el2, 'qu.sendAll{"n":2}')
    expect(calls2.filter((c) => c.key === 'POST /api/apply/send').map((c) => c.body)).toEqual(['{"jobId":101}', '{"jobId":102}'])
    expect(el2.textContent).not.toContain('office manager')
    expect(el2.textContent).not.toContain('cook')
  })
})

describe('⑥ 改信', () => {
  it('弹框里是这一岗的信;保存 PATCH /api/queue/cover,预览换新、岗还在', async () => {
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A] } },
      'PATCH /api/queue/cover': { status: 200, body: { ok: true } },
    })
    const el = await mount(false)
    expect(el.querySelector('textarea')).toBeNull()
    await click(el, 'qu.edit')
    expect(el.querySelector('textarea')?.value).toBe(A.cover)
    await type(el, 'textarea', 'Dear Ms Lee,\n\nNew letter.')
    await click(el, 'qu.save')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/cover')?.body).toBe('{"jobId":101,"cover":"Dear Ms Lee,\\n\\nNew letter."}')
    expect(el.querySelector('textarea')).toBeNull()
    expect(el.textContent).toContain('Dear Ms Lee,')
    expect(el.textContent).toContain('office manager')
  })
})
