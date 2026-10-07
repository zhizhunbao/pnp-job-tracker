// 访客四题 A2(2026-10-04 Frank「改」,设计稿 docs/design/付费闭环-20261003.md「10-04 四道题改版与 A2 专业改判」):
// 第 2 题 = 热门具体专业 + 搜索全部 CIP 2021 专业(单选,存 class 码);第 3 题 = 选职业控件 OccPicker 按专业取热门;
// 注册完人在职位板上按答案换地址栏筛。
// 性质:① 专业名按界面语言挑,没译成(null / 空串)回退英文;非中韩界面一律英文;
//       ② 起搜:含中日韩字 1 个字起、其余 2 个字起;搜索停手 300ms 才发、换词作废上一发、结果最多 20;
//       ③ 热门 → 点选 → 报 class 码,整机草稿存的就是这个码(读回过得了码形校验);选中的不在热门里排到最前,
//          跳过清掉后不再摆;草稿带来的热门外的码按码查回来回显;
//       ④ OccPicker 给了专业码:热门那一屏只取 /api/quiz?major=<码>&n=24(不取全站榜、不补内置清单的在招数),
//          没给照旧 ?top=24;取的路上不摆内置清单(整排骨架),取回空的退回内置清单;
//       ⑤ 回职位板的地址:只在 / 上、由头是进站 / 点开职位才换;境外不带省;有职业带 noc(逗号连)不带 broad;
//          没职业带该专业的第一个大类(先按码取);一个参数都拼不出不换。
// 探针:isMajorQuery 去掉中日韩分支 → ②「一个汉字起搜」红;MAJOR_DEBOUNCE_MS 改 0 → ②「299ms 不发」红;
//       topUrlOf 恒回 ?top=24 → ④红;gateBoardUrlOf 去掉 abroad 判 → ⑤「境外不带省」红;nocs 非空仍带 broad → ⑤ 性质红。
// 同日收口:⑤ 由头只剩进站(点开职位撤:板子按 key 重挂会卸掉刚亮出的职位弹框);⑥ 大号档按专业取的热门还在路上时
//       不挂已选标签(热门一到再一次成型,最上面一行不跳),没给专业码照常挂;⑦ 专业搜索结果只在检索词够起搜时摆。
//       探针:BOARD_INTENTS 加回 job → ⑤「点开职位不换」红;OccTags 去掉 hold 判 → ⑥红;majorHitsOf 恒回 hits → ⑦红。
// 同日收口审查:⑦ 在途也摆空(那一排换占位);⑧ 专业搜索的在途标:够起搜的词一落下就起(防抖等待算在内)、结果到了落、
//       不够起搜落;⑨ 回职位板在现有地址上改:设了省撤市 / 区 / 国家,设了职业撤大类 / 中 / 小分类,设了大类撤职业 / 中 / 小分类,
//       其余参数原样留着;答案拼不出一格照旧不换(现有地址上的参数不算)。
//       探针:majorHitsOf 去掉 searching 判 → ⑦「在途摆空」红;fetchMajorHits 不落在途 → ⑧红;
//       gateBoardUrlOf 换回从空串起拼 → ⑨「其余参数原样留着」红;PROV_DROP_PARAMS 清空 → ⑨「设了省撤市」红。
//       ⑩ 选职业控件大号档:占位提示短 occ.ph、不出计数行、搜索在途摆大号占位;常规档照旧(quiz.q2ph、省略号行)。
// 2026-10-05 专业题的选择器拆出立 components/majors 桶:① ② ③ ⑦ ⑧ 与专业题机器那几条(选择器自己的性质)迁去
//       tests/int/majorPicker.int.spec.ts;本文件留访客门这边的 ④ ⑤ ⑥ ⑨ ⑩(选职业控件按专业取热门、回职位板)与整机草稿那条;
//       原 tests/int/gateMajorRail.int.spec.ts 的 ④「整机走一遍」(访客向导整机)挪来本文件。
//       同日专业改多选:草稿 / 整机的专业格换成码清单 majors;⑤ 回职位板没职业时带第一个专业的第一个大类(职位板 broad 只收单值);
//       ⑮ 第 3 题选职业控件的专业码递逗号连的清单(occMajorOf),取榜地址 ?major=<码,码>&n=24。
//       探针:gateBoardGo 改取最后一个专业 → ⑤「第一个专业」红;occMajorOf 换分隔符 → ⑮红。
// 2026-10-05 第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」;两栏本身的性质在 occPicker.int.spec.ts):
//       ④ 取的路上从「整排 24 颗占位」改成右边那块摆加载中那一行;⑥ 改判 —— 已选一行摆全部已选,取的路上也摆(名字没到摆占位条、不甩码),
//       上面「热门一到再一次成型」与探针「OccTags 去掉 hold 判 → ⑥红」作废(新探针:OccTags 名字没到改回甩码 → ⑥「不甩码」红);
//       ⑩ 大号档搜索在途从「一小排大号占位」改成加载中那一行,两栏整块收起。
import fc from 'fast-check'
import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { GateWizard } from '@/components/gate'
import { gateBoardGo, makeGateDone, occMajorOf } from '@/components/gate/functions'
import { useGateWizard } from '@/components/gate/hooks'
import type { GateDraft } from '@/components/gate/types'
import { useMajorPicker } from '@/components/majors'
import type { MajorRow } from '@/components/majors/types'
import { OccPicker } from '@/components/quiz'
import { topUrlOf } from '@/components/quiz/functions'
import { readGateDraft } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import type { TFn } from '@/lib/i18n'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace }),
  usePathname: () => PATH.current,
}))

