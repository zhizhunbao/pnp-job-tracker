// 职位板筛选的访客闸(2026-10-04 收口审查;设计稿 docs/design/付费闭环-20261003.md 10-04「关掉后…开职位弹框、筛选、投递、收藏一律再弹」)。
// 性质:① 访客(分层态未登录、本页也没在访客向导里登录过)动任何一格筛选 / 搜索 → 开筛选那一路的访客向导、值不动;
//       ② 登录用户、或本页刚在访客向导里登录过(软刷没回来)→ 值照写、不开向导;
//       ③ 板内自己的写口(水合那一步按上次所选预选本省)走原表 → 访客也不开向导、预选照落;
//       ④ × 关掉向导 → 收起,值仍不动。
// 探针:makeGatedSet 去掉登录判 → ①红;useBoardFilters 面板换回原表 → 整机那条①红;水合改用面板那份 → ③红。
// 2026-10-04 收口补:⑤ 访客换省(面板 onProv)→ 开向导、省不动、记所选省的 cookie 也不写(原先 cookie 在闸前照记,
//       刷新一下就按「上次所选」落到那一省、绕过筛选闸);登录用户、或本页刚在向导里登录过 → 省照换、cookie 记下所选省。
// 探针:onProv 换回「makeProvChange 收过闸那份表」→ ⑤ 访客那条红(cookie 被改成 Ontario)。
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { FK, PROV_PICK_COOKIE } from '@/components/jobs/constants'
import { makeGatedFilters } from '@/components/jobs/functions'
import { useJobsBoard } from '@/components/jobs/hooks'
import type { FilterState, JobPlan, JobsBoardPanel, JobsIn } from '@/components/jobs/types'
import { markGateSignedIn } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  usePathname: () => '/',
}))

const KEYS = Object.values(FK)

let root: Root | null = null

// 一张假筛选表:每格的写口记下写过什么(值不跟着变 —— 这里只看写口有没有被调)
function fakeState() {
  const writes: Array<[string, string]> = []
  const fState: FilterState = {}
  for (const k of KEYS) {
    fState[k] = { v: 'old-' + k, set: (v: string) => { writes.push([k, v]) } }
  }
  return { fState, writes }
}

// 读记所选省的 cookie(没有 = '')
function provCookie(): string {
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(PROV_PICK_COOKIE + '=')) {
      return decodeURIComponent(part.slice(PROV_PICK_COOKIE.length + 1))
    }
  }
  return ''
}

function plan(loggedIn: boolean): JobPlan {
  return { loggedIn, profileOk: true, profile: null, isPro: false } as unknown as JobPlan
}

function props(p: JobPlan): JobsIn {
  return { jobs: [], pnpFacts: { pnpBlocked: [], index: {} }, plan: p, initialFilters: {} } as unknown as JobsIn
}

// 挂一个只跑整台 hook 的探针件(同 applyHow 的 createRoot 形,不为测试加依赖)
function runBoard(p: JobPlan) {
  const out: { current: JobsBoardPanel | null } = { current: null }
  function Probe() {
    out.current = useJobsBoard(props(p))[0]
    return null
  }
  act(() => {
    root = createRoot(document.createElement('div'))
    root.render(React.createElement(Probe))
  })
  return out
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  GUEST.signedIn = false
  window.history.replaceState(null, '', '/')
  document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent('Alberta') + '; path=/'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
})

