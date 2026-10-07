import fc from 'fast-check'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OccPicker } from '@/components/quiz'
import type { TFn } from '@/lib/i18n'
import { broadCats, occItemsOf, pickedOf } from '@/components/quiz/functions'
import type { Top } from '@/components/quiz/types'

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

// 2026-10-05 合成职业(Frank「这个职位 怎么还有 小字 英文呢」):数据层 etl/noc 的 OCC_MERGE 把 21230 / 21231 / 21232
// 写成同一个中文短名「软件开发」(三语短名一样),职位板按中文短名归成一个职业;选职业控件原先一码一颗胶囊、三颗同名
// 再各挂官方英文名小注。改后:同组一颗、不挂小注;点一下整组选上 / 撤掉;汇总、标签、计数同组算一个;
// 没人拍过板的同名(中文短名不同)照旧各一颗、各挂小注。
// 行的在招数照 2026-10-05 线上 /api/quiz?major=11.0701&n=24 的顺序与量级(只读 GET 探过);90001 / 90002 是造的撞名对照组。

const SOFT_A: Top = {
  noc: '21232', title: 'Software developers and programmers', titleZh: '软件开发人员和程序员',
  titleZhShort: '软件开发', titleKoShort: '소프트웨어 개발자', titleEnShort: 'Software developers', open: 22,
}
const SOFT_B: Top = {
  noc: '21231', title: 'Software engineers and designers', titleZh: '软件工程师和设计师',
  titleZhShort: '软件开发', titleKoShort: '소프트웨어 개발자', titleEnShort: 'Software developers', open: 14,
}
const SOFT_C: Top = {
  noc: '21230', title: 'Computer systems developers and programmers', titleZh: '计算机系统开发人员和程序员',
  titleZhShort: '软件开发', titleKoShort: '소프트웨어 개발자', titleEnShort: 'Software developers', open: 2,
}
const NET: Top = {
  noc: '22220', title: 'Computer network and web technicians', titleZh: '计算机网络和网站技术员',
  titleZhShort: '网络技术员', titleKoShort: '네트워크 기술자', titleEnShort: 'Network technicians', open: 22,
}
const SAME_A: Top = { noc: '90001', title: 'Alpha officers', titleZh: '甲', titleZhShort: '甲', titleEnShort: 'Same name', open: 5 }
const SAME_B: Top = { noc: '90002', title: 'Beta officers', titleZh: '乙', titleZhShort: '乙', titleEnShort: 'Same name', open: 4 }
const MAJOR_ROWS = [SOFT_A, NET, SOFT_B, SAME_A, SAME_B, SOFT_C]
const SOFT_TITLES = [SOFT_A.title, SOFT_B.title, SOFT_C.title]

const tEn = ((key: string, vars?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    'occ.selected': '{n} selected',
    'occ.resultN': '{n} occupations found',
    'quiz.openN': '{n} open',
    'occ.cat.rec': 'Suggested',
    'ob.tagDel': 'Remove {name}',
    'act.loadingText': 'Loading…',
    'occ.word': 'occupation',
  }
  return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''))
}) as TFn

async function mountPicker(props: Record<string, unknown>, routes: Record<string, unknown>) {
  const fetchMock = vi.fn((url: string) => {
    const hit = Object.keys(routes).find((k) => String(url).includes(k))
    if (hit == null) {
      return new Promise(() => {})
    }
    return Promise.resolve({ json: () => Promise.resolve(routes[hit]) })
  })
  vi.stubGlobal('fetch', fetchMock)
  const onChange = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(React.createElement(OccPicker, {
      t: tEn, lang: 'en', initial: [], inline: true, onDone: vi.fn(), onChange, ...props,
    }))
  })
  async function unmount() {
    await act(async () => root.unmount())
    container.remove()
  }
  return { container, onChange, fetchMock, unmount }
}

function pills(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[]
}

// 2026-10-05 大号档改左右两栏:原 pillsTitled / firstPill(按大号胶囊的 title 认)换成按右边那块的行字认
// 2026-10-05「全选」:每一屏首行多一行「全选」(词条键 occ.all);panelRows 只数职业行,全选那一行由 allRow 取
function panelButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('[role="tabpanel"] button[aria-pressed]')) as HTMLButtonElement[]
}