function row(code: string, en: string, zh: string | null = null, ko: string | null = null, broads: string[] = []): MajorRow {
  return { code, titleEn: en, titleEnShort: '', titleZh: zh, titleKo: ko, broads }
}

const HOT: MajorRow[] = [
  row('52.0201', 'Business Administration and Management, General.', '工商管理', '경영학', ['商务', '高管']),
  row('11.0701', 'Computer Science.', '计算机科学', '컴퓨터 과학', ['IT']),
  row('51.3801', 'Registered Nursing/Registered Nurse.', '注册护士', null, ['医疗']),
]

// 多选的几种专业组合:没选 / 一个 / 两个(第一个有大类)/ 两个(第一个查无此码)—— 回职位板只看第一个
const MAJOR_SETS: string[][] = [[], ['52.0201'], ['11.0701', '52.0201'], ['14.0901', '52.0201']]

function draft(p: Partial<GateDraft> = {}): GateDraft {
  return { goal: 0, majors: [], nocs: [], prov: '', abroad: false, intent: 'entry', ...p }
}

function reply(body: object) {
  return { status: 200, ok: true, json: async () => body }
}

// 按地址分发的假接口:热门 / 搜索 / 按码三支 + 其余(埋点、quiz 取榜)一律空对象;记下每次请求的地址
function majorsApi(byCode: Record<string, MajorRow> = {}, hits: MajorRow[] = []) {
  const urls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(String(url))
    if (url === '/api/majors?top=1') {
      return reply({ majors: HOT })
    }
    if (url.startsWith('/api/majors?q=')) {
      return reply({ majors: hits })
    }
    if (url.startsWith('/api/majors?code=')) {
      const code = decodeURIComponent(url.slice('/api/majors?code='.length))
      return reply({ major: byCode[code] ?? null })
    }
    return reply({})
  }))
  return urls
}

