// 访客向导的走法与交接(2026-10-04 收口审查;设计稿 docs/design/通用/付费闭环-20261003.md 10-04 各节)。
// 来由:交接戳原先只有 × 撤 —— 浏览器返回、换页、弹它的那一页自己卸掉,戳都留着,10 分钟内页头登录就替他交草稿;
//       点目标大卡 / 下一步时被点的钮跟着这一屏卸掉,焦点掉回 body。
// 性质:① 向导没在注册屏注册 / 登录成就卸掉 → 交接戳撤掉(草稿照留,只给下次预填);
//       ② 邮箱注册当场:交成了戳撤、卸掉不再动;交没成戳放回去,卸掉向导也不撤(等补交);
//       ③ Google 整页登录:走到注册屏落戳,跳走是整页卸载(React 不跑收尾器)—— 回跳那一页登录态下补交钩子取戳、
//          并进答案档、回职位板按答案筛;
//       ④ 换了题焦点挪到题面(id + tabIndex -1);开屏不挪(焦点不抢、背后页面不滚);返回也挪。
// 探针:去掉 dropHandoffOnLeave → ①红;dropGateHandoff 不看 isGateSignedIn → ②「交没成卸掉不撤」红;
//       focusGateQuestion 恒 return → ④「点目标大卡后焦点在题面」红;开屏也挪 → ④「开屏不挪」红。
// 2026-10-09「我的档案」批:首访引导向导退役,「记引导弹过」(本地存储 jobs_onboarding_v1)那一记从 gate 撤 ——
//       ② ③ 里对它的断言删(③ 原先拿它等补交那一跑交成,交成的证据改由随后的戳 / 草稿 / 地址栏断言给)。
// 2026-10-11 Frank「我应该先注册 再问问题吧」→「需要改」:访客不再答题,访客向导与交接戳整套删 —— ①②③ 随之删;
//       ④ 换题挪焦点照验,挂的件从访客向导换成档案编辑弹框 GateEdit(同一个 focusGateQuestion)。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内件直接点文件(桶只走门的规矩不管测试)
import { GateEdit } from '@/components/gate/gateedit'
import type { TFn } from '@/lib/i18n'
import { resetAnswersMemory } from '@/lib/quiz'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace, push: () => undefined }),
  usePathname: () => PATH.current,
}))

const t = ((key: string) => key) as TFn

// 档案编辑弹框的空档(2026-10-11 访客向导删,换题挪焦点改在 GateEdit 上验 —— 同一副顶行与题面,五题全问从目标题起)
const EMPTY_SEED = { goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', name: '' }

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

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  resetAnswersMemory()
  PATH.current = '/'
  ROUTER.replace.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
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
      root.render(createElement(GateEdit, { t, seed: EMPTY_SEED, onClose: () => undefined, onSaved: () => undefined }))
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