function panelRows(container: HTMLElement): HTMLButtonElement[] {
  return panelButtons(container).filter((b) => b.textContent !== 'occ.all')
}

function rowsLabeled(container: HTMLElement, label: string): HTMLButtonElement[] {
  return panelButtons(container).filter((b) => b.textContent === label)
}

function rowLabeled(container: HTMLElement, label: string): HTMLButtonElement {
  const [b] = rowsLabeled(container, label)
  if (b == null) {
    throw new Error('no row labeled ' + label)
  }
  return b
}

// 已选一行的 × 钮(读屏名「Remove {名字}」)
function tagDels(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button[aria-label^="Remove "]')) as HTMLButtonElement[]
}

function railTabs(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('[role="tablist"][aria-orientation="vertical"] [role="tab"]')) as HTMLButtonElement[]
}

async function typeQuery(container: HTMLElement, q: string) {
  const input = container.querySelector('input') as HTMLInputElement
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setValue?.call(input, q)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('选职业控件:合成的职业只摆一个(2026-10-05)', () => {
  // 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):大号档的胶囊换成右边那块一行一个的职业行
  // (chip 桶 ChipLine,没有 title 属性、没有小注格),下面三条按行上的字认;「没拍过板的同名各挂官方名」那半句随大号胶囊撤
  // (线上同组合成后三语无同名,见 occlines.tsx 头注),改断言两行同名各自一行、不合成;「不另挂标签」改成已选一行摆全部已选(一颗)。
  // 2026-10-05 同日收口:ChipLine 多了灰字小注一格,「没拍过板的同名各挂官方名」接回 —— 两行同名各自一行、名字下面各挂官方英文名
  // (分得开),合成的那一组与不撞名的行不挂;行字 = 名字 + 小注。点那两行改按「名字 + 小注」认,点的是哪一个码一目了然。
  it('访客第 3 题(大号档):合成的一组一行、不出英文全名;没拍过板的同名各自一行(不合成)、各挂官方英文名;按组里加总的在招数排', async () => {
    const m = await mountPicker({ lg: true, majorCode: '11.0701' }, { '?major=11.0701': { top: MAJOR_ROWS } })
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
    expect(rowsLabeled(m.container, 'Software developers')).toHaveLength(1)
    for (const title of SOFT_TITLES) {
      expect(m.container.textContent).not.toContain(title)
    }
    expect(rowsLabeled(m.container, 'Same name' + SAME_A.title)).toHaveLength(1)
    expect(rowsLabeled(m.container, 'Same name' + SAME_B.title)).toHaveLength(1)
    expect(panelRows(m.container).map((b) => b.textContent)).toEqual(
      ['Software developers', 'Network technicians', 'Same name' + SAME_A.title, 'Same name' + SAME_B.title],
    )
    expect(panelRows(m.container).map((b) => b.querySelector('[class*="lineSub"]')?.textContent ?? null)).toEqual(
      [null, null, SAME_A.title, SAME_B.title],
    )
    await m.unmount()
  })

  it('点一下整组三个码一起选上,再点一下三个一起撤掉;别的职业照旧一码一选', async () => {
    const m = await mountPicker({ lg: true, majorCode: '11.0701' }, { '?major=11.0701': { top: MAJOR_ROWS } })
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
    await act(async () => rowLabeled(m.container, 'Software developers').click())
    expect(m.onChange).toHaveBeenLastCalledWith(['21232', '21231', '21230'])
    expect(rowLabeled(m.container, 'Software developers').getAttribute('aria-pressed')).toBe('true')
    await act(async () => rowLabeled(m.container, 'Network technicians').click())
    expect(m.onChange).toHaveBeenLastCalledWith(['21232', '21231', '21230', '22220'])
    await act(async () => rowLabeled(m.container, 'Software developers').click())
    expect(m.onChange).toHaveBeenLastCalledWith(['22220'])
    expect(rowLabeled(m.container, 'Software developers').getAttribute('aria-pressed')).toBe('false')
    await act(async () => rowLabeled(m.container, 'Same name' + SAME_A.title).click())
    expect(m.onChange).toHaveBeenLastCalledWith(['22220', '90001'])
    await m.unmount()
  })

  it('旧档只存了组里一个码:那一行照样亮,已选一行只一颗;点那一行撤掉的就是它', async () => {
    const m = await mountPicker(
      { lg: true, majorCode: '11.0701', initial: ['21230'] },
      { '?major=11.0701': { top: MAJOR_ROWS }, '?noc=21230': { facts: SOFT_C } },
    )
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
    const soft = rowLabeled(m.container, 'Software developers')
    expect(soft.getAttribute('aria-pressed')).toBe('true')
    await vi.waitFor(() => expect(tagDels(m.container).map((b) => b.getAttribute('aria-label')))
      .toEqual(['Remove Software developers']))
    await act(async () => soft.click())
    expect(m.onChange).toHaveBeenLastCalledWith([])
    expect(tagDels(m.container)).toHaveLength(0)
    await m.unmount()
  })

  // 2026-10-05 收口(代码不裸奔):名字还没拉回来时,标签上摆占位条,× 的读屏名报泛称「Remove occupation」,不报五位码;
  // 名字一到换成名字。探针:tagDelNameOf 退回码 → 第一条断言红。
  it('名字还没拉回来:已选一行那一颗 × 的读屏名不带五位码,名字到了换成名字', async () => {
    const facts = deferred()
    const m = await mountPicker(
      { lg: true, majorCode: '11.0701', initial: ['21230'] },
      { '?major=11.0701': { top: [NET] }, '?noc=21230': facts.promise },
    )
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(1))
    const aria = () => tagDels(m.container).map((b) => b.getAttribute('aria-label'))
    expect(aria()).toEqual(['Remove occupation'])
    expect(aria().some((a) => /\d{5}/.test(String(a)))).toBe(false)
    await act(async () => facts.release({ facts: SOFT_C }))
    await vi.waitFor(() => expect(aria()).toEqual(['Remove Software developers']))
    await m.unmount()
  })

  it('决策页(常规档)搜索:命中的两个同组码一颗、计数按职业数;选上后汇总一颗、「1 selected」,点汇总那颗整组撤掉', async () => {
    const m = await mountPicker({}, {
      '?top=24': { top: [] },
      '?counts=': { counts: {} },
      '?q=software': { candidates: [SOFT_B, SOFT_A] },
    })
    await typeQuery(m.container, 'software')
    await vi.waitFor(() => expect(m.container.querySelector('.occResultsHead')?.textContent).toBe('1 occupations found'))
    const cand = pills(m.container)
    expect(cand.map((b) => b.textContent)).toEqual(['Software developers21231'])
    await act(async () => cand[0]?.click())
    expect(m.onChange).toHaveBeenLastCalledWith(['21231', '21232'])
    const chips = Array.from(m.container.querySelectorAll('.occSelectedChip')) as HTMLButtonElement[]
    expect(chips.map((c) => c.textContent)).toEqual(['Software developers'])
    expect(m.container.textContent).toContain('1 selected')
    await act(async () => chips[0]?.click())
    expect(m.onChange).toHaveBeenLastCalledWith([])
    expect(m.container.textContent).toContain('0 selected')
    await m.unmount()
  })

  it('回到这一题:存档里三个码,名字从内置常用清单来的 21232 也去查组键 —— 汇总一颗、「1 selected」', async () => {
    const m = await mountPicker(
      { initial: ['21232', '21231', '21230'], initialTop: [NET, SAME_A, SAME_B] },
      { '?noc=21232': { facts: SOFT_A }, '?noc=21231': { facts: SOFT_B }, '?noc=21230': { facts: SOFT_C } },
    )
    await vi.waitFor(() => expect(m.container.textContent).toContain('1 selected'))
    const urls = m.fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls).toContain('/api/quiz?noc=21232')
    expect(m.container.querySelectorAll('.occSelectedChip')).toHaveLength(1)
    await m.unmount()
  })
})