// 挂一个只跑 hook 的探针件(同 guestGate 的 createRoot 形;@testing-library 没装,不为测试加依赖)
function runHook<T>(hook: () => T): { current: T | null } {
  const out: { current: T | null } = { current: null }
  function Probe() {
    out.current = hook()
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    root.render(createElement(Probe))
  })
  return out
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  GUEST.signedIn = false
  PATH.current = '/'
  ROUTER.replace.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('整机与选择器接线(2026-10-05 选择器搬家后)', () => {
  it('整机:点热门里的专业 → 草稿存的就是 class 码清单,读回过得了码形校验;再点一个追加、再点第一个摘掉', async () => {
    majorsApi()
    const g = runHook(() => {
      const w = useGateWizard({ intent: 'entry', onDone: () => undefined, onClose: () => undefined, t: (k: string) => k })
      return { w, m: useMajorPicker({ value: w.majors, onChange: w.onMajors }) }
    })
    await vi.waitFor(() => expect(g.current?.m.hotLoaded).toBe(true))
    act(() => g.current?.m.pickOf(HOT[0] as MajorRow)())
    expect(g.current?.w.majors).toEqual(['52.0201'])
    expect(readGateDraft()?.majors).toEqual(['52.0201'])
    act(() => g.current?.m.pickOf(HOT[1] as MajorRow)())
    expect(readGateDraft()?.majors).toEqual(['52.0201', '11.0701'])
    act(() => g.current?.m.pickOf(HOT[0] as MajorRow)())
    expect(g.current?.w.majors).toEqual(['11.0701'])
    expect(readGateDraft()?.majors).toEqual(['11.0701'])
  })

  it('⑮ 第 3 题选职业控件的专业码:码清单逗号连;没选 = 空串;取榜地址带上整串', () => {
    expect(occMajorOf(['52.0203', '11.0701'])).toBe('52.0203,11.0701')
    expect(occMajorOf([])).toBe('')
    expect(topUrlOf({ majorCode: occMajorOf(['52.0203', '11.0701']) }))
      .toBe('/api/quiz?major=' + encodeURIComponent('52.0203,11.0701') + '&n=24')
  })
})

describe('选职业控件按专业取热门(OccPicker majorCode)', () => {
  const t = ((key: string) => key) as TFn

  async function mount(majorCode: string | null, initial: string[] = []) {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      urls.push(String(url))
      return new Promise(() => {})
    }))
    const container = document.createElement('div')
    const root = createRoot(container)
    const props = { t, lang: 'en', initial, inline: true, lg: true, onDone: vi.fn() }
    await act(async () => {
      root.render(React.createElement(OccPicker, majorCode == null ? props : { ...props, majorCode }))
    })
    return { urls, container, root }
  }

  it('取榜地址金标:给码 = ?major=<码>&n=24;没给 / 空串 = ?top=24', () => {
    expect(topUrlOf({ majorCode: '52.0203' })).toBe('/api/quiz?major=52.0203&n=24')
    expect(topUrlOf({ majorCode: '' })).toBe('/api/quiz?top=24')
  })

  // 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):路上不再是 24 颗大号胶囊占位,改成右边那块摆加载中那一行;
  // ⑥ 改判 —— 已选一行摆全部已选(不再「热门到了才挂」),名字没到摆占位条、不甩码。
  it('给了专业码:只取按专业那一份(不取全站榜、不补内置清单的在招数);路上右边摆加载中、不摆内置清单', async () => {
    const m = await mount('52.0203')
    expect(m.urls).toContain('/api/quiz?major=52.0203&n=24')
    expect(m.urls.some((u) => u.includes('?top=') || u.includes('?counts='))).toBe(false)
    expect(m.container.querySelectorAll('button[aria-pressed]').length).toBe(0)
    expect(m.container.querySelector('[role="tabpanel"]')?.textContent).toBe('act.loadingText')
    await act(async () => m.root.unmount())
  })

  it('⑥ 已选一行摆全部已选:按专业取的还在路上也摆(名字没到摆占位条,不甩码);没给专业码同样摆', async () => {
    for (const code of ['52.0203', null]) {
      const m = await mount(code, ['99999'])
      expect(m.container.querySelectorAll('button[aria-label="ob.tagDel"]')).toHaveLength(1)
      expect(m.container.textContent).not.toContain('99999')
      await act(async () => m.root.unmount())
    }
  })

  it('没给专业码:照旧取全站热门榜 ?top=24', async () => {
    const m = await mount(null)
    expect(m.urls).toContain('/api/quiz?top=24')
    expect(m.urls.some((u) => u.includes('?major='))).toBe(false)
    await act(async () => m.root.unmount())
  })
})

