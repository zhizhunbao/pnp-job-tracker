// 专业选择器(components/majors;2026-10-05 自 gate 桶拆出立域,原 tests/int/gateMajors.int.spec.ts 的选择器半整段迁来):
// 访客第 2 题「你学的是什么专业?」= 搜索框 + 左栏 热门 / 16 大类 + 专业类白卡,在搜时单列结果。
// 迁来的性质(原样):① 专业名按界面语言挑,没译成(null / 空串)回退英文;非中韩界面一律英文;
//       ② 起搜:含中日韩字 1 个字起、其余 2 个字起;搜索停手 300ms 才发、换词作废上一发、结果最多 20;
//       ③ 热门 → 点选 → 报 class 码;选中的不在热门里排到最前,摘掉后不再摆;草稿带来的热门外的码按码查回来回显;
//       ⑦ 专业搜索结果只在检索词够起搜时摆,在途也摆空;⑧ 搜索在途标:够起搜的词一落下就起(防抖等待算在内)、结果到了落、
//       不够起搜落。
// 2026-10-05 多选(Frank「现在点了专业没法取消,而且不能选多个吗」「在哪里显示已选的专业呢」)新增的性质:
//       ⑪ 点没选的 = 追加在尾(清搜索框),点选中的 = 摘掉(保序,搜索框不动);至多 3 个,满了没选的点不动;
//       ⑫ 选满 3 个:没选的行一律 disabled(读屏报不可用),选中的照常可点;摘掉一个,全部恢复;
//       ⑬ 已选一行(搜索框下面;同日「放到搜索框下面吧」):摆全部已选(名字与行里同一把),× 的读屏名「移除 {名字}」,点 × 只摘那一个;
//       ⑭ 草稿带来的几个热门外的码一次查回(只查热门里没有的),热门那一排把它们按选的先后序排到最前,已选一行补上名字。
// 探针:isMajorOff 去掉「不是选中的」那半 → ⑫「选中的照常可点」红;makeMajorPickOf 去掉摘选分支 → ⑪「点选中的 = 摘掉」红;
//       pickedRowsOf 不按 codes 序 → ⑬ 金标红;missingCodesOf 不排除热门 → ⑭「只查热门里没有的」红。
import fc from 'fast-check'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { MajorPicker, useMajorPicker } from '@/components/majors'
import {
  isMajorOff, isMajorQuery, majorHitsOf, majorNameOf, majorTopOf, makeMajorPickOf, missingCodesOf, pickedRowsOf,
} from '@/components/majors/functions'
import type { MajorPickerPanel, MajorRow } from '@/components/majors/types'
import type { TFn } from '@/lib/i18n'

function row(code: string, en: string, zh: string | null = null, ko: string | null = null, broads: string[] = []): MajorRow {
  return { code, titleEn: en, titleEnShort: '', titleZh: zh, titleKo: ko, broads }
}

const HOT: MajorRow[] = [
  row('52.0201', 'Business Administration and Management, General.', '工商管理', '경영학', ['商务', '高管']),
  row('11.0701', 'Computer Science.', '计算机科学', '컴퓨터 과학', ['IT']),
  row('51.3801', 'Registered Nursing/Registered Nurse.', '注册护士', null, ['医疗']),
  row('52.0301', 'Accounting.', '会计', null, ['财会金融']),
]

const t = ((key: string, vars?: Record<string, string | number>) => {
  if (key === 'ob.tagDel' && vars != null) {
    return 'Remove ' + String(vars.name)
  }
  return key
}) as TFn

function reply(body: object) {
  return { status: 200, ok: true, json: async () => body }
}

