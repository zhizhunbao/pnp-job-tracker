// 访客门只剩注册框(2026-10-11 Frank「我应该先注册 再问问题吧。不然回答的问题 存哪里去了」→「需要改」)。
// 性质:① 访客的四个入口 —— 进站即弹(GateSync)、点开职位弹框(ActModal)、点收藏 / 动筛选(职位板 BoardModals)、
//       动雇主板筛选(Employers)—— 弹出来的都是注册 / 登录框(有邮箱格),不是档案题(没有题目进度条、没有题面);
//       ② 注册框登录完:先记「这个页面里刚登录过」(软刷回来之前不再起弹),再交还调用方;开框记一笔 gate-open(kind = 由头)。
// 探针:任一入口换回档案题弹框(GateEdit)→ ①那一条红;makeGateAuthDone 去掉 markGateSignedIn → ②红。
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { ActModal } from '@/components/advisor/actmodal'
import type { AdvisorJob, AdvisorPlan } from '@/components/advisor/types'
import { SessionProvider } from '@/components/auth'
import { Employers } from '@/components/employers/employers'
import type { EmployersIn, EmpPlan, PoolFilters } from '@/components/employers/types'
import { GateSync } from '@/components/gate'
import { makeGateAuthDone } from '@/components/gate/functions'
import { BoardModals } from '@/components/jobs/boardmodals'
import type { JobsBoardPanel } from '@/components/jobs/types'
import { isGateSignedIn } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import { makeT } from '@/lib/i18n'

const PATH = vi.hoisted(() => ({ current: '/' }))
const TRACK = vi.hoisted(() => ({ calls: [] as unknown[][] }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  usePathname: () => PATH.current,
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/track', () => ({ track: (...a: unknown[]) => { TRACK.calls.push(a) } }))

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(el: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    root = createRoot(host as HTMLDivElement)
    root.render(el)
  })
  return host
}

// 注册 / 登录框:有邮箱格;档案题弹框:有题目进度条(GateHead 的 progressbar)
function expectAuthNotQuestions(box: HTMLElement) {
  expect(box.querySelector('input[type="email"]')).not.toBeNull()
  expect(box.querySelector('[role="progressbar"]')).toBeNull()
}

function anonSession(children: ReactNode) {
  const initial = { in: false, email: '', displayName: null, avatar: null, proUntil: null }
  // eslint-disable-next-line react/no-children-prop -- SessionProviderIn 的 children 是必填属性,走 createElement 第三参过不了类型
  return createElement(SessionProvider, { initial, children })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  GUEST.signedIn = false
  PATH.current = '/'
  TRACK.calls = []
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
  // jsdom 没有 matchMedia(modal 桶判窄屏、图版判少动效要它):按宽屏答,不挂监听
  vi.stubGlobal('matchMedia', () => ({
    matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined,
  }))
})

afterEach(() => {
  act(() => {
    if (root != null) {
      root.unmount()
      root = null
    }
  })
  if (host != null) {
    host.remove()
    host = null
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('访客入口一律只弹注册框(2026-10-11)', () => {
  it('进站即弹(全站骨架的 GateSync):未登录进首页弹注册框,不出档案题;记 gate-open kind=entry', () => {
    const box = mount(anonSession(createElement(GateSync)))
    expectAuthNotQuestions(box)
    expect(TRACK.calls).toContainEqual(['gate-open', { kind: 'entry' }])
  })

  it('未登录点开职位弹框(ActModal):先出注册框,不出档案题', () => {
    const job = { id: 7, title: 'Developer', noc: '21232' } as unknown as AdvisorJob
    const plan = { loggedIn: false } as unknown as AdvisorPlan
    const box = mount(createElement(ActModal, { job, lang: 'zh', plan, nocDesc: [], onClose: () => undefined }))
    expectAuthNotQuestions(box)
    expect(TRACK.calls).toContainEqual(['gate-open', { kind: 'job' }])
  })

  it('职位板未登录点收藏 / 动筛选(BoardModals 两路):各弹注册框,不出档案题', () => {
    for (const which of ['save', 'filter']) {
      const b = {
        t: makeT('zh'),
        lang: 'zh',
        plan: { loggedIn: false },
        data: { dims: { nocDescriptions: {} } },
        onSaveGateDone: () => undefined,
        modals: {
          popup: null,
          upsell: false,
          saveGate: which === 'save' ? { id: 3 } : null,
          filterGate: which === 'filter',
          onSaveGateClose: () => undefined,
          onFilterGateClose: () => undefined,
          onFilterGateDone: () => undefined,
        },
      } as unknown as JobsBoardPanel
      const box = mount(createElement(BoardModals, { b }))
      expectAuthNotQuestions(box)
      expect(TRACK.calls).toContainEqual(['gate-open', { kind: which }])
      act(() => {
        root?.unmount()
        root = null
      })
      host?.remove()
      host = null
    }
  })

  it('雇主板未登录动筛选(搜索框打字):弹注册框,不出档案题', () => {
    PATH.current = '/employers'
    window.history.replaceState(null, '', '/employers')
    const props: EmployersIn = {
      initial: {
        rows: [], total: 0, page: 0, pageSize: 50, provs: ['ON', 'AB'], cities: [], districts: [], ees: [], failed: false,
      },
      initialFilters: {
        group: '', prov: '', city: '', district: '', ee: '', sector: '', category: '', program: '', noc: '',
        entry: false, lmia: false, q: '', sort: 'open', dir: 'desc', page: 0,
      } as PoolFilters,
      updatedAt: '',
      initialCols: '',
      plan: { loggedIn: false, isPro: false, profileOk: true, profile: null } as unknown as EmpPlan,
    }
    const box = mount(createElement(Employers, props))
    expect(box.querySelector('input[type="email"]')).toBeNull()
    const q = box.querySelector('input') as HTMLInputElement | null
    expect(q).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(q, 'tim')
      q?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expectAuthNotQuestions(box)
    expect(TRACK.calls).toContainEqual(['gate-open', { kind: 'filter' }])
  })
})

describe('注册框登录完(makeGateAuthDone)', () => {
  it('先记「这个页面里刚登录过」再交还调用方', () => {
    const order: string[] = []
    const done = makeGateAuthDone({
      onDone: () => {
        order.push(isGateSignedIn() ? 'done-after-mark' : 'done-before-mark')
      },
    })
    expect(isGateSignedIn()).toBe(false)
    done()
    expect(order).toEqual(['done-after-mark'])
    expect(isGateSignedIn()).toBe(true)
  })
})