describe('选职业控件大号档的搜索框与结果区(收口审查)', () => {
  const t = ((key: string, vars?: Record<string, string | number>) => key + (vars == null ? '' : JSON.stringify(vars))) as TFn

  async function mount(lg: boolean) {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(OccPicker, { t, lang: 'en', initial: [], inline: true, lg, onDone: vi.fn() }))
    })
    const input = container.querySelector('input') as HTMLInputElement
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setValue?.call(input, 'accountant')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    return { container, root, input }
  }

  // 2026-10-05 大号档改左右两栏(「也改成左右 两部分吗?」「改啊」):在途不再摆一小排大号胶囊占位,改摆加载中那一行(同第 2 题)
  it('大号档:占位提示是短的 occ.ph;搜索在途不出计数 / 省略号那一行,摆加载中那一行(在礼让播报区里),两栏整块收起', async () => {
    const m = await mount(true)
    expect(m.input.placeholder).toBe('occ.ph')
    const live = m.container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(live).not.toBeNull()
    expect(live.querySelector('.occResultsHead')).toBeNull()
    expect(live.textContent).toBe('act.loadingText')
    expect(m.container.querySelector('[role="tablist"]')).toBeNull()
    await act(async () => m.root.unmount())
  })

  it('常规档(职位板 / 详情页 / 决策页)一字不变:占位提示 quiz.q2ph;在途出省略号那一行,不摆大号占位', async () => {
    const m = await mount(false)
    expect(m.input.placeholder).toBe('quiz.q2ph')
    const head = m.container.querySelector('.occResultsHead') as HTMLElement
    expect(head.textContent).toBe('…')
    expect(m.container.querySelector('[aria-live="polite"] [aria-busy="true"]')).toBeNull()
    await act(async () => m.root.unmount())
  })
})