afterEach(() => {
  act(() => {
    if (root != null) {
      root.unmount()
      root = null
    }
  })
  document.cookie = PROV_PICK_COOKIE + '=; max-age=0; path=/'
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('makeGatedFilters(过闸的那份筛选表)', () => {
  it('访客动任何一格:开向导、原写口一次都不调;值照抄原表', () => {
    const { fState, writes } = fakeState()
    let gates = 0
    const gated = makeGatedFilters({ fState, loggedIn: false, signedIn: () => false, onGate: () => { gates += 1 } })
    for (const k of KEYS) {
      expect(gated[k]?.v).toBe('old-' + k)
      gated[k]?.set('new')
    }
    expect(gates).toBe(KEYS.length)
    expect(writes).toEqual([])
  })

  it('登录用户、或本页刚在向导里登录过:每一格照写,不开向导', () => {
    for (const who of [{ loggedIn: true, signed: false }, { loggedIn: false, signed: true }]) {
      const { fState, writes } = fakeState()
      let gates = 0
      const gated = makeGatedFilters({
        fState, loggedIn: who.loggedIn, signedIn: () => who.signed, onGate: () => { gates += 1 },
      })
      for (const k of KEYS) {
        gated[k]?.set('new-' + k)
      }
      expect(gates).toBe(0)
      expect(writes).toEqual(KEYS.map((k) => [k, 'new-' + k]))
    }
  })

  it('登录判在写的那一刻做:建表时还是访客、向导里刚登录过之后再写就放行', () => {
    const { fState, writes } = fakeState()
    let signed = false
    let gates = 0
    const gated = makeGatedFilters({ fState, loggedIn: false, signedIn: () => signed, onGate: () => { gates += 1 } })
    gated[FK.prov]?.set('Ontario')
    signed = true
    gated[FK.prov]?.set('Ontario')
    expect(gates).toBe(1)
    expect(writes).toEqual([[FK.prov, 'Ontario']])
  })
})

describe('职位板整机 useJobsBoard', () => {
  it('访客:水合预选本省照落、不开向导;动省 / 搜索开向导、值不动;× 关掉收起', () => {
    const b = runBoard(plan(false))
    expect(b.current?.filters.fState[FK.prov]?.v).toBe('Alberta')
    expect(b.current?.modals.filterGate).toBe(false)
    act(() => b.current?.filters.fState[FK.prov]?.set('Ontario'))
    expect(b.current?.modals.filterGate).toBe(true)
    expect(b.current?.filters.fState[FK.prov]?.v).toBe('Alberta')
    act(() => b.current?.modals.onFilterGateClose())
    expect(b.current?.modals.filterGate).toBe(false)
    act(() => b.current?.onQ('cook'))
    expect(b.current?.modals.filterGate).toBe(true)
    expect(b.current?.q).toBe('')
    expect(window.location.search).toBe('?prov=Alberta')
  })

  it('登录用户:动省 / 搜索照写,一次都不开向导', () => {
    const b = runBoard(plan(true))
    act(() => b.current?.filters.fState[FK.prov]?.set('Ontario'))
    act(() => b.current?.onQ('cook'))
    expect(b.current?.filters.fState[FK.prov]?.v).toBe('Ontario')
    expect(b.current?.q).toBe('cook')
    expect(b.current?.modals.filterGate).toBe(false)
  })

  it('访客在向导里刚登录过(软刷没回来):动省照写,不再弹', () => {
    markGateSignedIn()
    const b = runBoard(plan(false))
    act(() => b.current?.filters.fState[FK.prov]?.set('Ontario'))
    expect(b.current?.filters.fState[FK.prov]?.v).toBe('Ontario')
    expect(b.current?.modals.filterGate).toBe(false)
  })

  it('访客换省(省下拉的 onProv):开向导、省不动、记所选省的 cookie 不写', () => {
    const b = runBoard(plan(false))
    expect(provCookie()).toBe('Alberta')
    act(() => b.current?.filters.onProv('Ontario'))
    expect(b.current?.modals.filterGate).toBe(true)
    expect(b.current?.filters.fState[FK.prov]?.v).toBe('Alberta')
    expect(provCookie()).toBe('Alberta')
  })

  it('登录用户、或本页刚在向导里登录过:换省照换、市 / 区清掉、cookie 记下所选省', () => {
    for (const who of [{ loggedIn: true, signed: false }, { loggedIn: false, signed: true }]) {
      GUEST.signedIn = false
      if (who.signed) {
        markGateSignedIn()
      }
      const b = runBoard(plan(who.loggedIn))
      act(() => b.current?.filters.fState[FK.city]?.set('Calgary'))
      act(() => b.current?.filters.onProv('Ontario'))
      expect(b.current?.modals.filterGate).toBe(false)
      expect(b.current?.filters.fState[FK.prov]?.v).toBe('Ontario')
      expect(b.current?.filters.fState[FK.city]?.v).toBe('')
      expect(provCookie()).toBe('Ontario')
      act(() => {
        if (root != null) {
          root.unmount()
          root = null
        }
      })
      document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent('Alberta') + '; path=/'
    }
  })
})
