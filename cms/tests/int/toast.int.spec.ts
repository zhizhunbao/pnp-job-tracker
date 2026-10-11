// 右上角提示(2026-10-11 批 5「提示统一 + 顶栏铃铛」;components/toast 的总线 + 全站宿主)。
// 性质:① 任何地方 toast() 发一条,骨架上的宿主画一张卡(粗体一行 + 可选灰字副行),播报区 role=status、aria-live=polite;
//       ② 5 秒自己收;点 × 当场收;
//       ③ 最多叠 3 张,第 4 张挤掉最早那张;
//       ④ 三档各上各的类(成功 / 提醒 / 出错不混)。
// 探针:useToastCard 不起表 → ②红;toastListWith 不截 → ③红;toastClsOf 三档查同一个类 → ④红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toast, ToastHost } from '@/components/toast'

// jsdom 里 React 要这面旗才认 act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// 测试例外:域内函数直接点文件
const { toastClsOf, toastListWith, toToastItem } = await import('@/components/toast/functions')

async function mountHost() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  await act(async () => {
    createRoot(el).render(createElement(ToastHost))
  })
  return el
}

function cards(el: HTMLElement) {
  const region = el.querySelector('[role="status"]') as HTMLElement
  return Array.from(region.children) as HTMLElement[]
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('toast 总线 → 宿主', () => {
  it('① 发一条画一张:粗体行 + 副行;播报区可达', async () => {
    const el = await mountHost()
    const region = el.querySelector('[role="status"]') as HTMLElement
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(cards(el)).toHaveLength(0)
    await act(async () => {
      toast({ kind: 'ok', title: '已保存', detail: '点 a@b.com 收到的链接后生效' })
    })
    expect(cards(el)).toHaveLength(1)
    expect(region.textContent).toContain('已保存')
    expect(region.textContent).toContain('点 a@b.com 收到的链接后生效')
  })

  it('② 5 秒自己收;点 × 当场收', async () => {
    const el = await mountHost()
    await act(async () => {
      toast({ kind: 'ok', title: 'A' })
    })
    await act(async () => {
      vi.advanceTimersByTime(4999)
    })
    expect(cards(el)).toHaveLength(1)
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(cards(el)).toHaveLength(0)
    await act(async () => {
      toast({ kind: 'err', title: 'B' })
    })
    const close = el.querySelector('button[aria-label="close"]') as HTMLButtonElement
    await act(async () => {
      close.click()
    })
    expect(cards(el)).toHaveLength(0)
  })

  it('③ 最多叠 3 张,第 4 张挤掉最早的', async () => {
    const el = await mountHost()
    for (const t of ['一', '二', '三', '四']) {
      await act(async () => {
        toast({ kind: 'ok', title: t })
      })
    }
    const list = cards(el).map((c) => c.textContent)
    expect(list).toHaveLength(3)
    expect(list.join('|')).not.toContain('一')
    expect(list[2]).toContain('四')
  })

  it('③ 纯函数:截到 3 张、副行缺席按空串', () => {
    let list = [] as ReturnType<typeof toToastItem>[]
    for (let i = 1; i <= 5; i++) {
      list = toastListWith({ list, item: toToastItem({ msg: { kind: 'ok', title: String(i) }, id: i }) })
    }
    expect(list.map((x) => x.id)).toEqual([3, 4, 5])
    expect(list[0]?.detail).toBe('')
  })

  it('④ 三档各上各的类', () => {
    const cls = new Set([toastClsOf('ok'), toastClsOf('warn'), toastClsOf('err')])
    expect(cls.size).toBe(3)
  })
})
