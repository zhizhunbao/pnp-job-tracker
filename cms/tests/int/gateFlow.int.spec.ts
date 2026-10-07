// 访客向导的走法与交接(2026-10-04 收口审查;设计稿 docs/design/付费闭环-20261003.md 10-04 各节)。
// 来由:交接戳原先只有 × 撤 —— 浏览器返回、换页、弹它的那一页自己卸掉,戳都留着,10 分钟内页头登录就替他交草稿;
//       点目标大卡 / 下一步时被点的钮跟着这一屏卸掉,焦点掉回 body。
// 性质:① 向导没在注册屏注册 / 登录成就卸掉 → 交接戳撤掉(草稿照留,只给下次预填);
//       ② 邮箱注册当场:交成了戳撤、卸掉不再动;交没成戳放回去,卸掉向导也不撤(等补交);
//       ③ Google 整页登录:走到注册屏落戳,跳走是整页卸载(React 不跑收尾器)—— 回跳那一页登录态下补交钩子取戳、
//          并进答案档、回职位板按答案筛;
//       ④ 换了题焦点挪到题面(id + tabIndex -1);开屏不挪(焦点不抢、背后页面不滚);返回也挪。
// 探针:去掉 dropHandoffOnLeave → ①红;dropGateHandoff 不看 isGateSignedIn → ②「交没成卸掉不撤」红;
//       focusGateQuestion 恒 return → ④「点目标大卡后焦点在题面」红;开屏也挪 → ④「开屏不挪」红。
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内件直接点文件(桶只走门的规矩不管测试)
import { SessionProvider } from '@/components/auth'
import { GateWizard } from '@/components/gate/gatewizard'
import { useGateSync, useGateWizard } from '@/components/gate/hooks'
import type { GatePanel } from '@/components/gate/types'
import { readGateDraft } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import type { TFn } from '@/lib/i18n'
import { resetAnswersMemory } from '@/lib/quiz'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace, push: () => undefined }),
  usePathname: () => PATH.current,
}))

const HANDOFF_KEY = 'o2p_gate_handoff_v1'
const OB_SEEN_KEY = 'jobs_onboarding_v1'

const t = ((key: string) => key) as TFn

function reply(status: number, body: object) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

// 假服务端:PUT(推答案档)记下来;其余 GET 一律回空档(取热门专业那一发读不出清单 = 空热门,无妨)
function server(status = 200) {
  const puts: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init != null && init.method === 'PUT') {
      puts.push(String(init.body))
      return reply(status, { ok: status === 200 })
    }
    return reply(status, { answers: null })
  }))
  return puts
}

function seed(loggedIn: boolean) {
  const initial = { in: loggedIn, email: loggedIn ? 'a@b.c' : '', displayName: null, avatar: null, proUntil: null }
  return function wrapSession(children: ReactNode) {
    // eslint-disable-next-line react/no-children-prop -- SessionProviderIn 的 children 是必填属性,走 createElement 第三参过不了类型
    return createElement(SessionProvider, { initial, children })
  }
}

// 挂一个只跑 hook 的探针件,交回现值与卸载口(同 guestGate 的 createRoot 形;不为测试加依赖)
function mountHook<T>(hook: () => T, wrap: ((c: ReactNode) => ReactNode) | null = null) {
  const out: { current: T | null } = { current: null }
  function Probe() {
    out.current = hook()
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    const el = createElement(Probe)
    root.render(wrap == null ? el : wrap(el))
  })
  return { out, unmount: () => act(() => root.unmount()) }
}

function panel(p: { current: GatePanel | null }): GatePanel {
  if (p.current == null) {
    throw new Error('hook not mounted')
  }
  return p.current
}

// 答目标(点了即进下一题)、专业职业照预选、所在省点新斯科舍,一路「下一步」走到注册屏(走过第四题那一下落交接戳)
function walkToSignup(p: { current: GatePanel | null }) {
  act(() => panel(p).onGoal(2))
  act(() => panel(p).onNext())
  act(() => panel(p).onNext())
  expect(panel(p).cur).toBe('prov')
  act(() => panel(p).onProv('NS'))
  act(() => panel(p).onNext())
  expect(panel(p).cur).toBe('reg')
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  resetAnswersMemory()
  GUEST.signedIn = false
  PATH.current = '/'
  ROUTER.replace.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('交接戳随向导的走法(收口审查)', () => {
  it('① 走到注册屏落戳;没注册就卸掉(返回 / 换页 / 弹它的页卸掉)→ 戳撤掉,草稿留着只给预填', () => {
    server()
    const w = mountHook(() => useGateWizard({ intent: 'entry', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k }))
    walkToSignup(w.out)
    expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull()
    w.unmount()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(readGateDraft()?.goal).toBe(2)
  })

  it('① 还没走到注册屏就卸掉:本来就没戳,卸掉也不凭空落戳', () => {
    server()
    const w = mountHook(() => useGateWizard({ intent: 'job', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k }))
    act(() => panel(w.out).onGoal(1))
    w.unmount()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
  })

  it('② 邮箱注册当场交成了:戳与草稿撤掉、答案档推上去、记引导弹过、回职位板筛;随后卸掉不再动', async () => {
    const puts = server()
    const onDone = vi.fn()
    const w = mountHook(() => useGateWizard({ intent: 'entry', onDone, onClose: () => undefined, t: (k: string) => k }))
    walkToSignup(w.out)
    act(() => panel(w.out).onRegistered())
    expect(onDone).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(puts.length).toBe(1))
    w.unmount()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(readGateDraft()).toBeNull()
    expect(localStorage.getItem(OB_SEEN_KEY)).not.toBeNull()
    expect(JSON.parse(puts[0] ?? '{}').basic.goalBand).toBe(2)
  })

  it('② 邮箱注册当场没交成(会话没了):戳放回去;卸掉向导不撤(这个页面里刚登录过),留给下一次补交', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    server(401)
    const w = mountHook(() => useGateWizard({ intent: 'apply', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k }))
    walkToSignup(w.out)
    act(() => panel(w.out).onRegistered())
    await vi.waitFor(() => expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull())
    w.unmount()
    expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull()
    expect(readGateDraft()).not.toBeNull()
  })

  it('③ Google 整页登录:注册屏上戳与草稿都在(整页跳走不跑收尾器);回跳那一页登录态下补交并回职位板按答案筛', async () => {
    server()
    const w = mountHook(() => useGateWizard({ intent: 'entry', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k }))
    walkToSignup(w.out)
    expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull()
    expect(readGateDraft()?.intent).toBe('entry')
    const puts = server()
    window.history.replaceState(null, '', '/?q=cook')
    mountHook(() => useGateSync(), seed(true))
    await vi.waitFor(() => expect(puts.length).toBe(1))
    await vi.waitFor(() => expect(localStorage.getItem(OB_SEEN_KEY)).not.toBeNull())
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(readGateDraft()).toBeNull()
    expect(JSON.parse(puts[0] ?? '{}').basic.resProv).toBe('NS')
    await vi.waitFor(() => expect(ROUTER.replace).toHaveBeenCalledWith('/?q=cook&prov=NS'))
    window.history.replaceState(null, '', '/')
  })

  it('③ 回跳没登上(仍匿名):补交钩子开页撤掉这枚戳,答案档不碰', async () => {
    const puts = server()
    const w = mountHook(() => useGateWizard({ intent: 'entry', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k }))
    walkToSignup(w.out)
    mountHook(() => useGateSync(), seed(false))
    await new Promise((r) => setTimeout(r, 20))
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(puts.length).toBe(0)
    expect(readGateDraft()).not.toBeNull()
  })
})

