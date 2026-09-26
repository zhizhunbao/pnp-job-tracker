// 职位板筛选 → 地址栏的时序(components/jobs 的 useBoardUrlSync;2026-09-26 /fe Frank)。
// 来由:搜索框每敲一个字 replaceState 一次,Umami 把 q=o、q=ot、q=otta……每个中间态都记成一次浏览。
// 性质:① 只有关键词在变 → 地址栏等停手 600ms 再写,中间态一个都不落;② 别的筛选格一变 → 当场写(连同当时的关键词);
// ③ 回车 / 失焦的手柄 → 当场写;④ 快照(返回保筛选)照旧每次都写;⑤ 排着的那次到点时已经切走 / 已卸载 → 不写。
import React, { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:内部 hook 直接点文件(桶只走门的规矩不管测试)
import { useBoardUrlSync } from '@/components/jobs/hooks'

type Snap = Record<string, string>

const SNAPSHOT_KEY = 'boardFilters'

let commit: () => void = () => undefined
let root: Root | null = null

function Harness(props: { snap: Snap, expose: (c: () => void) => void }) {
  const c = useBoardUrlSync(props.snap)
  useEffect(() => {
    props.expose(c)
  })
  return null
}

function show(snap: Snap) {
  act(() => {
    if (root == null) {
      root = createRoot(document.createElement('div'))
    }
    root.render(React.createElement(Harness, { snap, expose: (c) => { commit = c } }))
  })
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  root = null
})

afterEach(() => {
  act(() => {
    if (root != null) {
      root.unmount()
    }
  })
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('关键词停手才写地址栏', () => {
  it('首帧不写;连敲几个字,停手 600ms 才写最后那个词,中间态一个都不落', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    show({})
    show({ q: 'o' })
    wait(300)
    show({ q: 'ot' })
    wait(300)
    show({ q: 'otta' })
    expect(replace).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    wait(599)
    expect(window.location.search).toBe('')
    wait(1)
    expect(window.location.search).toBe('?q=otta')
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('快照(返回保筛选)照旧每敲一次都写,不等停手', () => {
    show({})
    show({ q: 'ot' })
    expect(JSON.parse(String(localStorage.getItem(SNAPSHOT_KEY)))).toEqual({ q: 'ot' })
  })

  it('回车 / 失焦的手柄当场写;排着的那次到点不再重复写', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    show({})
    show({ q: 'ottawa' })
    act(() => {
      commit()
    })
    expect(window.location.search).toBe('?q=ottawa')
    wait(600)
    expect(replace).toHaveBeenCalledTimes(1)
  })
})

describe('别的筛选格照旧当场写', () => {
  it('换省当场写,连同当时的关键词;排着的关键词那次随之作废', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    show({})
    show({ q: 'nurse' })
    show({ q: 'nurse', fProv: 'ON' })
    expect(new URLSearchParams(window.location.search).get('prov')).toBe('ON')
    expect(new URLSearchParams(window.location.search).get('q')).toBe('nurse')
    wait(600)
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('清除全部(关键词与别的格一起清)只写一次干净地址,不先落一版旧关键词', () => {
    show({ q: 'nurse', fProv: 'ON' })
    window.history.replaceState(null, '', '/?q=nurse&prov=ON')
    const replace = vi.spyOn(window.history, 'replaceState')
    show({})
    expect(window.location.search).toBe('')
    wait(600)
    expect(replace).toHaveBeenCalledTimes(1)
  })
})

describe('排着的那次作废', () => {
  it('到点前已经切到别的页 → 不往那一页的地址上写关键词', () => {
    show({})
    show({ q: 'cook' })
    window.history.replaceState(null, '', '/jobs/123')
    wait(600)
    expect(window.location.pathname + window.location.search).toBe('/jobs/123')
  })

  it('到点前板子已卸载 → 不写', () => {
    show({})
    show({ q: 'cook' })
    act(() => {
      if (root != null) {
        root.unmount()
        root = null
      }
    })
    wait(600)
    expect(window.location.search).toBe('')
  })
})