describe('注册完回职位板按答案筛 gateBoardGo', () => {
  async function go(d: GateDraft, path = '/', search = '') {
    const replace = vi.fn()
    await gateBoardGo({ draft: d, path, search, replace })
    return replace
  }

  it('金标:省 + 职业;境外不带省;没职业带专业的第一个大类;什么都没答不换', async () => {
    majorsApi({ '52.0201': HOT[0] as MajorRow })
    expect((await go(draft({ prov: 'ON', nocs: ['21232', '21231'] }))).mock.calls).toEqual([['/?prov=ON&noc=21232%2C21231']])
    expect((await go(draft({ prov: 'ON', abroad: true, nocs: ['21232'] }))).mock.calls).toEqual([['/?noc=21232']])
    expect((await go(draft({ prov: 'BC', majors: ['52.0201'] }))).mock.calls)
      .toEqual([['/?prov=BC&broad=' + encodeURIComponent('商务')]])
    expect((await go(draft({ prov: 'BC', majors: ['52.0201', '11.0701'] }))).mock.calls)
      .toEqual([['/?prov=BC&broad=' + encodeURIComponent('商务')]])
    expect((await go(draft({ majors: ['52.0201'], nocs: ['11100'] }))).mock.calls).toEqual([['/?noc=11100']])
    expect((await go(draft())).mock.calls).toEqual([])
  })

  it('由头点开职位 / 投递 / 收藏不换;不在职位板上不换;专业查无此码 / 没大类就只带省', async () => {
    majorsApi({ '99.9999': row('99.9999', 'No broads.') })
    for (const intent of ['apply', 'save'] as const) {
      expect((await go(draft({ intent, prov: 'ON', nocs: ['21232'] }))).mock.calls).toEqual([])
    }
    expect((await go(draft({ intent: 'job', prov: 'ON', nocs: ['21232'] }), '/jobs/12')).mock.calls).toEqual([])
    expect((await go(draft({ intent: 'job', prov: 'ON', nocs: ['21232'] }))).mock.calls).toEqual([])
    expect((await go(draft({ intent: 'entry', prov: 'ON', nocs: ['21232'] }))).mock.calls).toEqual([['/?prov=ON&noc=21232']])
    expect((await go(draft({ prov: 'QC', majors: ['99.9999'] }))).mock.calls).toEqual([['/?prov=QC']])
    expect((await go(draft({ prov: 'QC', majors: ['14.0901'] }))).mock.calls).toEqual([['/?prov=QC']])
  })

  it('任意草稿:换就只换到 /?;境外 ⇒ 无 prov;有职业 ⇒ noc = 逗号连且无 broad;没职业也没专业 ⇒ 无 noc 无 broad', async () => {
    majorsApi({ '52.0201': HOT[0] as MajorRow, '11.0701': HOT[1] as MajorRow })
    const prov = fc.constantFrom('', 'ON', 'QC', 'BC', 'NS')
    const noc = fc.stringMatching(/^\d{5}$/)
    const firstBroad: Record<string, string> = { '52.0201': '商务', '11.0701': 'IT' }
    await fc.assert(fc.asyncProperty(
      prov, fc.boolean(), fc.uniqueArray(noc, { maxLength: 3 }), fc.constantFrom<string[]>(...MAJOR_SETS),
      async (p, abroad, nocs, majors) => {
        const calls = (await go(draft({ prov: p, abroad, nocs, majors }))).mock.calls
        const broad = firstBroad[majors[0] ?? ''] ?? ''
        if (calls.length === 0) {
          expect(p === '' || abroad).toBe(true)
          expect(nocs.length).toBe(0)
          expect(broad).toBe('')
          return
        }
        const href = String(calls[0]?.[0])
        expect(href.startsWith('/?')).toBe(true)
        const sp = new URLSearchParams(href.slice(2))
        expect(sp.has('prov')).toBe(abroad === false && p !== '')
        if (nocs.length > 0) {
          expect(sp.get('noc')).toBe(nocs.join(','))
          expect(sp.has('broad')).toBe(false)
        } else {
          expect(sp.has('noc')).toBe(false)
          expect(sp.get('broad') ?? '').toBe(broad)
        }
      },
    ), { numRuns: 60 })
  })

  it('在现有地址上改(收口审查)金标:关键词 / 排序留着;设了省撤市 / 区 / 国家;设了职业撤分类三级;设了大类撤职业与中 / 小分类', async () => {
    majorsApi({ '52.0201': HOT[0] as MajorRow })
    const href = async (d: GateDraft, search: string) => String((await go(d, '/', search)).mock.calls[0]?.[0])
    expect(await href(draft({ prov: 'ON', nocs: ['21232'] }), '?q=cook&city=Toronto&dist=Kanata&country=CA&sort=salary'))
      .toBe('/?q=cook&sort=salary&prov=ON&noc=21232')
    expect(await href(draft({ nocs: ['21232'] }), '?prov=BC&broad=IT&mid=x&fine=y&page=2'))
      .toBe('/?prov=BC&page=2&noc=21232')
    expect(await href(draft({ majors: ['52.0201'] }), '?noc=11100&mid=x&fine=y&q=cook'))
      .toBe('/?q=cook&broad=' + encodeURIComponent('商务'))
    expect(await href(draft({ prov: 'NS' }), '?prov=Ontario&noc=11100'))
      .toBe('/?prov=NS&noc=11100')
    expect((await go(draft({ abroad: true }), '/', '?q=cook&prov=ON')).mock.calls).toEqual([])
  })

  it('任意现有地址 × 任意草稿(收口审查):答案管不着的参数原样留着;答案那几格按草稿;打架的撤掉;拼不出一格不换', async () => {
    majorsApi({ '52.0201': HOT[0] as MajorRow })
    const keys = fc.constantFrom('q', 'sort', 'page', 'src', 'teer', 'city', 'dist', 'country', 'mid', 'fine', 'prov', 'noc', 'broad')
    const val = fc.stringMatching(/^[a-z0-9]{1,6}$/)
    const prov = fc.constantFrom('', 'ON', 'QC')
    const noc = fc.stringMatching(/^\d{5}$/)
    await fc.assert(fc.asyncProperty(
      fc.uniqueArray(fc.tuple(keys, val), { maxLength: 6, selector: (kv) => kv[0] }),
      prov, fc.boolean(), fc.uniqueArray(noc, { maxLength: 2 }), fc.constantFrom<string[]>([], ['52.0201']),
      async (pairs, p, abroad, nocs, majors) => {
        const before = new URLSearchParams(pairs)
        const calls = (await go(draft({ prov: p, abroad, nocs, majors }), '/', '?' + before.toString())).mock.calls
        const setsProv = abroad === false && p !== ''
        const setsNoc = nocs.length > 0
        const setsBroad = setsNoc === false && majors.length > 0
        if (setsProv === false && setsNoc === false && setsBroad === false) {
          expect(calls).toEqual([])
          return
        }
        const sp = new URLSearchParams(String(calls[0]?.[0]).slice(2))
        const dropped = new Set<string>()
        if (setsProv) {
          ['city', 'dist', 'country'].forEach((k) => dropped.add(k))
          expect(sp.get('prov')).toBe(p)
        }
        if (setsNoc) {
          ['broad', 'mid', 'fine'].forEach((k) => dropped.add(k))
          expect(sp.get('noc')).toBe(nocs.join(','))
        }
        if (setsBroad) {
          ['noc', 'mid', 'fine'].forEach((k) => dropped.add(k))
          expect(sp.get('broad')).toBe('商务')
        }
        for (const k of dropped) {
          expect(sp.has(k), k).toBe(false)
        }
        for (const [k, v] of pairs) {
          const owned = (k === 'prov' && setsProv) || (k === 'noc' && setsNoc) || (k === 'broad' && setsBroad)
          if (owned === false && dropped.has(k) === false) {
            expect(sp.get(k), k).toBe(v)
          }
        }
      },
    ), { numRuns: 80 })
  })

  it('邮箱注册当场(makeGateDone):先交还调用方,再按内存草稿换地址栏', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ answers: null })))
    const order: string[] = []
    const replace = vi.fn(() => order.push('replace'))
    const done = makeGateDone({
      draft: draft({ prov: 'NB', nocs: ['63200'] }), onDone: () => order.push('done'), path: '/', replace,
    })
    done()
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/?prov=NB&noc=63200'))
    expect(order).toEqual(['done', 'replace'])
  })

  it('邮箱注册当场(收口审查):在这一页现有的地址上改 —— 分享链接带来的关键词留着,市随设省撤掉', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ answers: null })))
    window.history.replaceState(null, '', '/?q=cook&city=Toronto')
    const replace = vi.fn()
    makeGateDone({ draft: draft({ prov: 'NB', nocs: ['63200'] }), onDone: () => undefined, path: '/', replace })()
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/?q=cook&prov=NB&noc=63200'))
    window.history.replaceState(null, '', '/')
  })
})