describe('按组键合成职业 occItemsOf / 已选收拢 pickedOf(性质)', () => {
  const shorts = fc.constantFrom('', '软件开发', '厨师', '网络技术员')
  const rowsArb = fc.uniqueArray(fc.record({ noc: fc.stringMatching(/^\d{5}$/), short: shorts }), {
    selector: (r) => r.noc, maxLength: 12,
  })

  it('金标:三个同短名的码合成一个(代表 = 排最前那行);短名各异的不合', () => {
    const items = occItemsOf({ rows: MAJOR_ROWS, keys: {} })
    expect(items.map((i) => [i.key, i.rows.map((r) => r.noc)])).toEqual([
      ['软件开发', ['21232', '21231', '21230']],
      ['网络技术员', ['22220']],
      ['甲', ['90001']],
      ['乙', ['90002']],
    ])
    expect(items[0]?.head.noc).toBe('21232')
  })

  it('任意行:每个码恰好落在一个职业里、顺序不乱;同一职业里的行短名相同且非空(或只有一行);短名不同的永不合', () => {
    fc.assert(fc.property(rowsArb, (spec) => {
      const rows: Top[] = spec.map((s) => ({ noc: s.noc, title: s.noc, titleZh: s.noc, titleZhShort: s.short, open: 1 }))
      const items = occItemsOf({ rows, keys: {} })
      expect(items.flatMap((i) => i.rows.map((r) => r.noc)).sort()).toEqual(rows.map((r) => r.noc).sort())
      const keys = items.map((i) => i.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const i of items) {
        expect(i.head).toBe(i.rows[0])
        if (i.rows.length > 1) {
          expect(i.rows.every((r) => r.titleZhShort === i.head.titleZhShort && r.titleZhShort !== '')).toBe(true)
        }
      }
      const distinct = new Set(rows.filter((r) => r.titleZhShort !== '').map((r) => r.titleZhShort)).size
      expect(items).toHaveLength(distinct + rows.filter((r) => r.titleZhShort === '').length)
    }))
  })

  it('任意已选码 × 任意组键:收拢后的码按原序摊平就是原清单;组数 = 不同组键数;没记组键的码自成一组', () => {
    fc.assert(fc.property(rowsArb, (spec) => {
      const nocs = spec.map((s) => s.noc)
      const keys: Record<string, string> = {}
      for (const s of spec) {
        keys[s.noc] = s.short
      }
      const picked = pickedOf({ nocs, keys })
      expect(picked.flatMap((g) => g.nocs).sort()).toEqual(nocs.slice().sort())
      for (const g of picked) {
        expect(g.head).toBe(g.nocs[0])
        expect(nocs.indexOf(g.head)).toBe(Math.min(...g.nocs.map((n) => nocs.indexOf(n))))
      }
      const groupKeys = new Set(spec.map((s) => (s.short === '' ? s.noc : s.short)))
      expect(picked).toHaveLength(groupKeys.size)
    }))
  })
})

