// 手机职位板首屏(2026-09-26 /fe 首页 Frank 看效果图点头:横幅收成一行、控件压成两行、EE 收进更多筛选、清除筛选只在用户自己设了筛选时出)。
// 布局归 CSS(上线后生产拍 375 / 1280 验);这里钉住四件判定的性质:
//   ① fmtLocalShort:与此刻同一个多伦多日期只写 HH:mm,否则写 MM-DD HH:mm —— 两档都是 fmtLocal 原串的尾巴,不另起格式;
//   ② userFilterOf:进板时预选的本省不算用户设的筛选,别的非空格都算;蕴含 anyFilterOf,没预选时两者等价;
//   ③ homeProvPickOf ⇔ applyHomeProvince:板上记下的预选值就是真写进省格的那一个(同一个出口,不分叉);
//   ④ foldActiveNarrowOf:窄屏徽标 = 宽屏徽标 + EE 类别选没选(EE 在手机上收进了折叠区)。
// 外加 Updated 的窄屏短写档:两句同出(写全 / 短写),不传照旧只出写全那一句。
import fc from 'fast-check'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数与组件直接点文件(桶只走门的规矩不管测试)
import { PROV_PICK_COOKIE } from '@/components/jobs/constants'
import {
  anyFilterOf, applyHomeProvince, foldActiveNarrowOf, foldActiveOf, homeProvPickOf, userFilterOf,
} from '@/components/jobs/functions'
import { Updated } from '@/components/time/updated'
import { fmtLocal, fmtLocalShort, ymd } from '@/lib/time'

/** 一张筛选表(只放测到的格;set 用不上)。 */
function stateOf(vals: Record<string, string>) {
  const out: Record<string, { v: string; set: (v: string) => void }> = {}
  for (const [k, v] of Object.entries(vals)) {
    out[k] = { v, set: () => undefined }
  }
  return out
}

/** 独立口径的多伦多日期(不走被测的 lib/time 组合):en-CA 恰好出 YYYY-MM-DD。 */
function torontoDay(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.cookie = PROV_PICK_COOKIE + '=; max-age=0; path=/'
})

describe('fmtLocalShort 金标', () => {
  it('同一天只写时刻', () => {
    expect(fmtLocalShort({ iso: '2026-09-26T16:57:00.000Z', now: Date.UTC(2026, 8, 26, 18, 0) })).toBe('12:57')
  })

  it('多伦多晚上 10 点半(UTC 已是明天),此刻晚上 11 点:仍是同一天', () => {
    expect(fmtLocalShort({ iso: '2026-09-27T02:30:00.000Z', now: Date.UTC(2026, 8, 27, 3, 0) })).toBe('22:30')
  })

  it('跨过多伦多零点:写月-日', () => {
    expect(fmtLocalShort({ iso: '2026-09-27T03:50:00.000Z', now: Date.UTC(2026, 8, 27, 4, 30) })).toBe('09-26 23:50')
  })

  it('停更两天:写月-日,不会看着像今天刚更', () => {
    expect(fmtLocalShort({ iso: '2026-09-24T16:57:00.000Z', now: Date.UTC(2026, 8, 26, 16, 0) })).toBe('09-24 12:57')
  })

  it('跨年:写月-日(年份照裁)', () => {
    expect(fmtLocalShort({ iso: '2026-01-01T04:59:00.000Z', now: Date.UTC(2026, 0, 1, 17, 0) })).toBe('12-31 23:59')
  })
})

describe('fmtLocalShort 性质:任意时刻 × 任意此刻(贴着前后两天)', () => {
  const DAY = 86_400_000
  const BASE = Date.UTC(2026, 0, 1)

  it('同一个多伦多日期 ⇔ 只写 HH:mm;两档都是 fmtLocal 原串的尾巴', () => {
    fc.assert(fc.property(
      fc.integer({ min: BASE, max: BASE + 365 * DAY }),
      fc.integer({ min: -2 * DAY, max: 2 * DAY }),
      (at, delta) => {
        const iso = new Date(at).toISOString()
        const now = at + delta
        const out = fmtLocalShort({ iso, now })
        const full = fmtLocal(iso)
        const sameDay = torontoDay(at) === torontoDay(now)
        expect(ymd(full)).toBe(torontoDay(at))
        if (sameDay) {
          expect(out).toMatch(/^\d{2}:\d{2}$/)
          expect(full.endsWith(' ' + out)).toBe(true)
        } else {
          expect(out).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
          expect(full.endsWith(out)).toBe(true)
        }
      },
    ), { numRuns: 500 })
  })
})