// 原 gateMajorRail ④ 的假接口(热门一个、大类两个、财会金融一棵树;其余空 / 答案档空)
const RAIL_CATS = [
  { key: 'biz', titleEn: 'Business', titleZh: '商科', titleKo: '경영' },
  { key: 'fin', titleEn: 'Finance', titleZh: '财会金融', titleKo: null },
]

const RAIL_FIN = {
  groups: [
    { key: '52.03', titleEn: 'Accounting', titleZh: '会计类', titleKo: '회계', majors: [
      { code: '52.0301', titleEn: 'Accounting', titleEnShort: 'Accounting', titleZh: '会计', titleKo: '회계학', broads: [] },
      { code: '52.0302', titleEn: 'Accounting technology/technician and bookkeeping',
        titleEnShort: 'Accounting technology and bookkeeping', titleZh: '会计技术与簿记', titleKo: null, broads: [] },
    ] },
    { key: '52.08', titleEn: 'Finance', titleZh: '金融类', titleKo: null, majors: [
      { code: '52.0801', titleEn: 'Finance, general', titleEnShort: 'Finance', titleZh: '金融', titleKo: null, broads: [] },
      { code: '52.0803', titleEn: 'Banking and financial support services', titleEnShort: 'Banking', titleZh: '银行',
        titleKo: null, broads: [] },
    ] },
  ],
  singles: [
    { code: '52.1601', titleEn: 'Taxation', titleEnShort: '', titleZh: '税务', titleKo: null, broads: [] },
  ],
}