// 2026-10-05 访客第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」;quiz 桶 OccRail)。
// 性质:① 左栏 = 「推荐」+ 全站大类(顺序同 broadCats,名字同分类页签),开屏停在推荐;两栏装在定高区(data-nodrag)里;
//       ② 点大类:目录在路上右边摆加载中那一行(没有行),到了换这一类的职业(同组合成一行),点一行整组选上;回推荐回到推荐那一屏;
//          取过的类不再取;
//       ③ 已选一行 = 全部已选职业按点选先后、一个职业一颗(推荐里亮着的也摆),摆在搜索框与两栏之间;× 任一颗只撤那一组、其余保序;
//       ④ 在搜:两栏整块换成单列命中(礼让播报 + 定高区),在途摆加载中、检索词那一截标主色;点命中整组选上、清空搜索框回到两栏;
//          一条都没搜到出原有的空态句;
//       ⑤ 常规档(lg 缺省:职位板 / 详情页 / 决策页)照旧:分类页签、胶囊排、底部汇总都在,没有左栏、没有定高区、没有已选一行。
// 探针:railKeyOf 恒回 OCC_CAT_REC → ②「点大类后该项选中」红;makeRailPick 不把推荐映回空串 → ②「回推荐」红;
//       OccTags 只摆这一屏外的 → ③红;OccRail 在搜时仍渲 RailTabs → ④「两栏整块换掉」红。

const NAMES = ['Software developers', 'Network technicians', 'Same name', 'Same name']
const NOCS = [['21232', '21231', '21230'], ['22220'], ['90001'], ['90002']]

function deferred(): { promise: Promise<unknown>; release: (v: unknown) => void } {
  let release: (v: unknown) => void = () => undefined
  const promise = new Promise((r) => {
    release = r
  })
  return { promise, release }
}

function railTab(container: HTMLElement, label: string): HTMLButtonElement {
  const b = railTabs(container).find((x) => x.textContent === label)
  if (b == null) {
    throw new Error('no rail tab ' + label)
  }
  return b
}

