// 首屏本省闸(components/jobs + lib/location;2026-09-26 /fe 首页 Frank「首屏整表替换」)。
// 来由:没带省的首屏 SSR 先渲全国 50 行、约 2 秒后按时区换本省,表行 / 卡片整体跳(CLS 手机 0.40、桌面 0.58)。
// 服务端不知道时区(只用时区、不记上次所选、不看 IP),于是一段首帧脚本在浏览器里判「这台设备会不会被预选出省」,
// 会就早于首帧绘制把全国过渡态压住;真正选哪一省仍归 homeProvinceOf。一门 JS 一门 TS 两份表述,必须不分叉。
// 性质:① 任意时区 × 浏览器语言:脚本插不插样式 ⇔ homeProvinceOf 预选得出省;② 脚本里没有能提前闭合 script 的串;
//       ③ 闸的初值:地址栏带省 / 带搜索词 → 放开,否则待定;④ applyHomeProvince 交回「预选了没」与它真写没写省格一致,
//       预选了闸落 on、没预选落 off。
// 2026-11-09 Frank「这个默认不要选 安省了,默认选全国」:不再按设备时区预选省,只有上次亲手选过具体省(cookie 那一格)才预选;
//       首帧脚本的判据随之从「时区在清单里」改成「带着那一格 cookie」。① 改验:任意时区 × 语言 × 选没选过,插样式 ⇔ 选过 ⇔ 预选。
// 探针:homeProvPickOf 加回按时区猜 → ①与金标红;脚本不看 cookie 恒插 → ①红。
import fc from 'fast-check'
import { afterEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { homeGateJsOf } from '@/lib/location'
import { HOME_GATE_CSS, PROV_PICK_COOKIE } from '@/components/jobs/constants'
import { applyHomeProvince, homeGateAfterOf, homeGateInitOf, homeGateScriptOf } from '@/components/jobs/functions'

const ZONES = [
  'America/Vancouver', 'America/Edmonton', 'America/Regina', 'America/Winnipeg', 'America/Toronto', 'America/Montreal',
  'America/St_Johns', 'America/Halifax', 'America/Moncton', 'America/Whitehorse', 'America/New_York',
  'America/Los_Angeles', 'Asia/Shanghai', 'Asia/Seoul', 'Europe/London', 'UTC', '',
]
const LANGS = ['en-US', 'en-CA', 'fr-CA', 'fr', 'zh-CN', 'ko-KR']

function device(tz: string, lang: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockReturnValue({ timeZone: tz } as Intl.ResolvedDateTimeFormatOptions)
  Object.defineProperty(window.navigator, 'language', { value: lang, configurable: true })
}

function runGate(css: string): string[] {
  for (const s of Array.from(document.head.querySelectorAll('style'))) {
    s.remove()
  }
  new Function(homeGateJsOf({ css, cookie: PROV_PICK_COOKIE }))()
  return Array.from(document.head.querySelectorAll('style')).map((s) => s.textContent ?? '')
}

function slots(initialProv: string) {
  const seen: string[] = []
  return {
    seen,
    fState: {
      fProv: { v: initialProv, set: (v: string) => { seen.push(v) } },
      q: { v: '', set: () => undefined },
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const s of Array.from(document.head.querySelectorAll('style'))) {
    s.remove()
  }
  document.cookie = PROV_PICK_COOKIE + '=; max-age=0; path=/'
})

describe('首帧脚本 ⇔ 上次亲手选过省(2026-11-09 起不再按时区预选)', () => {
  it('任意时区 × 浏览器语言 × 选没选过省:插不插样式 ⇔ 选过;进板预选 ⇔ 选过,与时区无关', () => {
    fc.assert(fc.property(fc.constantFrom(...ZONES), fc.constantFrom(...LANGS), fc.constantFrom('', 'Alberta', 'Ontario'),
      (tz, lang, picked) => {
        device(tz, lang)
        document.cookie = PROV_PICK_COOKIE + '=; max-age=0; path=/'
        if (picked !== '') {
          document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent(picked) + '; path=/'
        }
        const styles = runGate(HOME_GATE_CSS)
        expect(styles.length === 1).toBe(picked !== '')
        if (styles.length === 1) {
          expect(styles[0]).toBe(HOME_GATE_CSS)
        }
        const s = slots('')
        expect(applyHomeProvince({ fState: s.fState, initial: {} })).toBe(picked !== '')
        if (picked !== '') {
          expect(s.seen).toEqual([picked])
        }
        vi.restoreAllMocks()
      }), { numRuns: 400 })
  })

  it('金标:安省设备没选过省 → 不插样式、不预选(默认全国);选过阿尔伯塔 → 插、预选阿尔伯塔', () => {
    device('America/Toronto', 'en-CA')
    expect(runGate(HOME_GATE_CSS)).toEqual([])
    const none = slots('')
    expect(applyHomeProvince({ fState: none.fState, initial: {} })).toBe(false)
    expect(none.seen).toEqual([])
    document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent('Alberta') + '; path=/'
    expect(runGate(HOME_GATE_CSS)).toEqual([HOME_GATE_CSS])
  })

  it('脚本内联进 HTML 安全:没有能提前闭合 script 的串', () => {
    const js = homeGateScriptOf()
    expect(js).not.toMatch(/<\/?script/i)
    expect(js).not.toContain('</')
    expect(js).toContain(JSON.stringify(HOME_GATE_CSS))
  })
})

describe('闸的初值与水合后的去向', () => {
  it('地址栏带省或搜索词 → 放开;否则待定', () => {
    expect(homeGateInitOf({})).toBe('maybe')
    expect(homeGateInitOf({ fProv: 'Ontario' })).toBe('off')
    expect(homeGateInitOf({ q: 'Parks Canada' })).toBe('off')
    expect(homeGateInitOf({ fBroad: 'IT' })).toBe('maybe')
    expect(homeGateInitOf({ fProv: '', q: '' })).toBe('maybe')
  })

  it('applyHomeProvince 交回「预选了没」⇔ 真写了省格;预选了闸落 on、没预选落 off', () => {
    fc.assert(fc.property(fc.constantFrom(...ZONES), fc.constantFrom(...LANGS),
      fc.constantFrom('', 'British Columbia'), fc.constantFrom('', 'acme'), (tz, lang, prov, q) => {
        device(tz, lang)
        const s = slots(prov)
        const initial: Record<string, string> = {}
        if (prov !== '') {
          initial.fProv = prov
        }
        if (q !== '') {
          initial.q = q
        }
        const did = applyHomeProvince({ fState: s.fState, initial })
        expect(did).toBe(s.seen.length > 0)
        expect(homeGateAfterOf(did)).toBe(did ? 'on' : 'off')
        if (homeGateInitOf(initial) === 'off') {
          expect(did).toBe(false)
        }
        vi.restoreAllMocks()
      }), { numRuns: 400 })
  })

  it('上次亲手选过省(cookie 那一格)照旧预选,交回 true', () => {
    device('Asia/Shanghai', 'zh-CN')
    document.cookie = PROV_PICK_COOKIE + '=' + encodeURIComponent('Alberta') + '; path=/'
    const s = slots('')
    expect(applyHomeProvince({ fState: s.fState, initial: {} })).toBe(true)
    expect(s.seen).toEqual(['Alberta'])
  })
})
