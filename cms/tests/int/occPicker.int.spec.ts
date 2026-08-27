import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OccPicker } from '@/components/quiz'
import type { TFn } from '@/lib/i18n'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const initial = ['21232', '11100', '31301']

const t = ((key: string, vars?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    'occ.selected': '已选 {n} 个',
    'occ.max': '可选择多个职业',
    'quiz.openN': '{n} 在招',
    'quiz.nextN': '下一题 · 已选 {n} 个',
  }
  return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''))
}) as TFn

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('OccPicker', () => {
  it('allows a fourth occupation without inserting the selected block above the stable list', async () => {
    // Keep background recommendations pending: this test isolates the synchronous selection/layout contract.
    const fetchMock = vi.fn((_url: string) => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(OccPicker, {
        t,
        lang: 'zh',
        initial,
        inline: true,
        onDone: vi.fn(),
        onChange,
      }))
    })

    expect(container.textContent).toContain('已选 3 个')
    const search = container.querySelector('.occSearchWrap') as HTMLDivElement
    const selected = container.querySelector('.occSelected') as HTMLDivElement
    expect(search.compareDocumentPosition(selected) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const fourth = container.querySelector('button[title="prof.job.psw"]') as HTMLButtonElement
    expect(fourth.disabled).toBe(false)
    await act(async () => fourth.click())

    expect(onChange).toHaveBeenLastCalledWith([...initial, '33102'])
    expect(container.textContent).toContain('已选 4 个')
    expect(search.compareDocumentPosition(selected) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('?kin='))).toBe(false)

    await act(async () => root.unmount())
    container.remove()
  })
})
