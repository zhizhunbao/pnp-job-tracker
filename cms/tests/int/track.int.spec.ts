// 统一上报门(lib/track)第一方那条腿的自排除与分组值(2026-09-26 /fe Frank)。
// 来由:本人两台设备占近 30 天全站浏览 47%;投递 / 注册 / 发起付款 / 周报四处原先绕过本门直调 umami。
// 性质:① Umami 官方自排除键在 = 第一方不发(两套口径一起剔);② 键不在 = 白名单内照发,分组只收低基数枚举;
// ③ 网址开关 ?notrack=1 写键、?notrack=0 删键、别的值与不带参数不动;④ localStorage 抛错 = 照常计数并留痕,不拦页面。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { syncTrackSwitch, track } from '@/lib/track'

const KEY = 'umami.disabled'

type Sent = { event: string, prop: string | null }

function stubBeacon() {
  const beacon = vi.fn((_url: string, _body: Blob) => true)
  Object.defineProperty(window.navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true })
  return beacon
}

// jsdom 的 Blob 没有 .text(),走 FileReader 读回请求体
function blobText(b: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.readAsText(b)
  })
}

async function sentOf(beacon: ReturnType<typeof stubBeacon>): Promise<Sent[]> {
  const out: Sent[] = []
  for (const call of beacon.mock.calls) {
    out.push(JSON.parse(await blobText(call[1])) as Sent)
  }
  return out
}

function logged(spy: { mock: { calls: unknown[][] } }, head: string): boolean {
  return spy.mock.calls.some((c) => String(c[0]).startsWith(head))
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('第一方那条腿的自排除', () => {
  it('Umami 官方自排除键在 → 第一方不发', () => {
    const beacon = stubBeacon()
    localStorage.setItem(KEY, '1')
    track('checkout', { plan: '30' })
    track('jd-open', { kind: 'page' })
    expect(beacon).not.toHaveBeenCalled()
  })

  it('键不在 → 白名单内照发;键是空串跟 Umami 同口径,算没关', async () => {
    const beacon = stubBeacon()
    track('checkout', { plan: '30' })
    localStorage.setItem(KEY, '')
    track('signup')
    expect(await sentOf(beacon)).toEqual([{ event: 'checkout', prop: '30' }, { event: 'signup', prop: null }])
  })

  it('白名单外的事件不发', () => {
    const beacon = stubBeacon()
    track('save-job')
    track('widget-open')
    expect(beacon).not.toHaveBeenCalled()
  })
})

describe('转化四事件的分组值', () => {
  it('投递方式、周报开关、档位进分组;注册不分组', async () => {
    const beacon = stubBeacon()
    track('apply', { mode: 'email' })
    track('apply', { mode: 'web' })
    track('weekly-optin', { on: 'false' })
    track('checkout', { plan: '90' })
    track('signup')
    expect(await sentOf(beacon)).toEqual([
      { event: 'apply', prop: 'email' },
      { event: 'apply', prop: 'web' },
      { event: 'weekly-optin', prop: 'false' },
      { event: 'checkout', prop: '90' },
      { event: 'signup', prop: null },
    ])
  })
})

describe('网址自排除开关', () => {
  it('?notrack=1 写键、?notrack=0 删键,别的值与不带参数都不动', () => {
    window.history.replaceState(null, '', '/?notrack=1')
    syncTrackSwitch()
    expect(localStorage.getItem(KEY)).toBe('1')
    window.history.replaceState(null, '', '/jobs/1?notrack=yes')
    syncTrackSwitch()
    expect(localStorage.getItem(KEY)).toBe('1')
    window.history.replaceState(null, '', '/')
    syncTrackSwitch()
    expect(localStorage.getItem(KEY)).toBe('1')
    window.history.replaceState(null, '', '/pricing?notrack=0')
    syncTrackSwitch()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('开关拨上之后,第一方就不发了', () => {
    const beacon = stubBeacon()
    window.history.replaceState(null, '', '/?notrack=1')
    syncTrackSwitch()
    track('apply', { mode: 'web' })
    expect(beacon).not.toHaveBeenCalled()
  })
})

describe('localStorage 抛错(无痕模式 / 站点数据被禁)', () => {
  it('读键抛了 → 这一笔照常计数,并在控制台留痕', () => {
    const beacon = stubBeacon()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    track('signup')
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(logged(logSpy, '[track] notrack read failed')).toBe(true)
  })

  it('写键抛了 → 页面不崩,并在控制台留痕', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    window.history.replaceState(null, '', '/?notrack=1')
    expect(() => syncTrackSwitch()).not.toThrow()
    expect(logged(logSpy, '[track] notrack switch failed')).toBe(true)
  })
})
