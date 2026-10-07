// 雇主板筛选的访客闸(2026-10-04 收口审查;设计稿 docs/design/付费闭环-20261003.md 10-04「关掉后…开职位弹框、筛选、投递、收藏一律再弹」;
// 照职位板 boardFilterGate.int.spec.ts 的形)。
// 性质:① 访客(分层态未登录、本页也没在访客向导里登录过)动任何一格筛选 / 搜索 → 开筛选那一路的访客向导、值不动、不记埋点、地址栏不动;
//       ② 登录用户、或本页刚在访客向导里登录过(软刷没回来)→ 值照写、不开向导;
//       ③ 板内自己的写口(首屏按设备时区预选本省)走原落格 → 访客也不开向导、预选照落;清除筛选只放宽条件,访客照清;
//       ④ × 关掉向导 → 收起,值仍不动;注册完 → 收起 + 软刷。
// 探针:makeGatedPick 去掉登录判 → ①红;useEmployersPage 面板换回原手柄 → 整机那条①红;首屏预选改走过闸的手柄 → ③红。
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { makeGatedPick } from '@/components/employers/functions'
import { useEmployersPage } from '@/components/employers/hooks'
import type { EmployersIn, EmployersPanel, EmpPlan, PickFn, PoolFilters } from '@/components/employers/types'
import { markGateSignedIn } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'

const refresh = vi.fn()
const track = vi.fn()
let home = 'ON'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: () => undefined, push: () => undefined }),
  usePathname: () => '/employers',
}))

vi.mock('@/lib/track', () => ({ track: (...a: unknown[]) => track(...a) }))

// 首屏预选本省按设备时区判:测试里把时区那一步钉成可控的省码(其余原样)
vi.mock('@/lib/location', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/lib/location')>()
  return { ...m, homeProvinceOf: () => home }
})

let root: Root | null = null

function filters(p: Partial<PoolFilters> = {}): PoolFilters {
  return {
    group: '', prov: '', city: '', district: '', ee: '', sector: '', category: '', program: '', noc: '',
    entry: false, lmia: false, q: '', sort: 'open', dir: 'desc', page: 0, ...p,
  } as PoolFilters
}

function props(loggedIn: boolean): EmployersIn {
  return {
    initial: {
      rows: [], total: 0, page: 0, pageSize: 50, provs: ['ON', 'AB'], cities: [], districts: [], ees: [], failed: false,
    },
    initialFilters: filters(),
    updatedAt: '',
    initialCols: '',
    plan: { loggedIn, isPro: false, profileOk: true, profile: null } as unknown as EmpPlan,
  }
}

// 挂一个只跑整台 hook 的探针件(同 boardFilterGate 的 createRoot 形,不为测试加依赖)
function runBoard(loggedIn: boolean) {
  const out: { current: EmployersPanel | null } = { current: null }
  function Probe() {
    out.current = useEmployersPage(props(loggedIn))
    return null
  }
  act(() => {
    root = createRoot(document.createElement('div'))
    root.render(React.createElement(Probe))
  })
  return out
}

function cur(b: { current: EmployersPanel | null }): EmployersPanel {
  if (b.current == null) {
    throw new Error('probe not mounted')
  }
  return b.current
}

// 用户在筛选区能动的每一格:[名字, 手柄, 要落的值]
function userPicks(p: EmployersPanel): Array<[string, PickFn, string]> {
  return [
    ['prov', p.onProv, 'AB'],
    ['city', p.onCity, 'Ottawa'],
    ['district', p.onDistrict, 'Kanata'],
    ['sector', p.onSector, 'private'],
    ['category', p.onCategory, 'tech'],
    ['ee', p.onEe, 'Healthcare'],
    ['entry', p.onEntry, '1'],
    ['lmia', p.onLmia, '1'],
    ['q', p.onQDraft, 'tim'],
  ]
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  GUEST.signedIn = false
  home = 'ON'
  refresh.mockClear()
  track.mockClear()
  window.history.replaceState(null, '', '/employers')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
})

afterEach(() => {
  act(() => {
    if (root != null) {
      root.unmount()
      root = null
    }
  })
  vi.unstubAllGlobals()
})