describe('userFilterOf 金标', () => {
  it('什么都没设:不算', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: '', fBroad: '', q: '' }), homeProv: 'Ontario' })).toBe(false)
  })

  it('只有进板时预选的本省:不算(窄屏不出清除筛选)', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: 'Ontario', fBroad: '' }), homeProv: 'Ontario' })).toBe(false)
  })

  it('换了省:算', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: 'Alberta', fBroad: '' }), homeProv: 'Ontario' })).toBe(true)
  })

  it('预选的本省 + 选了大类:算', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: 'Ontario', fBroad: 'Tech' }), homeProv: 'Ontario' })).toBe(true)
  })

  it('改回全部省:不算(没有可清的)', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: '', fBroad: '' }), homeProv: 'Ontario' })).toBe(false)
  })

  it('打了搜索词:算', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: 'Ontario', q: 'nurse' }), homeProv: 'Ontario' })).toBe(true)
  })

  it('没预选(地址栏带的省):算 —— 那是链接给的条件', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: 'Ontario' }), homeProv: '' })).toBe(true)
  })

  it('别的格恰好等于预选省的名字:照算(只豁免省那一格)', () => {
    expect(userFilterOf({ fState: stateOf({ fProv: '', q: 'Ontario' }), homeProv: 'Ontario' })).toBe(true)
  })
})

describe('userFilterOf 性质', () => {
  const PROVS = ['', 'Ontario', 'Alberta', 'British Columbia']
  const arb = fc.record({
    fProv: fc.constantFrom(...PROVS),
    fBroad: fc.constantFrom('', 'Tech', 'Healthcare'),
    fEe: fc.constantFrom('', 'STEM'),
    fCity: fc.constantFrom('', 'Ottawa'),
    q: fc.constantFrom('', 'nurse'),
  })

  it('蕴含 anyFilterOf;没预选时两者等价;只有省一格非空且等于预选值时为假', () => {
    fc.assert(fc.property(arb, fc.constantFrom(...PROVS), (vals, homeProv) => {
      const fState = stateOf(vals)
      const user = userFilterOf({ fState, homeProv })
      const any = anyFilterOf({ fState })
      if (user) {
        expect(any).toBe(true)
      }
      if (homeProv === '') {
        expect(user).toBe(any)
      }
      const others = [vals.fBroad, vals.fEe, vals.fCity, vals.q].some((v) => v !== '')
      const provCounts = vals.fProv !== '' && vals.fProv !== homeProv
      expect(user).toBe(others || provCounts)
    }), { numRuns: 400 })
  })
})

describe('homeProvPickOf ⇔ applyHomeProvince', () => {
  const ZONES = [
    'America/Vancouver', 'America/Edmonton', 'America/Regina', 'America/Winnipeg', 'America/Toronto',
    'America/Montreal', 'America/St_Johns', 'America/Halifax', 'America/Whitehorse', 'Asia/Shanghai', 'UTC', '',
  ]
  const LANGS = ['en-CA', 'fr-CA', 'zh-CN', 'ko-KR']

  /** 伪装设备时区与浏览器语言(同 homeGate 测试的造法)。 */
  function device(tz: string, lang: string) {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: tz } as Intl.ResolvedDateTimeFormatOptions)
    Object.defineProperty(window.navigator, 'language', { value: lang, configurable: true })
  }

  it('任意时区 × 语言 × 地址栏:板上记的预选值 = 真写进省格的那一个;没写 ⇔ 记空', () => {
    fc.assert(fc.property(fc.constantFrom(...ZONES), fc.constantFrom(...LANGS),
      fc.constantFrom('', 'British Columbia'), fc.constantFrom('', 'acme'), (tz, lang, prov, q) => {
        device(tz, lang)
        const initial: Record<string, string> = {}
        if (prov !== '') {
          initial.fProv = prov
        }
        if (q !== '') {
          initial.q = q
        }
        const seen: string[] = []
        const fState = { fProv: { v: prov, set: (v: string) => { seen.push(v) } }, q: { v: q, set: () => undefined } }
        const pick = homeProvPickOf(initial)
        const did = applyHomeProvince({ fState, initial })
        expect(did).toBe(pick !== '')
        if (did) {
          expect(seen).toEqual([pick])
        } else {
          expect(seen).toEqual([])
        }
        vi.restoreAllMocks()
      }), { numRuns: 300 })
  })

  it('上次亲手选过省(cookie):预选值就是那一省,优先于时区', () => {
    device('America/Toronto', 'en-CA')
    document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent('Alberta') + '; path=/'
    expect(homeProvPickOf({})).toBe('Alberta')
  })

  it('地址栏带了省或搜索词:不预选', () => {
    device('America/Toronto', 'en-CA')
    expect(homeProvPickOf({ fProv: 'Quebec' })).toBe('')
    expect(homeProvPickOf({ q: 'Parks Canada' })).toBe('')
    expect(homeProvPickOf({})).toBe('Ontario')
  })
})

