// 专业选择器的左栏(components/majors;2026-10-05 自 tests/int/gateMajorRail.int.spec.ts 迁来,选择器自 gate 桶拆出立域):
// 照掌上高考(2026-10-05 Frank「参考掌上高考啊」「可以,做吧」;效果图 docs/design/img/访客专业题-掌上高考版-*):
// 左栏 热门 + 16 大类(tabs 桶 RailTabs)→ 右边一个专业类一张可展开白卡(card 桶 FoldCard),只装一个专业的合成一张 →
// 一行一个专业(chip 桶 ChipLine)。
// 性质:① 左栏第一项恒是热门,其后大类照接口顺序;大类 / 专业类 / 专业按界面语言挑名,英文先取数据层短名;
//       ② 一次只开一张专业类白卡:点开着的收起,点别的换成它;换大类全收起;
//       ③ 大类的专业类树点到才取(?cat=<键>),取过的切回来不重取;热门不取树;坏数据(缺键 / 缺名 / 一个专业都没有的类)丢掉。
//       (原 ④「整机走一遍」是访客向导的整机测试,随搬家挪去 tests/int/gateMajors.int.spec.ts。)
// 探针:railItemsOf 漏掉热门 → ①红;makeFoldOf 不判 open === key → ②「点开着的收起」红;makeCatPick 不收起 → ②「换大类」红;
//       loadMajorTree 不判 trees.has → ③「不重取」红;toMajorTree 不丢空类 → ③「坏数据」红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { useMajorPicker } from '@/components/majors'
import { catNameOf, majorNameOf, makeFoldOf, railItemsOf, treeOfCat } from '@/components/majors/functions'
import type { MajorCat, MajorPickerPanel, MajorRow, MajorTree } from '@/components/majors/types'

function row(code: string, en: string, short: string, zh: string | null): MajorRow {
  return { code, titleEn: en, titleEnShort: short, titleZh: zh, titleKo: null, broads: [] }
}

const CATS = [
  { key: 'biz', titleEn: 'Business', titleZh: '商科', titleKo: '경영' },
  { key: 'fin', titleEn: 'Finance', titleZh: '财会金融', titleKo: null },
]

const FIN = {
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
    { key: 'bad', titleEn: 'No majors', titleZh: null, titleKo: null, majors: [] },
    { titleEn: 'No key', majors: [{ code: '1', titleEn: 'x' }] },
  ],
  singles: [
    { code: '52.1601', titleEn: 'Taxation', titleEnShort: '', titleZh: '税务', titleKo: null, broads: [] },
  ],
}

function reply(body: object) {
  return { status: 200, ok: true, json: async () => body }
}

// 按地址分发的假接口:热门一个、大类两个、财会金融一棵树;其余(埋点等)空对象;记下每次请求
function api() {
  const urls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(String(url))
    if (url === '/api/majors?top=1') {
      return reply({ majors: [{ code: '52.0201', titleEn: 'Business administration and management, general',
        titleEnShort: 'Business administration', titleZh: '工商管理', titleKo: null, broads: [], popular: 1 }] })
    }
    if (url === '/api/majors?cats=1') {
      return reply({ cats: CATS })
    }
    if (url === '/api/majors?cat=fin') {
      return reply(FIN)
    }
    if (url.startsWith('/api/majors?cat=')) {
      return reply({ groups: [], singles: [] })
    }
    return reply({ answers: null })
  }))
  return urls
}

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

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('① 左栏各项与按语言挑名', () => {
  it('第一项恒是热门,其后照接口顺序;大类名按界面语言挑,缺了回退英文', () => {
    const cats: MajorCat[] = CATS
    expect(railItemsOf({ cats, lang: 'zh', hot: '热门' })).toEqual([
      { key: 'hot', label: '热门' }, { key: 'biz', label: '商科' }, { key: 'fin', label: '财会金融' },
    ])
    expect(railItemsOf({ cats, lang: 'ko', hot: 'x' }).map((i) => i.label)).toEqual(['x', '경영', 'Finance'])
    expect(railItemsOf({ cats: [], lang: 'en', hot: 'Popular' })).toEqual([{ key: 'hot', label: 'Popular' }])
    expect(catNameOf({ titled: CATS[1] as MajorCat, lang: 'en' })).toBe('Finance')
  })

  it('专业名:英文先取数据层短名,短名空才用官方长名;中韩照旧取译名,没译成回退英文(短名优先)', () => {
    const r = row('52.0302', 'Accounting technology/technician and bookkeeping', 'Accounting technology', '会计技术')
    expect(majorNameOf({ row: r, lang: 'en' })).toBe('Accounting technology')
    expect(majorNameOf({ row: r, lang: 'zh' })).toBe('会计技术')
    expect(majorNameOf({ row: row('1', 'Long official', '', null), lang: 'en' })).toBe('Long official')
    expect(majorNameOf({ row: row('1', 'Long official', 'Short', null), lang: 'ko' })).toBe('Short')
  })
})

describe('② 一次只开一张专业类白卡', () => {
  it('点收着的那张 → 开它;点开着的 → 收起;开着 A 点 B → 换成 B', () => {
    const set = vi.fn()
    makeFoldOf({ open: '', setOpen: set })('52.03')()
    expect(set).toHaveBeenLastCalledWith('52.03')
    makeFoldOf({ open: '52.03', setOpen: set })('52.03')()
    expect(set).toHaveBeenLastCalledWith('')
    makeFoldOf({ open: '52.03', setOpen: set })('52.08')()
    expect(set).toHaveBeenLastCalledWith('52.08')
  })

  it('热门 / 还没取到的大类没有树', () => {
    const tree: MajorTree = { groups: [], singles: [] }
    const trees = new Map([['fin', tree]])
    expect(treeOfCat({ trees, cat: 'hot' })).toBeNull()
    expect(treeOfCat({ trees, cat: 'biz' })).toBeNull()
    expect(treeOfCat({ trees, cat: 'fin' })).toBe(tree)
  })
})

describe('③ 专业类树点到才取', () => {
  it('开屏取热门与大类、不取树;点财会金融取一次,切走再切回不重取;坏数据丢掉;换大类收起展开着的', async () => {
    const urls = api()
    const p = runHook(() => useMajorPicker({ value: [], onChange: () => undefined }))
    await vi.waitFor(() => expect(panel(p).cats.map((c) => c.key)).toEqual(['biz', 'fin']))
    expect(panel(p).cat).toBe('hot')
    expect(urls.some((u) => u.startsWith('/api/majors?cat='))).toBe(false)
    act(() => panel(p).onCat('fin'))
    await vi.waitFor(() => expect(panel(p).tree).not.toBeNull())
    const tree = panel(p).tree as MajorTree
    expect(tree.groups.map((g) => g.key)).toEqual(['52.03', '52.08'])
    expect(tree.groups[0]?.majors[1]?.titleEnShort).toBe('Accounting technology and bookkeeping')
    expect(tree.singles.map((r) => r.code)).toEqual(['52.1601'])
    act(() => panel(p).foldOf('52.03')())
    expect(panel(p).open).toBe('52.03')
    act(() => panel(p).onCat('biz'))
    expect(panel(p).open).toBe('')
    await vi.waitFor(() => expect(urls.filter((u) => u === '/api/majors?cat=biz')).toHaveLength(1))
    act(() => panel(p).onCat('fin'))
    expect(panel(p).tree).not.toBeNull()
    expect(urls.filter((u) => u === '/api/majors?cat=fin')).toHaveLength(1)
  })
})