describe('换题挪焦点(收口审查)', () => {
  function mountWizard(withMajors = false) {
    server()
    if (withMajors) {
      // 热门专业一枚(向导一开就预取热门,得在挂载前换好假服务端;2026-10-04 撤跳过后要先选专业才点得动下一步)
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('/api/majors')) {
          return reply(200, { majors: [{ code: '52.0301', titleEn: 'Accounting', titleZh: 'Accounting', titleKo: 'Accounting',
            series: '52', grouping: '05', broads: [], popular: 1 }] })
        }
        return reply(200, { answers: null })
      }))
    }
    // jsdom 没有 matchMedia(modal 桶判窄屏要它):按宽屏答,不挂监听
    vi.stubGlobal('matchMedia', () => ({
      matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined,
    }))
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(GateWizard, { t, intent: 'entry', onClose: () => undefined, onDone: () => undefined }))
    })
    return { host, root }
  }

  function question(host: HTMLElement): HTMLElement {
    const el = host.querySelector('[tabindex="-1"]')
    if (el == null) {
      throw new Error('question not rendered')
    }
    return el as HTMLElement
  }

  it('④ 开屏不挪焦点;点目标大卡进第 2 题 → 焦点在题面(id 与 tabIndex -1);返回第 1 题再挪一次', () => {
    const m = mountWizard()
    const q1 = question(m.host)
    expect(q1.id).not.toBe('')
    expect(document.activeElement).not.toBe(q1)
    expect(q1.textContent).toBe('gate.q.goal')

    const card = m.host.querySelector('button[aria-pressed]') as HTMLButtonElement
    act(() => card.click())
    const q2 = question(m.host)
    expect(q2.textContent).toBe('gate.q.major')
    expect(document.activeElement).toBe(q2)

    const back = m.host.querySelector('button[aria-label="ob.back"]') as HTMLButtonElement
    act(() => back.click())
    const again = question(m.host)
    expect(again.textContent).toBe('gate.q.goal')
    expect(document.activeElement).toBe(again)
    act(() => m.root.unmount())
  })

  it('④ 下一步换题也挪;没答的题下一步点不动、没有「跳过这步」(2026-10-04 撤);同一题里重渲(打字、点专业)不挪', async () => {
    const m = mountWizard(true)
    const next = () => {
      const buttons = Array.from(m.host.querySelectorAll('button'))
      const b = buttons.find((x) => x.textContent === 'ob.next')
      if (b == null) {
        throw new Error('next not rendered')
      }
      return b
    }
    act(() => (m.host.querySelector('button[aria-pressed]') as HTMLButtonElement).click())
    expect(Array.from(m.host.querySelectorAll('button')).some((x) => x.textContent === 'ob.skip')).toBe(false)
    expect(next().disabled).toBe(true)
    const q2 = question(m.host)
    expect(q2.textContent).toBe('gate.q.major')
    expect(document.activeElement).toBe(q2)
    const other = document.createElement('input')
    document.body.appendChild(other)
    other.focus()
    const input = m.host.querySelector('input') as HTMLInputElement
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setValue?.call(input, 'nu')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.value).toBe('nu')
    expect(document.activeElement).toBe(other)
    act(() => {
      setValue?.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await vi.waitFor(() => {
      const chip = Array.from(m.host.querySelectorAll('button[aria-pressed]')).find((x) => x.textContent === 'Accounting')
      expect(chip).not.toBeUndefined()
    })
    const chip = Array.from(m.host.querySelectorAll('button[aria-pressed]')).find((x) => x.textContent === 'Accounting')
    act(() => (chip as HTMLButtonElement).click())
    expect(document.activeElement).toBe(other)
    expect(next().disabled).toBe(false)
    act(() => next().click())
    expect(document.activeElement).toBe(question(m.host))
    expect(question(m.host).textContent).toBe('prof.noc')
    act(() => m.root.unmount())
  })
})