describe('访客第 3 题左右两栏(OccPicker 大号档,2026-10-05)', () => {
  it('① 左栏 = 推荐 + 全站大类;开屏停在推荐,右边一张白卡装推荐那一屏;两栏装在定高区里', async () => {
    const m = await mountPicker({ lg: true, majorCode: '11.0701' }, { '?major=11.0701': { top: MAJOR_ROWS } })
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
    const tabs = railTabs(m.container)
    expect(tabs.map((b) => b.textContent)).toEqual(['Suggested', ...broadCats().map((c) => 'broad.' + c)])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(tabs.filter((b) => b.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    const list = m.container.querySelector('[role="tablist"]') as HTMLElement
    expect(list.closest('[data-nodrag]')).not.toBeNull()
    expect(m.container.querySelector('[aria-live="polite"]')).toBeNull()
    await m.unmount()
  })

  it('② 点大类:在路上摆加载中,到了换这一类的职业(同组一行),点一行整组选上;回推荐回到推荐那一屏;取过的类不再取', async () => {
    const cat = deferred()
    const m = await mountPicker(
      { lg: true, majorCode: '11.0701' },
      { '?major=11.0701': { top: [SAME_A, SAME_B] }, '?broad=': cat.promise },
    )
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(2))
    await act(async () => railTab(m.container, 'broad.IT').click())
    expect(railTab(m.container, 'broad.IT').getAttribute('aria-selected')).toBe('true')
    expect(railTabs(m.container)[0]?.getAttribute('aria-selected')).toBe('false')
    expect(m.container.querySelector('[role="tabpanel"]')?.textContent).toBe('Loading…')
    expect(panelRows(m.container)).toHaveLength(0)
    await act(async () => cat.release({ top: [SOFT_B, NET, SOFT_A, SOFT_C] }))
    // 2026-10-05「全选」:每一屏首行多一行「全选」(词条键 occ.all;同日「推荐也要加全选」起推荐那一屏也出)
    await vi.waitFor(() => expect(panelRows(m.container).map((b) => b.textContent))
      .toEqual(['Software developers', 'Network technicians']))
    expect(m.fetchMock.mock.calls.map(([u]) => String(u))).toContain('/api/quiz?broad=IT')
    await act(async () => rowLabeled(m.container, 'Software developers').click())
    expect(m.onChange).toHaveBeenLastCalledWith(['21231', '21232', '21230'])
    await act(async () => railTabs(m.container)[0]?.click())
    expect(railTabs(m.container)[0]?.getAttribute('aria-selected')).toBe('true')
    expect(panelRows(m.container).map((b) => b.textContent)).toEqual(['Same name' + SAME_A.title, 'Same name' + SAME_B.title])
    expect(rowsLabeled(m.container, 'occ.all')).toHaveLength(1)
    await act(async () => railTab(m.container, 'broad.IT').click())
    expect(panelRows(m.container).map((b) => b.textContent)).toEqual(['Software developers', 'Network technicians'])
    await act(async () => rowLabeled(m.container, 'occ.all').click())
    const last = m.onChange.mock.calls[m.onChange.mock.calls.length - 1]
    expect([...(last == null ? [] : last[0])].sort()).toEqual(['21230', '21231', '21232', '22220'])
    await act(async () => rowLabeled(m.container, 'occ.all').click())
    expect(m.onChange).toHaveBeenLastCalledWith([])
    expect(m.fetchMock.mock.calls.filter(([u]) => String(u).includes('?broad=')).length).toBe(1)
    await m.unmount()
  })

  it('③ 已选一行:全部已选按点选先后、一个职业一颗,摆在搜索框与两栏之间;× 任一颗只撤那一组、其余保序', async () => {
    await fc.assert(fc.asyncProperty(
      fc.shuffledSubarray([0, 1, 2, 3], { minLength: 1 }), fc.nat(),
      async (order, k) => {
        const m = await mountPicker({ lg: true, majorCode: '11.0701' }, { '?major=11.0701': { top: MAJOR_ROWS } })
        await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
        expect(tagDels(m.container)).toHaveLength(0)
        for (const i of order) {
          await act(async () => panelRows(m.container)[i]?.click())
        }
        expect(tagDels(m.container).map((b) => b.getAttribute('aria-label'))).toEqual(order.map((i) => 'Remove ' + NAMES[i]))
        expect(m.onChange).toHaveBeenLastCalledWith(order.flatMap((i) => NOCS[i] ?? []))
        const row = tagDels(m.container)[0]?.closest('[data-nodrag]') as HTMLElement
        const input = m.container.querySelector('input') as HTMLInputElement
        const list = m.container.querySelector('[role="tablist"]') as HTMLElement
        expect(input.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(row.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        const drop = k % order.length
        await act(async () => tagDels(m.container)[drop]?.click())
        const rest = order.filter((_, j) => j !== drop)
        expect(m.onChange).toHaveBeenLastCalledWith(rest.flatMap((i) => NOCS[i] ?? []))
        expect(tagDels(m.container).map((b) => b.getAttribute('aria-label'))).toEqual(rest.map((i) => 'Remove ' + NAMES[i]))
        expect(panelRows(m.container)[order[drop] ?? 0]?.getAttribute('aria-pressed')).toBe('false')
        await m.unmount()
      },
    ), { numRuns: 12 })
  })

  it('④ 在搜:两栏整块换成单列命中;在途摆加载中、检索词标主色;点命中整组选上并清空搜索框回到两栏', async () => {
    const q = deferred()
    const m = await mountPicker(
      { lg: true, majorCode: '11.0701' },
      { '?major=11.0701': { top: MAJOR_ROWS }, '?q=software': q.promise },
    )
    await vi.waitFor(() => expect(panelRows(m.container)).toHaveLength(4))
    await typeQuery(m.container, 'software')
    expect(railTabs(m.container)).toHaveLength(0)
    const live = m.container.querySelector('[aria-live="polite"][data-nodrag]') as HTMLElement
    expect(live).not.toBeNull()
    expect(live.textContent).toBe('Loading…')
    await vi.waitFor(() => expect(m.fetchMock.mock.calls.some(([u]) => String(u).includes('?q=software'))).toBe(true))
    await act(async () => q.release({ candidates: [SOFT_B, SOFT_A] }))
    const hits = () => Array.from(live.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[]
    await vi.waitFor(() => expect(hits().map((b) => b.textContent)).toEqual(['Software developers']))
    expect(live.textContent).not.toContain('Loading…')
    expect(hits()[0]?.querySelector('[class*="lineMark"]')?.textContent).toBe('Software')
    await act(async () => hits()[0]?.click())
    expect(m.onChange).toHaveBeenLastCalledWith(['21231', '21232'])
    expect((m.container.querySelector('input') as HTMLInputElement).value).toBe('')
    expect(railTabs(m.container).length).toBe(broadCats().length + 1)
    expect(rowLabeled(m.container, 'Software developers').getAttribute('aria-pressed')).toBe('true')
    await m.unmount()
  })

  it('④ 一条都没搜到:单列里出原有的空态句', async () => {
    const m = await mountPicker(
      { lg: true, majorCode: '11.0701' },
      { '?major=11.0701': { top: MAJOR_ROWS }, '?q=zzzz': { candidates: [] } },
    )
    await typeQuery(m.container, 'zzzz')
    const live = m.container.querySelector('[aria-live="polite"][data-nodrag]') as HTMLElement
    await vi.waitFor(() => expect(live.textContent).toBe('occ.noResult'))
    expect(live.querySelectorAll('button')).toHaveLength(0)
    await m.unmount()
  })

  it('⑤ 常规档(lg 缺省)照旧:分类页签、胶囊排、底部汇总都在;没有左栏、没有定高区、没有 tag 桶已选一行', async () => {
    const m = await mountPicker({ initial: ['22220'], initialTop: [NET, SAME_A] }, { '?noc=22220': { facts: NET } })
    expect(m.container.querySelector('.occSearchWrap input')).not.toBeNull()
    expect(m.container.querySelector('.occCatTabs')).not.toBeNull()
    expect(m.container.querySelector('.occPills')).not.toBeNull()
    expect(m.container.querySelector('.occSelected')).not.toBeNull()
    expect(m.container.querySelector('[role="tablist"]')).toBeNull()
    expect(m.container.querySelector('[data-nodrag]')).toBeNull()
    expect(tagDels(m.container)).toHaveLength(0)
    expect(pills(m.container).map((b) => b.title)).toEqual(['Network technicians', 'Same name'])
    await m.unmount()
  })
})