describe('makeGatedPick(过闸的筛选手柄)', () => {
  it('访客:开向导、原手柄一次都不调', () => {
    const calls: string[] = []
    let gates = 0
    const pick = makeGatedPick({
      pick: (v) => { calls.push(v) },
      gate: { loggedIn: false, signedIn: () => false, onGate: () => { gates += 1 } },
    })
    for (const v of ['ON', '', 'x']) {
      pick(v)
    }
    expect(gates).toBe(3)
    expect(calls).toEqual([])
  })

  it('登录用户、或本页刚在向导里登录过:照调原手柄、原值透传,不开向导', () => {
    for (const who of [{ loggedIn: true, signed: false }, { loggedIn: false, signed: true }, { loggedIn: true, signed: true }]) {
      const calls: string[] = []
      let gates = 0
      const pick = makeGatedPick({
        pick: (v) => { calls.push(v) },
        gate: { loggedIn: who.loggedIn, signedIn: () => who.signed, onGate: () => { gates += 1 } },
      })
      pick('AB')
      pick('')
      expect(gates).toBe(0)
      expect(calls).toEqual(['AB', ''])
    }
  })

  it('登录判在调的那一刻做:建手柄时还是访客、向导里刚登录过之后再调就放行', () => {
    const calls: string[] = []
    let signed = false
    let gates = 0
    const pick = makeGatedPick({
      pick: (v) => { calls.push(v) },
      gate: { loggedIn: false, signedIn: () => signed, onGate: () => { gates += 1 } },
    })
    pick('AB')
    signed = true
    pick('AB')
    expect(gates).toBe(1)
    expect(calls).toEqual(['AB'])
  })
})

describe('雇主板整机 useEmployersPage', () => {
  it('访客:首屏预选本省照落、不开向导;动任何一格筛选 / 搜索都开向导、值不动、不记埋点、地址栏不动', () => {
    const b = runBoard(false)
    expect(cur(b).f.prov).toBe('ON')
    expect(cur(b).peek.filterGate).toBe(false)
    expect(window.location.search).toBe('?prov=ON')
    const before = JSON.stringify(cur(b).f)
    for (const [name, , v] of userPicks(cur(b))) {
      track.mockClear()
      act(() => {
        const pick = userPicks(cur(b)).find((r) => r[0] === name)
        pick?.[1](v)
      })
      expect(cur(b).peek.filterGate, name).toBe(true)
      expect(JSON.stringify(cur(b).f), name).toBe(before)
      expect(cur(b).qDraft, name).toBe('')
      expect(track, name).not.toHaveBeenCalled()
      expect(window.location.search, name).toBe('?prov=ON')
      act(() => cur(b).peek.onFilterGateClose())
      expect(cur(b).peek.filterGate, name).toBe(false)
      expect(JSON.stringify(cur(b).f), name).toBe(before)
    }
  })

  it('访客:清除筛选只放宽条件,照清、不开向导', () => {
    const b = runBoard(false)
    expect(cur(b).f.prov).toBe('ON')
    act(() => cur(b).onClear())
    expect(cur(b).f.prov).toBe('')
    expect(cur(b).peek.filterGate).toBe(false)
  })

  it('访客:向导里注册完 → 收起 + 软刷', () => {
    const b = runBoard(false)
    act(() => cur(b).onProv('AB'))
    expect(cur(b).peek.filterGate).toBe(true)
    act(() => cur(b).peek.onFilterGateDone())
    expect(cur(b).peek.filterGate).toBe(false)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('登录用户:动省 / 搜索照写、记埋点,一次都不开向导', () => {
    const b = runBoard(true)
    act(() => cur(b).onProv('AB'))
    expect(cur(b).f.prov).toBe('AB')
    expect(track).toHaveBeenCalled()
    act(() => cur(b).onQDraft('tim'))
    expect(cur(b).qDraft).toBe('tim')
    act(() => cur(b).onLmia('1'))
    expect(cur(b).f.lmia).toBe(true)
    expect(cur(b).peek.filterGate).toBe(false)
  })

  it('访客在向导里刚登录过(软刷没回来):动省照写,不再弹', () => {
    markGateSignedIn()
    const b = runBoard(false)
    act(() => cur(b).onProv('AB'))
    expect(cur(b).f.prov).toBe('AB')
    expect(cur(b).peek.filterGate).toBe(false)
  })

  it('时区对不上加拿大:不预选、也不开向导', () => {
    home = ''
    const b = runBoard(false)
    expect(cur(b).f.prov).toBe('')
    expect(cur(b).peek.filterGate).toBe(false)
    expect(window.location.search).toBe('')
  })
})