describe('foldActiveNarrowOf', () => {
  it('金标:EE 没选 = 宽屏计数;选了 = 宽屏计数 + 1', () => {
    expect(foldActiveNarrowOf({ fState: stateOf({ fCity: 'Ottawa', fEe: '' }) })).toBe(1)
    expect(foldActiveNarrowOf({ fState: stateOf({ fCity: 'Ottawa', fEe: 'STEM' }) })).toBe(2)
    expect(foldActiveNarrowOf({ fState: stateOf({ fEe: 'STEM' }) })).toBe(1)
    expect(foldActiveNarrowOf({ fState: stateOf({}) })).toBe(0)
  })

  it('性质:窄屏 - 宽屏 ∈ {0, 1},且为 1 ⇔ EE 选了', () => {
    fc.assert(fc.property(fc.record({
      fCity: fc.constantFrom('', 'Ottawa'),
      fDistrict: fc.constantFrom('', 'Kanata'),
      fOrigin: fc.constantFrom('', 'jobbank'),
      fSource: fc.constantFrom('', 'indeed.com'),
      fEe: fc.constantFrom('', 'STEM', 'Trades'),
      fBroad: fc.constantFrom('', 'Tech'),
    }), (vals) => {
      const fState = stateOf(vals)
      const diff = foldActiveNarrowOf({ fState }) - foldActiveOf({ fState })
      expect(diff).toBe(vals.fEe !== '' ? 1 : 0)
    }), { numRuns: 300 })
  })
})

describe('Updated 窄屏短写档', () => {
  /** 取词桩:把「更新时间 {t}」拼成可断言的一句。 */
  function t(key: string, vars?: Record<string, string | number>): string {
    return key + ':' + String(vars == null ? '' : vars.t)
  }

  /** 挂一次组件,交回根节点。 */
  function mount(el: React.ReactElement): HTMLElement {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => {
      root.render(el)
    })
    return host
  }

  it('不传:只出写全那一句(与改前同形)', () => {
    const host = mount(React.createElement(Updated, { iso: '2026-09-26T16:57:00.000Z', t }))
    const div = host.firstElementChild
    expect(div?.children.length).toBe(0)
    expect(div?.textContent).toBe('updated:2026-09-26 12:57')
  })

  it('开了:两句同出 —— 写全一句、短写一句(当天只写时刻)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 8, 26, 18, 0))
    const host = mount(React.createElement(Updated, { iso: '2026-09-26T16:57:00.000Z', t, narrowShort: true }))
    const spans = Array.from(host.querySelectorAll('span')).map((s) => s.textContent)
    expect(spans).toEqual(['updated:2026-09-26 12:57', 'updated:12:57'])
  })

  it('开了、不是当天:短写那句写月-日', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 8, 28, 18, 0))
    const host = mount(React.createElement(Updated, { iso: '2026-09-26T16:57:00.000Z', t, narrowShort: true }))
    const spans = Array.from(host.querySelectorAll('span')).map((s) => s.textContent)
    expect(spans).toEqual(['updated:2026-09-26 12:57', 'updated:09-26 12:57'])
  })

  it('还没拿到时间(空串):整行不出', () => {
    const host = mount(React.createElement(Updated, { iso: '', t, narrowShort: true }))
    expect(host.firstElementChild).toBe(null)
  })
})
