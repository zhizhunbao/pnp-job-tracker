// 「今日待投」(2026-10-08 照 AIApply 的 Quick Review;components/queue,数据口 /api/queue;dev 直连生产库不登录,用 jsdom 挂件验)。
// 性质:① 队列没回来 / 拉不到都不出;② 关着开关或条件没齐 → 设置清单(简历 / 想做的工作 / 英文姓名三行),缺的那行才有入口,
//       「去选」链去答题带 next,填英文姓名「保存」PATCH { senderName };三样齐才出「开启智能投递」,点了 PATCH { autoQueue: true };
//       ③ 开着、条件齐而空 → 「今天没有新岗」;
//       ④ 有岗 → 第一岗一张卡(职位名链职位页、公司、信预览);「投出」POST /api/apply/send 带 jobId,成功后那一岗没了、外面收到公司名;
//          「跳过」POST /api/queue/decline,成功后那一岗没了;发信回 429 limit → 错因一行、岗还在;
//       ⑤ 「全部投出」:免费档开升级框、不发请求;Pro 逐岗发;
//       2026-10-08 Frank 看「我的」改判:跳过、全部投出、展开 / 收起撤 —— ④ 改为「信全文 + 逐项检查四行(收件人 / 简历可打开 /
//          求职信 PDF / 署名),没勾满投出不发,勾满才发;发完勾清空」;⑤ 改为翻页(通用 Pager「‹ n / N ›」),翻页勾清空、投出发的是翻到的那一岗。
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

const mergeBasics = vi.fn(async (_patch: object) => true)
vi.mock('@/lib/quiz', async (orig) => ({ ...(await orig<object>()), mergeBasics: (patch: object) => mergeBasics(patch) }))

const A = { id: 31, jobId: 101, title: 'office manager', company: 'Anurag Homes Team', cover: 'Dear Hiring Manager,\n\nI apply.\n\nBest,\nZhang', resumeId: 7, city: 'Kitchener', cityZh: '基奇纳', cityKo: '', province: 'ON', salary: '$80K/yr', closed: false, resumeName: 'Zhang_CV.pdf' }
const B = { ...A, id: 32, jobId: 102, title: 'cook', company: 'Pie Wood' }
const FULL = { auto: true, hasNocs: true, hasName: true, hasResume: true, hasProv: true, senderName: 'Zhang Wei' }

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

function btns(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('button')).filter((b) => b.textContent === text)
}

async function clickLast(el: HTMLElement, text: string) {
  await act(async () => {
    btns(el, text).at(-1)?.click()
  })
  await flush()
}

