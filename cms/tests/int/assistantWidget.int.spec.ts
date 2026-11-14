// 全站对话助手的界面(components/assistant,2026-11-14):jsdom 挂件验,fetch 打桩,不连库、不打模型。
// 性质:① 不在线(ready=false、探活请求失败)不渲圆钮;② 在线渲圆钮(有读屏名),点开出面板与开场白,网址不变,打 assistant-open;
//       ③ 发一条:访客气泡、回复气泡、链接(页名来自三语词条、站内地址),打 assistant-send,请求体带 text / lang / history;
//       ④ refuse 与 off 各出固定的一句话加链接;⑤ 502 时访客那条撤掉、字留在输入框、出「没连上」;429 出「聊得太多」;
//       ⑥ 第二次请求带上第一轮的一问一答;⑦ 503 按不在线收起入口;⑧ Esc 关面板,再开对话还在;
//       ⑨ 回车发送、Shift 加回车不发;⑩ 等超过三秒加一句「还在想」;⑪ 清单外的页面键与站外地址不渲;
//       ⑫ 页名词条键与 lib/assistant 页面清单的 13 个键一一对应,三语都有词。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssistantLauncher } from '@/components/assistant'
import { PAGE_LABEL, SLOW_MS } from '@/components/assistant/constants'
import { LangProvider } from '@/components/i18n'
import { PAGE_ROUTE } from '@/lib/assistant/constants'
import { makeT } from '@/lib/i18n'
import { track } from '@/lib/track'

vi.mock('@/lib/track', () => ({ track: vi.fn(), syncTrackSwitch: vi.fn() }))

// jsdom 里 React 要这面旗才认 act()
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const READY = 'GET /api/assistant/ready'
const CHAT = 'POST /api/assistant/chat'
const en = makeT('en')
// LangProvider 的 props:英文界面;children 由 createElement 的第三个参数给,这里的占位会被它顶掉
const LANG_EN: Parameters<typeof LangProvider>[0] = { initial: 'en', children: null }

type Reply = { status: number, body: object }
type Call = { key: string, body: string }

// fetch 桩:按「方法 地址」分账;同一个键可给一串回包,依次取;'hang' 永远不回;'throw' 当网络错
function server(routes: Record<string, Reply | 'hang' | 'throw' | (Reply | 'throw')[]>) {
  const calls: Call[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push({ key, body: String(init?.body ?? '') })
    let r = routes[key]
    if (Array.isArray(r)) {
      r = r.length > 1 ? r.shift() : r[0]
    }
    if (r === 'throw') {
      throw new TypeError('network down')
    }
    if (r == null || r === 'hang') {
      return new Promise(() => undefined)
    }
    const reply = r
    return { status: reply.status, ok: reply.status >= 200 && reply.status < 300, json: async () => reply.body }
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

async function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(LangProvider, LANG_EN, createElement(AssistantLauncher)))
  })
  await flush()
  return el
}

function dock(el: HTMLElement) {
  return el.querySelector<HTMLButtonElement>(`button[aria-label="${en('asst.open')}"]`)
}

function panel(el: HTMLElement) {
  return el.querySelector<HTMLElement>('[role="dialog"]')
}

function input(el: HTMLElement) {
  return el.querySelector<HTMLTextAreaElement>('textarea')!
}

function sendBtn(el: HTMLElement) {
  return Array.from(el.querySelectorAll('button')).find((b) => b.textContent === en('asst.send'))!
}

async function click(b: HTMLElement) {
  await act(async () => {
    b.click()
  })
  await flush()
}