function railApi() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/majors?top=1') {
      return reply({ majors: [{ code: '52.0201', titleEn: 'Business administration and management, general',
        titleEnShort: 'Business administration', titleZh: '工商管理', titleKo: null, broads: [], popular: 1 }] })
    }
    if (url === '/api/majors?cats=1') {
      return reply({ cats: RAIL_CATS })
    }
    if (url === '/api/majors?cat=fin') {
      return reply(RAIL_FIN)
    }
    if (url.startsWith('/api/majors?cat=')) {
      return reply({ groups: [], singles: [] })
    }
    return reply({ answers: null })
  }))
}

describe('④ 整机走一遍(原 gateMajorRail ④,2026-10-05 随选择器搬家挪来;同日多选)', () => {
  it('左栏竖排 tablist(界面中文);点大类出专业类白卡(头行 aria-expanded + 个数);点开、点专业 → 选中、下一步亮;'
    + '再点一个两个都亮、已选一行两枚;再点第一个摘掉', async () => {
    railApi()
    const tk = ((key: string, vars?: Record<string, string | number>) => key + (vars == null ? '' : JSON.stringify(vars))) as TFn
    vi.stubGlobal('matchMedia', () => ({
      matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined,
    }))
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(GateWizard, { t: tk, intent: 'entry', onClose: () => undefined, onDone: () => undefined }))
    })
    act(() => (host.querySelector('button[aria-pressed]') as HTMLButtonElement).click())
    const list = host.querySelector('[role="tablist"][aria-orientation="vertical"]') as HTMLElement
    expect(list).not.toBeNull()
    await vi.waitFor(() => expect(list.querySelectorAll('[role="tab"]').length).toBe(3))
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'))
    expect(tabs.map((b) => b.textContent)).toEqual(['gate.hot', '商科', '财会金融'])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    const fin = tabs.find((b) => b.textContent === '财会金融') as HTMLButtonElement
    act(() => fin.click())
    await vi.waitFor(() => expect(host.querySelectorAll('button[aria-expanded]').length).toBe(2))
    const heads = Array.from(host.querySelectorAll('button[aria-expanded]'))
    expect(heads[0]?.textContent).toContain('gate.majorN{"n":2}')
    expect(heads[0]?.getAttribute('aria-expanded')).toBe('false')
    const next = () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'ob.next') as HTMLButtonElement
    expect(next().disabled).toBe(true)
    act(() => (heads[0] as HTMLButtonElement).click())
    expect(host.querySelector('button[aria-expanded="true"]')).not.toBeNull()
    const lineOf = (label: string) =>
      Array.from(host.querySelectorAll('button[aria-pressed]')).find((b) => b.textContent === label) as HTMLButtonElement
    act(() => lineOf('会计').click())
    expect(lineOf('会计').getAttribute('aria-pressed')).toBe('true')
    expect(next().disabled).toBe(false)
    act(() => lineOf('会计技术与簿记').click())
    expect(lineOf('会计').getAttribute('aria-pressed')).toBe('true')
    expect(lineOf('会计技术与簿记').getAttribute('aria-pressed')).toBe('true')
    const delsNow = () => Array.from(host.querySelectorAll('button[aria-label^="ob.tagDel"]'))
    expect(delsNow().map((b) => b.getAttribute('aria-label')))
      .toEqual(['ob.tagDel{"name":"会计"}', 'ob.tagDel{"name":"会计技术与簿记"}'])
    expect(readGateDraft()?.majors).toEqual(['52.0301', '52.0302'])
    act(() => lineOf('会计').click())
    expect(lineOf('会计').getAttribute('aria-pressed')).toBe('false')
    expect(readGateDraft()?.majors).toEqual(['52.0302'])
    expect(next().disabled).toBe(false)
    act(() => root.unmount())
    host.remove()
  })
})