async function pick(el: HTMLElement, sel: string, value: string) {
  const box = el.querySelector(sel) as HTMLSelectElement
  const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  await act(async () => {
    set?.call(box, value)
    box.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await flush()
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

function aria(el: HTMLElement, label: string) {
  return el.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null
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
  it('关着、四样都缺 → 四行各有入口、没有开启钮;填英文姓名保存 PATCH senderName', async () => {
    const calls = server({
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: false, hasName: false, hasResume: false, hasProv: false, items: [] } },
      'PATCH /api/queue/prefs': { status: 200, body: { ok: true, senderName: 'Zhang San' } },
    })
    const el = await mount(false)
    expect(el.textContent).toContain('qu.title')
    expect(el.textContent).not.toContain('qu.auto')
    expect(btn(el, 'qu.upload')).toBeDefined()
    expect(Array.from(el.querySelectorAll('a')).find((a) => a.textContent === 'qu.pick')?.getAttribute('href')).toBe('/plan/pr?quiz=1&next=%2Faccount%3Fsec%3Dsjobs')
    expect(el.querySelector('select')).not.toBeNull()
    expect(btns(el, 'qu.save')).toHaveLength(2)
    expect(btn(el, 'qu.enable')).toBeUndefined()
    await type(el, 'input[type="text"], input:not([type])', 'Zhang San')
    await clickLast(el, 'qu.save')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/prefs')?.body).toBe('{"senderName":"Zhang San"}')
  })

  it('所在省:选回空再存 → 词条、不推;选 BC 保存 → mergeBasics({resProv:BC}) 后重拉,行打勾(2026-10-08 第三轮小白走查:投错省)', async () => {
    let got = { auto: false, hasNocs: true, hasName: true, hasResume: true, hasProv: false, items: [] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, ok: true, json: async () => got })))
    mergeBasics.mockClear()
    const el = await mount(false)
    expect(btn(el, 'qu.enable')).toBeUndefined()
    await pick(el, 'select', '')
    await click(el, 'qu.save')
    expect(mergeBasics).not.toHaveBeenCalled()
    expect(el.textContent).toContain('qu.provFail')
    await pick(el, 'select', 'BC')
    got = { ...got, hasProv: true }
    await click(el, 'qu.save')
    expect(mergeBasics).toHaveBeenCalledWith({ resProv: 'BC' })
    expect(el.textContent).not.toContain('qu.provFail')
    expect(btn(el, 'qu.enable')).toBeDefined()
  })

  it('三样齐、没开 → 只剩开启钮;点了 PATCH autoQueue:true,进队列态、转圈找岗;5 秒后重拉,有岗了出卡', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: Record<string, Reply | 'hang'> = {
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: true, hasName: true, hasResume: true, hasProv: true, items: [], lastQueueAt: '' } },
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

  it('开启时队列里已有岗:这一轮没跑完(lastQueueAt 没变)接着轮询,跑完后新进的岗不用刷新就出来(2026-10-08 实测)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: Record<string, Reply | 'hang'> = {
      'GET /api/queue': { status: 200, body: { ...FULL, auto: false, items: [A], lastQueueAt: '2026-10-07T12:00:00Z' } },
      'PATCH /api/queue/prefs': { status: 200, body: { ok: true, autoQueue: true } },
    }
    server(routes)
    const el = await mount(false)
    await click(el, 'qu.enable')
    routes['GET /api/queue'] = { status: 200, body: { ...FULL, items: [A], lastQueueAt: '2026-10-07T12:00:00Z' } }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200)
    })
    await flush()
    expect(el.textContent).toContain('office manager')
    routes['GET /api/queue'] = { status: 200, body: { ...FULL, items: [A, B], lastQueueAt: '2026-10-08T12:00:00Z' } }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200)
    })
    await flush()
    expect(el.textContent).toContain('1 / 2')
    vi.useRealTimers()
  })

  it('开启后这一轮跑完没挑到岗(lastQueueAt 变了、队列空)→ 今天没有新岗,不再转圈', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: Record<string, Reply | 'hang'> = {
      'GET /api/queue': { status: 200, body: { auto: false, hasNocs: true, hasName: true, hasResume: true, hasProv: true, items: [], lastQueueAt: '' } },
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
    server({ 'GET /api/queue': { status: 200, body: { auto: true, hasNocs: false, hasName: true, hasResume: true, hasProv: true, items: [A] } } })
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

describe('④ 一岗一卡:信全文 + 逐项检查 / 投出 / 失败', () => {
  it('邮件形:收件人 / 主题 / 附件;投出发当前这一岗,发完下一岗', async () => {
    const sent: string[] = []
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A, B] } },
      'POST /api/apply/send': { status: 200, body: { ok: true, id: 31 } },
    })
    const el = await mount(false, (x: { company: string }) => { sent.push(x.company) })
    expect(Array.from(el.querySelectorAll('a')).find((a) => a.textContent === 'office manager')?.getAttribute('href')).toBe('/jobs/101')
    expect(el.textContent).toContain('Anurag Homes Team')
    expect(el.textContent).toContain('Best,')
    expect(el.textContent).not.toContain('qu.sendAll')
    expect(el.textContent).not.toContain('qu.skip')
    for (const k of ['ap.to', 'ap.subject', 'ap.attach']) {
      expect(el.textContent).toContain(k)
    }
    expect(el.textContent).toContain('Zhang_CV.pdf')
    expect(el.textContent).toContain('Zhang Wei')
    expect(el.textContent).toContain('ap.subject')
    expect(el.textContent).toContain('Application for office manager')   // 主题与真发的同一模板
    expect(btn(el, 'Cover_Letter_Anurag_Homes_Team.pdf')).toBeDefined()   // 求职信附件:站内弹框预览钮
    expect(btn(el, 'ap.edit')).toBeDefined()  // 改信在正文右上
    expect(el.querySelector('select')).toBeNull()   // 只有一份简历没得换,不出下拉
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(0)   // 邮件形,勾撤
    await click(el, 'qu.send')
    expect(calls.find((c) => c.key === 'POST /api/apply/send')?.body).toBe('{"jobId":101}')
    expect(sent).toEqual(['Anurag Homes Team'])
    expect(el.textContent).not.toContain('office manager')
    expect(el.textContent).toContain('cook')
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

describe('⑤ 翻页', () => {
  it('一岗不出翻页;两岗出 ‹ 1 / 2 ›,› 翻到第二岗,投出发的是翻到的那一岗', async () => {
    server({ 'GET /api/queue': { status: 200, body: { ...FULL, items: [A] } } })
    expect((await mount(false)).textContent).not.toContain('1 / 1')
    document.body.innerHTML = ''
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A, B] } },
      'POST /api/apply/send': { status: 200, body: { ok: true } },
    })
    const el = await mount(false)
    expect(el.textContent).toContain('1 / 2')
    expect(aria(el, '‹')?.disabled).toBe(true)
    await act(async () => {
      aria(el, '›')?.click()
    })
    await flush()
    expect(el.textContent).toContain('2 / 2')
    expect(el.textContent).toContain('cook')
    expect(aria(el, '›')?.disabled).toBe(true)
    await click(el, 'qu.send')
    expect(calls.find((c) => c.key === 'POST /api/apply/send')?.body).toBe('{"jobId":102}')
    expect(el.textContent).toContain('office manager')
    expect(el.textContent).not.toContain('/ 2')
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
    await click(el, 'ap.edit')
    expect(el.querySelector('textarea')?.value).toBe(A.cover)
    await type(el, 'textarea', 'Dear Ms Lee,\n\nNew letter.')
    await click(el, 'qu.save')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/cover')?.body).toBe('{"jobId":101,"cover":"Dear Ms Lee,\\n\\nNew letter."}')
    expect(el.querySelector('textarea')).toBeNull()
    expect(el.textContent).toContain('Dear Ms Lee,')
    expect(el.textContent).toContain('office manager')
  })
})

describe('⑦ 换简历(2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」)', () => {
  it('两份以上出下拉;选另一份 PATCH /api/queue/resume {jobId, resumeId},回来重拉、勾清空', async () => {
    const two = [{ id: 7, name: 'Zhang_CV.pdf', mime: 'application/pdf' }, { id: 8, name: 'Zhang_CV_EN.pdf', mime: 'application/pdf' }]
    const calls = server({
      'GET /api/queue': { status: 200, body: { ...FULL, items: [A], resumes: two } },
      'PATCH /api/queue/resume': { status: 200, body: { ok: true } },
    })
    const el = await mount(false)
    const sel = el.querySelector('select') as HTMLSelectElement
    expect(sel).not.toBeNull()
    expect(sel.value).toBe('7')
    expect(btn(el, 'Zhang_CV.pdf')).toBeDefined()   // PDF 简历附件:站内弹框预览钮
    await pick(el, 'select', '8')
    expect(calls.find((c) => c.key === 'PATCH /api/queue/resume')?.body).toBe('{"jobId":101,"resumeId":8}')
    expect(calls.filter((c) => c.key === 'GET /api/queue').length).toBeGreaterThan(1)
  })
})