async function type(el: HTMLElement, text: string) {
  const box = input(el)
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(box, text)
    box.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function say(el: HTMLElement, text: string) {
  await type(el, text)
  await click(sendBtn(el))
}

async function openPanel(el: HTMLElement) {
  await click(dock(el)!)
}

function chatBodies(calls: Call[]) {
  return calls.filter((c) => c.key === CHAT).map((c) => JSON.parse(c.body) as { text: string, lang: string, history: object[] })
}

const ANSWER = {
  kind: 'answer', say: 'Use the province filter on the job board.', thread: 'abc', turn: 1,
  links: [{ key: 'jobs', url: '/?prov=ON&q=cook' }, { key: 'employers', url: '/employers?prov=ON' }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.mocked(track).mockClear()
  document.body.innerHTML = ''
})

describe('对话助手入口:在不在线', () => {
  it('ready=false 不渲圆钮', async () => {
    server({ [READY]: { status: 200, body: { ready: false } } })
    const el = await mount()
    expect(dock(el)).toBeNull()
    expect(el.querySelectorAll('button').length).toBe(0)
  })

  it('探活请求失败、回的不是 200、回包不成形都按不在线', async () => {
    for (const r of ['throw', { status: 500, body: {} }, { status: 200, body: { ready: 'yes' } }] as const) {
      server({ [READY]: r })
      const el = await mount()
      expect(dock(el)).toBeNull()
    }
  })

  it('ready=true 渲圆钮(有读屏名);点开出面板与开场白,网址不变,打 assistant-open', async () => {
    const calls = server({ [READY]: { status: 200, body: { ready: true } } })
    const el = await mount()
    expect(calls.map((c) => c.key)).toEqual([READY])
    expect(dock(el)).not.toBeNull()
    expect(panel(el)).toBeNull()
    const before = window.location.href
    await openPanel(el)
    expect(window.location.href).toBe(before)
    expect(panel(el)!.getAttribute('aria-label')).toBe('Assistant')
    expect(panel(el)!.textContent).toContain(en('asst.hello'))
    expect(panel(el)!.querySelector('[role="log"]')!.getAttribute('aria-live')).toBe('polite')
    expect(dock(el)).toBeNull()
    expect(document.activeElement).toBe(input(el))
    expect(vi.mocked(track).mock.calls).toEqual([['assistant-open']])
  })
})

describe('对话助手面板:一问一答', () => {
  it('发一条:访客气泡、回复气泡、链接(页名来自词条),打 assistant-send,请求体成形', async () => {
    const calls = server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 200, body: ANSWER } })
    const el = await mount()
    await openPanel(el)
    expect(sendBtn(el).disabled).toBe(true)
    await say(el, '  cook jobs in Ontario  ')
    const text = panel(el)!.textContent!
    expect(text).toContain('cook jobs in Ontario')
    expect(text).toContain('Use the province filter on the job board.')
    const links = Array.from(panel(el)!.querySelectorAll('a'))
    expect(links.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      [en('asst.page.jobs'), '/?prov=ON&q=cook', null], [en('asst.page.employers'), '/employers?prov=ON', null],
    ])
    expect(links[0]!.textContent).toBe('Jobs')
    expect(input(el).value).toBe('')
    expect(chatBodies(calls)).toEqual([{ text: 'cook jobs in Ontario', lang: 'en', history: [] }])
    expect(vi.mocked(track).mock.calls).toEqual([['assistant-open'], ['assistant-send']])
  })

  it('refuse 与 off 各出固定的一句话加链接,不用回包里的正文', async () => {
    server({
      [READY]: { status: 200, body: { ready: true } },
      [CHAT]: [
        { status: 200, body: { kind: 'refuse', say: 'You need 470 points.', links: [{ key: 'streams', url: '/streams?prov=ON' }] } },
        { status: 200, body: { kind: 'off', say: '', links: [{ key: 'jobs', url: '/' }] } },
      ],
    })
    const el = await mount()
    await openPanel(el)
    await say(el, 'Can I get PR?')
    expect(panel(el)!.textContent).toContain(en('asst.refuse'))
    expect(panel(el)!.textContent).not.toContain('470')
    expect(Array.from(panel(el)!.querySelectorAll('a')).map((a) => a.textContent)).toEqual([en('asst.page.streams')])
    await say(el, 'weather?')
    expect(panel(el)!.textContent).toContain(en('asst.off'))
    expect(Array.from(panel(el)!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['/streams?prov=ON', '/'])
  })

  it('清单外的页面键与站外地址不渲', async () => {
    const links = [
      { key: 'evil', url: '/x' }, { key: 'jobs', url: 'https://evil.example/' }, { key: 'jobs', url: '//evil.example/' },
      null, { key: 'pricing', url: '/pricing' },
    ]
    server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 200, body: { kind: 'answer', say: 'ok', links } } })
    const el = await mount()
    await openPanel(el)
    await say(el, 'price?')
    expect(Array.from(panel(el)!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['/pricing'])
  })

  it('第二次请求带上第一轮的一问一答', async () => {
    const calls = server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 200, body: ANSWER } })
    const el = await mount()
    await openPanel(el)
    await say(el, 'cook jobs')
    await say(el, 'any in BC?')
    const bodies = chatBodies(calls)
    expect(bodies.length).toBe(2)
    expect(bodies[1]).toEqual({
      text: 'any in BC?', lang: 'en',
      history: [{ role: 'user', content: 'cook jobs' }, { role: 'assistant', content: 'Use the province filter on the job board.' }],
    })
  })

  it('回车发送;Shift 加回车不发', async () => {
    const calls = server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 200, body: ANSWER } })
    const el = await mount()
    await openPanel(el)
    await type(el, 'hello')
    await act(async () => {
      input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    })
    await flush()
    expect(chatBodies(calls).length).toBe(0)
    await act(async () => {
      input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()
    expect(chatBodies(calls).map((b) => b.text)).toEqual(['hello'])
  })
})

