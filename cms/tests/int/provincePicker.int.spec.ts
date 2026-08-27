import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProvincePicker } from '@/components/quiz'
import type { TFn } from '@/lib/i18n'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const t = ((key: string) => ({
  'quiz.q3': '想评估哪些省?',
  'quiz.q3multiSub': '可以多选',
  'quiz.pickProvince': '请至少选择一个省份',
  'plan.next': '下一题',
  'plan.prev': '上一题',
  'prov.BC': '不列颠哥伦比亚省',
  'prov.SK': '萨斯喀彻温省',
  'prov.NL': '纽芬兰与拉布拉多省',
} as Record<string, string>)[key] || key) as TFn

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProvincePicker', () => {
  it('allows multiple exact provinces and returns the selected array', async () => {
    const onDone = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(ProvincePicker, { t, initial: [], onDone }))
    })

    const button = (name: string) => Array.from(container.querySelectorAll('button')).find((el) => el.textContent === name) as HTMLButtonElement
    await act(async () => button('不列颠哥伦比亚省').click())
    await act(async () => button('萨斯喀彻温省').click())
    await act(async () => button('纽芬兰与拉布拉多省').click())
    await act(async () => button('下一题').click())

    // 2026-08-12 起第二个参数是「还不确定」标记(选了具体省时为 false)
    expect(onDone).toHaveBeenCalledWith(['BC', 'SK', 'NL'], false)

    await act(async () => root.unmount())
    container.remove()
  })
})