// 2026-10-05 第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」):访客向导整机走到第 3 题 ——
// 左栏 推荐 + 全站大类;点一行 → 下一步亮、已选一行一颗;× 摘掉 → 下一步回灰。两栏本身的性质见 occPicker.int.spec.ts。
const Q3_TOP = [
  { noc: '21232', title: 'Software developers and programmers', titleZh: '软件开发人员和程序员', titleZhShort: '软件开发',
    titleEnShort: 'Software developers', open: 22 },
  { noc: '22220', title: 'Computer network and web technicians', titleZh: '计算机网络和网站技术员', titleZhShort: '网络技术员',
    titleEnShort: 'Network technicians', open: 12 },
]

describe('第 3 题整机走一遍(2026-10-05 改左右两栏)', () => {
  it('第 2 题选一个专业 → 下一步 → 第 3 题左栏 推荐 + 大类、右边按专业取的职业;点一行下一步亮、已选一颗;× 摘掉下一步回灰', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/majors?top=1') {
        return reply({ majors: [HOT[1]] })
      }
      if (url === '/api/majors?cats=1') {
        return reply({ cats: RAIL_CATS })
      }
      if (url.startsWith('/api/quiz?major=')) {
        return reply({ top: Q3_TOP })
      }
      return reply({ answers: null })
    }))
    const tk = ((key: string, vars?: Record<string, string | number>) => key + (vars == null ? '' : JSON.stringify(vars))) as TFn
    vi.stubGlobal('matchMedia', () => ({
      matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined,
    }))
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(createElement(GateWizard, { t: tk, intent: 'entry', onClose: () => undefined, onDone: () => undefined }))
    })
    await act(async () => (host.querySelector('button[aria-pressed]') as HTMLButtonElement).click())
    const lineOf = (label: string) =>
      Array.from(host.querySelectorAll('button[aria-pressed]')).find((b) => b.textContent === label) as HTMLButtonElement
    expect(lineOf('计算机科学')).not.toBeUndefined()
    act(() => lineOf('计算机科学').click())
    const next = () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'ob.next') as HTMLButtonElement
    await act(async () => next().click())
    expect(host.querySelector('[tabindex="-1"]')?.textContent).toBe('prof.noc')
    const tabs = () => Array.from(host.querySelectorAll('[role="tablist"][aria-orientation="vertical"] [role="tab"]'))
    expect(tabs().map((b) => b.textContent)[0]).toBe('occ.cat.rec')
    expect(tabs()).toHaveLength(24)
    expect(lineOf('软件开发')).not.toBeUndefined()
    expect(next().disabled).toBe(true)
    act(() => lineOf('软件开发').click())
    expect(lineOf('软件开发').getAttribute('aria-pressed')).toBe('true')
    expect(next().disabled).toBe(false)
    const dels = () => Array.from(host.querySelectorAll('button[aria-label^="ob.tagDel"]')) as HTMLButtonElement[]
    expect(dels().map((b) => b.getAttribute('aria-label'))).toEqual(['ob.tagDel{"name":"软件开发"}'])
    act(() => dels()[0]?.click())
    expect(dels()).toHaveLength(0)
    expect(lineOf('软件开发').getAttribute('aria-pressed')).toBe('false')
    expect(next().disabled).toBe(true)
    act(() => root.unmount())
    host.remove()
  })
})