describe('对话助手面板:等待与出错', () => {
  it('502:访客那条撤掉,字还在输入框,出「没连上」;重发成功后提示收走', async () => {
    const calls = server({
      [READY]: { status: 200, body: { ready: true } },
      [CHAT]: [{ status: 502, body: { error: 'llm' } }, { status: 200, body: ANSWER }],
    })
    const el = await mount()
    await openPanel(el)
    await say(el, 'cook jobs in Ontario')
    expect(input(el).value).toBe('cook jobs in Ontario')
    expect(panel(el)!.querySelector('[role="alert"]')!.textContent).toBe(en('asst.err.net'))
    expect(panel(el)!.querySelector('[role="log"]')!.textContent).not.toContain('cook jobs in Ontario')
    await click(sendBtn(el))
    expect(panel(el)!.querySelector('[role="alert"]')).toBeNull()
    expect(panel(el)!.querySelector('[role="log"]')!.textContent).toContain('cook jobs in Ontario')
    expect(chatBodies(calls).map((b) => b.history.length)).toEqual([0, 0])
  })

  it('网络错同 502;429 出「聊得太多」', async () => {
    server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: ['throw', { status: 429, body: { error: 'limit' } }] })
    const el = await mount()
    await openPanel(el)
    await say(el, 'hi')
    expect(panel(el)!.querySelector('[role="alert"]')!.textContent).toBe(en('asst.err.net'))
    expect(input(el).value).toBe('hi')
    await click(sendBtn(el))
    expect(panel(el)!.querySelector('[role="alert"]')!.textContent).toBe(en('asst.err.limit'))
    expect(input(el).value).toBe('hi')
  })

  it('503 按不在线:面板与圆钮都收走', async () => {
    server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 503, body: { error: 'offline' } } })
    const el = await mount()
    await openPanel(el)
    await say(el, 'hi')
    expect(panel(el)).toBeNull()
    expect(dock(el)).toBeNull()
  })

  it('等回复时出「正在输入」,发送钮禁用;超过三秒加一句「还在想」', async () => {
    server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: 'hang' })
    const el = await mount()
    await openPanel(el)
    vi.useFakeTimers()
    await say(el, 'hi')
    expect(panel(el)!.textContent).toContain(en('asst.typing'))
    expect(panel(el)!.textContent).not.toContain(en('asst.slow'))
    expect(sendBtn(el).disabled).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(SLOW_MS + 10)
    })
    expect(panel(el)!.textContent).toContain(en('asst.slow'))
  })

  it('Esc 关面板,网址不变;再开对话还在', async () => {
    server({ [READY]: { status: 200, body: { ready: true } }, [CHAT]: { status: 200, body: ANSWER } })
    const el = await mount()
    await openPanel(el)
    await say(el, 'cook jobs')
    const before = window.location.href
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(panel(el)).toBeNull()
    expect(dock(el)).not.toBeNull()
    expect(window.location.href).toBe(before)
    await openPanel(el)
    expect(panel(el)!.textContent).toContain('cook jobs')
    expect(panel(el)!.textContent).toContain('Use the province filter on the job board.')
  })
})

describe('对话助手词条', () => {
  it('页名词条键与页面清单的 13 个键一一对应,三语都有词', () => {
    expect(Object.keys(PAGE_LABEL).sort()).toEqual(Object.keys(PAGE_ROUTE).sort())
    expect(Object.keys(PAGE_LABEL).length).toBe(13)
    const keys = [
      ...Object.values(PAGE_LABEL), 'asst.open', 'asst.title', 'asst.close', 'asst.hello', 'asst.ph', 'asst.send', 'asst.you',
      'asst.typing', 'asst.slow', 'asst.refuse', 'asst.off', 'asst.err.limit', 'asst.err.net',
    ]
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const t = makeT(lang)
      for (const k of keys) {
        expect(t(k), `${lang} ${k}`).not.toBe(k)
        expect(t(k)).not.toMatch(/[·/]/)
      }
    }
  })
})