// 按地址分发的假接口:热门 / 搜索 / 按码三支 + 其余(大类、树)空;记下每次请求的地址
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
    if (url === '/api/majors?cats=1') {
      return reply({ cats: [] })
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

function panel(p: { current: MajorPickerPanel | null }): MajorPickerPanel {
  if (p.current == null) {
    throw new Error('hook not mounted')
  }
  return p.current
}

// 受控宿主:值住在宿主里(同访客向导整机),选择器机器 + 视图都挂上;交出 DOM 与当前值
function mountPicker(initial: string[] = []) {
  const state: { value: string[] } = { value: initial }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  function Host() {
    const [value, setValue] = useState<string[]>(initial)
    state.value = value
    const picker = useMajorPicker({ value, onChange: setValue })
    return createElement(MajorPicker, { picker, t, lang: 'zh' })
  }
  act(() => {
    root.render(createElement(Host))
  })
  return { host, root, state }
}

function lines(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[]
}

function line(host: HTMLElement, label: string): HTMLButtonElement {
  const b = lines(host).find((x) => x.textContent === label)
  if (b == null) {
    throw new Error('line not found: ' + label)
  }
  return b
}

function dels(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('button[aria-label^="Remove "]')) as HTMLButtonElement[]
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('① 专业名按界面语言挑', () => {
  it('金标:中文取中文名、韩文取韩文名;没译成(null / 空串)回退英文;英文与其他界面一律英文', () => {
    const r = row('11.0701', 'Computer Science.', '计算机科学', '컴퓨터 과학')
    expect(majorNameOf({ row: r, lang: 'zh' })).toBe('计算机科学')
    expect(majorNameOf({ row: r, lang: 'ko' })).toBe('컴퓨터 과학')
    expect(majorNameOf({ row: r, lang: 'en' })).toBe('Computer Science.')
    expect(majorNameOf({ row: r, lang: 'fr' })).toBe('Computer Science.')
    expect(majorNameOf({ row: row('51.3801', 'Nursing.', null, ''), lang: 'zh' })).toBe('Nursing.')
    expect(majorNameOf({ row: row('51.3801', 'Nursing.', '', null), lang: 'ko' })).toBe('Nursing.')
  })
})

describe('② 起搜门槛', () => {
  it('金标:一个汉字 / 一个韩文音节就搜;单个字母不搜;两个字母起搜;空串不搜', () => {
    expect(isMajorQuery('会')).toBe(true)
    expect(isMajorQuery('법')).toBe(true)
    expect(isMajorQuery('a')).toBe(false)
    expect(isMajorQuery('ac')).toBe(true)
    expect(isMajorQuery('')).toBe(false)
  })

  it('任意输入:含中日韩字 ⇔ 长度 ≥1 就搜;不含 ⇔ 长度 ≥2 才搜', () => {
    const cjk = fc.constantFrom('会', '计', '护', '법', '경')
    fc.assert(fc.property(fc.string({ maxLength: 6 }), cjk, (latin, c) => {
      expect(isMajorQuery(latin + c)).toBe(true)
    }))
    fc.assert(fc.property(fc.stringMatching(/^[a-z0-9 .]{0,6}$/), (latin) => {
      expect(isMajorQuery(latin)).toBe(latin.length >= 2)
    }))
  })
})

describe('⑦ 专业搜索结果那一排', () => {
  it('金标:检索词够起搜才摆结果;不够(结果还没清)摆空', () => {
    expect(majorHitsOf({ searchOn: true, searching: false, hits: HOT })).toEqual(HOT)
    expect(majorHitsOf({ searchOn: false, searching: false, hits: HOT })).toEqual([])
    expect(majorHitsOf({ searchOn: true, searching: false, hits: [] })).toEqual([])
  })

  it('任意组合(收口审查):摆出结果 ⇔ 够起搜 ∧ 不在途;摆就原样摆', () => {
    fc.assert(fc.property(fc.boolean(), fc.boolean(), fc.subarray(HOT), (on, busy, hits) => {
      const out = majorHitsOf({ searchOn: on, searching: busy, hits })
      if (on && busy === false) {
        expect(out).toEqual(hits)
      } else {
        expect(out).toEqual([])
      }
    }))
  })
})

describe('③ ⑭ 上面那一排、已选一行与按码查回(纯函数)', () => {
  const far1 = row('14.0901', 'Computer Engineering, General.', '计算机工程')
  const far2 = row('26.0101', 'Biology, General.', '生物学')

  it('金标:选中的热门外的行按选的先后序排到最前;摘掉的、手上没有的不摆;热门里的不重复摆', () => {
    expect(majorTopOf({ hot: HOT, known: [far1, far2], codes: ['26.0101', '11.0701', '14.0901'] }).map((r) => r.code))
      .toEqual(['26.0101', '14.0901', '52.0201', '11.0701', '51.3801', '52.0301'])
    expect(majorTopOf({ hot: HOT, known: [far1], codes: [] })).toEqual(HOT)
    expect(majorTopOf({ hot: HOT, known: [HOT[1] as MajorRow], codes: ['11.0701'] })).toEqual(HOT)
    expect(majorTopOf({ hot: HOT, known: [], codes: ['14.0901'] })).toEqual(HOT)
  })

  it('已选一行金标:按 codes 的序;名字先取手上的行、再取热门;两头都认不出的先不摆', () => {
    expect(pickedRowsOf({ codes: ['14.0901', '52.0301', '99.9999'], hot: HOT, known: [far1] }).map((r) => r.code))
      .toEqual(['14.0901', '52.0301'])
    expect(pickedRowsOf({ codes: [], hot: HOT, known: [far1] })).toEqual([])
  })

  it('要查回的码:热门到了才查;只查热门与手上都没有的,按选的先后序', () => {
    expect(missingCodesOf({ codes: ['14.0901'], hot: HOT, hotLoaded: false, known: [] })).toEqual([])
    expect(missingCodesOf({ codes: ['11.0701', '26.0101', '14.0901'], hot: HOT, hotLoaded: true, known: [far1] }))
      .toEqual(['26.0101'])
    expect(missingCodesOf({ codes: [], hot: HOT, hotLoaded: true, known: [] })).toEqual([])
  })

  it('任意选中组合 × 任意手上的行:上面那一排 = 热门外且手上有的选中行(选的先后序)+ 热门原样;已选一行 ⊆ 选中且保序', () => {
    const pool = [far1, far2, ...HOT]
    fc.assert(fc.property(
      fc.uniqueArray(fc.constantFrom(...pool.map((r) => r.code)), { maxLength: 3 }), fc.subarray(pool),
      (codes, known) => {
        const top = majorTopOf({ hot: HOT, known, codes })
        expect(top.slice(top.length - HOT.length)).toEqual(HOT)
        const front = top.slice(0, top.length - HOT.length).map((r) => r.code)
        expect(front).toEqual(codes.filter((c) => HOT.every((h) => h.code !== c) && known.some((k) => k.code === c)))
        const picked = pickedRowsOf({ codes, hot: HOT, known }).map((r) => r.code)
        expect(picked).toEqual(codes.filter((c) => picked.includes(c)))
        const missing = missingCodesOf({ codes, hot: HOT, hotLoaded: true, known })
        expect(new Set([...picked, ...missing])).toEqual(new Set(codes))
      },
    ))
  })
})

describe('⑪ ⑫ 多选:点选 / 摘选与选满', () => {
  it('点没选的 = 追加在尾、记下这一行、清搜索框;点选中的 = 摘掉(保序)、搜索框不动;满 3 个时没选的不动', () => {
    const onChange = vi.fn()
    const setKnown = vi.fn()
    const setQ = vi.fn()
    makeMajorPickOf({ codes: ['52.0201'], setKnown, setQ, onChange })(HOT[1] as MajorRow)()
    expect(onChange).toHaveBeenLastCalledWith(['52.0201', '11.0701'])
    expect(setKnown).toHaveBeenCalledTimes(1)
    expect(setQ).toHaveBeenLastCalledWith('')
    setQ.mockClear()
    makeMajorPickOf({ codes: ['52.0201', '11.0701', '51.3801'], setKnown, setQ, onChange })(HOT[1] as MajorRow)()
    expect(onChange).toHaveBeenLastCalledWith(['52.0201', '51.3801'])
    expect(setQ).not.toHaveBeenCalled()
    onChange.mockClear()
    makeMajorPickOf({ codes: ['52.0201', '11.0701', '51.3801'], setKnown, setQ, onChange })(HOT[3] as MajorRow)()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('任意选中组合:灰 ⇔ 满 3 个 ∧ 这一行没选;选中的行永远不灰', () => {
    const codes = HOT.map((r) => r.code).concat(['14.0901', '26.0101'])
    fc.assert(fc.property(fc.uniqueArray(fc.constantFrom(...codes), { maxLength: 3 }), fc.constantFrom(...codes),
      (picked, code) => {
        const off = isMajorOff({ codes: picked, code })
        expect(off).toBe(picked.length >= 3 && picked.includes(code) === false)
        if (picked.includes(code)) {
          expect(off).toBe(false)
        }
      }))
  })

  it('整件走一遍:点亮 → 再点取消;选满 3 个其余行 disabled、选中的照常可点;摘掉一个全部恢复', async () => {
    majorsApi()
    const m = mountPicker()
    await vi.waitFor(() => expect(lines(m.host).length).toBe(4))
    act(() => line(m.host, '工商管理').click())
    expect(m.state.value).toEqual(['52.0201'])
    expect(line(m.host, '工商管理').getAttribute('aria-pressed')).toBe('true')
    act(() => line(m.host, '工商管理').click())
    expect(m.state.value).toEqual([])
    expect(line(m.host, '工商管理').getAttribute('aria-pressed')).toBe('false')
    for (const name of ['工商管理', '计算机科学', '注册护士']) {
      act(() => line(m.host, name).click())
    }
    expect(m.state.value).toEqual(['52.0201', '11.0701', '51.3801'])
    expect(line(m.host, '会计').disabled).toBe(true)
    for (const name of ['工商管理', '计算机科学', '注册护士']) {
      expect(line(m.host, name).disabled).toBe(false)
    }
    act(() => line(m.host, '会计').click())
    expect(m.state.value).toEqual(['52.0201', '11.0701', '51.3801'])
    act(() => line(m.host, '计算机科学').click())
    expect(m.state.value).toEqual(['52.0201', '51.3801'])
    expect(lines(m.host).every((b) => b.disabled === false)).toBe(true)
    act(() => m.root.unmount())
  })
})

describe('⑬ 已选一行', () => {
  it('在搜索框下面;摆全部已选(按选的先后序、名字同行里);× 读屏名「移除 {名字}」,点 × 只摘那一个;没选不渲', async () => {
    majorsApi()
    const m = mountPicker()
    await vi.waitFor(() => expect(lines(m.host).length).toBe(4))
    expect(dels(m.host)).toEqual([])
    act(() => line(m.host, '注册护士').click())
    act(() => line(m.host, '工商管理').click())
    const tags = dels(m.host)
    expect(tags.map((b) => b.getAttribute('aria-label'))).toEqual(['Remove 注册护士', 'Remove 工商管理'])
    const input = m.host.querySelector('input') as HTMLInputElement
    const row0 = tags[0]?.parentElement?.parentElement as HTMLElement
    expect(input.compareDocumentPosition(row0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(row0.contains(m.host.querySelector('[role="tablist"]'))).toBe(false)
    act(() => (tags[0] as HTMLButtonElement).click())
    expect(m.state.value).toEqual(['52.0201'])
    expect(dels(m.host).map((b) => b.getAttribute('aria-label'))).toEqual(['Remove 工商管理'])
    act(() => (dels(m.host)[0] as HTMLButtonElement).click())
    expect(m.state.value).toEqual([])
    expect(dels(m.host)).toEqual([])
    act(() => m.root.unmount())
  })
})

describe('选择器机器 useMajorPicker(迁来 + 多选)', () => {
  it('热门 → 点选:报码清单、清搜索框;选中的在热门里就不另摆', async () => {
    majorsApi()
    const onChange = vi.fn()
    const p = runHook(() => useMajorPicker({ value: [], onChange }))
    expect(panel(p).hotLoaded).toBe(false)
    await vi.waitFor(() => expect(panel(p).hotLoaded).toBe(true))
    expect(panel(p).top.map((r) => r.code)).toEqual(['52.0201', '11.0701', '51.3801', '52.0301'])
    act(() => panel(p).onSearch('计算'))
    act(() => panel(p).pickOf(HOT[1] as MajorRow)())
    expect(onChange).toHaveBeenLastCalledWith(['11.0701'])
    expect(panel(p).q).toBe('')
  })

  it('⑭ 草稿带来的几个热门外的码:热门到了才一次查回(热门里的不查);上面那一排按选的先后序排到最前,已选一行补上名字', async () => {
    const byCode = {
      '14.0901': row('14.0901', 'Computer Engineering, General.', '计算机工程'),
      '26.0101': row('26.0101', 'Biology, General.', '生物学'),
    }
    const urls = majorsApi(byCode)
    const value = ['26.0101', '11.0701', '14.0901']
    const p = runHook(() => useMajorPicker({ value, onChange: () => undefined }))
    await vi.waitFor(() => expect(panel(p).top.slice(0, 2).map((r) => r.code)).toEqual(['26.0101', '14.0901']))
    expect(urls.filter((u) => u.startsWith('/api/majors?code=')).sort())
      .toEqual(['/api/majors?code=14.0901', '/api/majors?code=26.0101'])
    expect(panel(p).picked.map((r) => r.code)).toEqual(['26.0101', '11.0701', '14.0901'])
  })

  it('搜索防抖:停手 300ms 才发(299ms 不发);单个字母不发;换词作废上一发;结果最多 20 条', async () => {
    vi.useFakeTimers()
    const many: MajorRow[] = []
    for (let i = 0; i < 25; i += 1) {
      many.push(row('52.' + String(1000 + i), 'Accounting ' + String(i) + '.', '会计' + String(i)))
    }
    const urls = majorsApi({}, many)
    const p = runHook(() => useMajorPicker({ value: [], onChange: () => undefined }))
    const searches = () => urls.filter((u) => u.startsWith('/api/majors?q='))

    act(() => panel(p).onSearch('a'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(searches()).toEqual([])
    expect(panel(p).searchOn).toBe(false)

    act(() => panel(p).onSearch('会'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(searches()).toEqual([])
    act(() => panel(p).onSearch('会计'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(searches()).toEqual([])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(searches()).toEqual(['/api/majors?q=' + encodeURIComponent('会计')])
    expect(panel(p).searchOn).toBe(true)
    expect(panel(p).hits.length).toBe(20)
  })

  it('⑧ 在途标(收口审查):够起搜的词一落下就起、防抖等待也算;结果到了落;删回不够起搜落;单个字母不起', async () => {
    vi.useFakeTimers()
    const pending: { release: () => void } = { release: () => {} }
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).startsWith('/api/majors?q=')) {
        return new Promise((resolve) => {
          pending.release = () => resolve(reply({ majors: [HOT[2]] }))
        })
      }
      return Promise.resolve(reply({ majors: HOT }))
    }))
    const p = runHook(() => useMajorPicker({ value: [], onChange: () => undefined }))
    expect(panel(p).searching).toBe(false)
    act(() => panel(p).onSearch('n'))
    expect(panel(p).searching).toBe(false)
    act(() => panel(p).onSearch('nursing'))
    expect(panel(p).searching).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(panel(p).searching).toBe(true)
    act(() => pending.release())
    await vi.waitFor(() => expect(panel(p).searching).toBe(false))
    expect(panel(p).hits.map((r) => r.code)).toEqual(['51.3801'])
    act(() => panel(p).onSearch('nursin'))
    expect(panel(p).searching).toBe(true)
    act(() => panel(p).onSearch('n'))
    expect(panel(p).searching).toBe(false)
  })
})
