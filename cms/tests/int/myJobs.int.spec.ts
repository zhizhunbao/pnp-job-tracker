// 「我的」页两张岗位清单(2026-10-06;myjobs 组件桶,数据口 /api/myjobs/applied、/api/myjobs/saved;dev 直连生产库不登录,用 jsdom 挂件验)。
// 2026-10-08 进度板(docs/design/我的模块-求职进度板调研-20261008.md):表换一岗一张横卡,顶上阶段胶囊带计数。
// 性质:① 清单没回来不渲;② 零条出各自的空态(我的求职带「去职位板」);③ 接口失败出「刷新再试」,不冒充空态;
//       ④ 一张横卡:首字母块、职位名链到职位页(普通左键叠开职位描述弹框)、公司、城市(站规:有译名用译名 + 灰注「英文名 省码」;
//          没译名主文案英文、灰注只剩省码)、日期一行(我的求职「投递于」、草稿「最近改于」、我的收藏「发布于」)、状态胶囊;
//       ⑤ 投递状态只读:投过的胶囊「已投递」,没投过没胶囊;下架另挂「已下架」胶囊;我的求职发出去了的行带简历 / 求职信两个链接;
//       ⑥ 职位删了:没有链接、没有「打开」;
//       ⑦ 我的收藏有「取消收藏」:先本地删、发 DELETE /api/saved-jobs/<id>;服务端没删成就退回;我的求职没有这颗钮;
//       ⑧ 照职位板:公司表里有的公司名是钮、点了叠开公司弹框(标题是公司名),没有的是纯文字;
//       ⑨ 草稿行:日期「最近改于」、没附件、操作「继续」去投递区;收藏有邮箱在架没投过的行「打开」换「投递」;
//       ⑩ 阶段胶囊:全部 / 草稿 / 待投 / 已投递 / 雇主回复 / 退信 各带计数,点一枚只看那一档。
// 2026-10-09 A 批投递搬进弹框:⑨ 草稿「继续」、收藏「投递」改读作「就地弹投递框」—— 点了地址栏带上 `?apply=<职位号>`(本站推的一笔),
//       不整页跳;收藏行「投递」从链接改成钮。探针:makeContinue 改回 location.assign → ⑨ 红;makeApplyOpen 不开框 → 收藏那条红。
// 2026-10-09 N 批:⑧ 改读作「点公司名往弹框总线上推一层公司层」(公司框由全站宿主 PeekHost 画,本页不画)。
// 2026-10-09 N6 批(名字全站一种形:英文在上、界面语译名灰字在下,省市分开):④ 职位名、公司名、城市、省份改走 name 桶 ——
//       城市 = 英文名 Google 地图链 + 译名灰字,省份另起一份(英文全名地图链 + 省名灰字),原「中文主文案 + 灰注 英文名 省码」撤;
//       ⑧ 改读作「有公司页的公司名是链(/companies/<slug>),普通左键往弹框总线上推一层公司层;没有的是黑字」(原是钮)。
// 探针:makeUnsave 失败不退回 → ⑦「失败退回」红;closedTextOf 不认下架 → ⑤ 红;byStageOf 不筛 → ⑩ 红;makeLoadMyJobs 失败不拨 failed → ③ 红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppliedList, SavedList } from '@/components/myjobs'

const BASE = { titleKo: '', cityKo: '', stage: 'applied', closed: false, salaryAnnual: null, companySlug: '', hasEmail: false }
const A = { ...BASE, id: 7, jobId: 101, companySlug: 'clean-co', salaryAnnual: 37440, title: 'light duty cleaner', titleZh: '轻型清洁工', company: 'Clean Co', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18/hr', datePosted: '2026-10-02T00:00:00.000Z', updatedAt: '2026-10-05T15:00:00.000Z' }
const B = { ...BASE, id: 8, jobId: null, title: 'Cook', titleZh: 'Cook', company: 'Pie Wood', city: 'Steinbach', cityZh: '', province: 'MB', salary: '', datePosted: '', updatedAt: '2026-10-04T15:00:00.000Z', closed: true }
const C = { ...BASE, id: 9, jobId: 103, salaryAnnual: 40040, title: 'truck washer', titleZh: '', company: 'Wash Ltd', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18–$21/hr', datePosted: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T15:00:00.000Z', stage: '' }
const D = { ...BASE, id: 10, jobId: 105, title: 'office manager', titleZh: '', company: 'Anurag Homes Team', city: 'Kitchener', cityZh: '基奇纳', province: 'ON', salary: '$80K/yr', datePosted: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-07T10:00:00.000Z', stage: 'draft' }
const E = { ...C, hasEmail: true }
const S = { ...A, stage: 'sent' }

type Reply = { status: number, body: object }

// fetch 桩:按「方法 地址」分账,没配的一律挂起;记下每次请求
function server(routes: Record<string, Reply | 'hang'>) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push(key)
    const r = routes[key]
    if (r == null || r === 'hang') {
      return new Promise(() => undefined)
    }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }))
  return calls
}

async function flush() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

// 城市 / 省份名的 Google 地图链(2026-10-09 N6 批:name 桶 CityName / ProvName,查询串走 lib/location)
const MAP = (q: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q)

async function mount(comp: typeof AppliedList) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(comp, { t, plan: { isPro: false, loggedIn: true } as never }))
  })
  await flush()
  return el
}

// 一张横卡:按职位名找,往上到带 data-row 的那层;没有这一张给 null
function rowOf(el: HTMLElement, name: string) {
  const title = Array.from(el.querySelectorAll('a, span')).find((x) => x.textContent === name)
  return (title?.closest('[data-row]') ?? null) as HTMLElement
}

function links(row: HTMLElement) {
  return Array.from(row.querySelectorAll('a')).map((a) => [a.textContent, a.getAttribute('href')])
}

function buttons(row: HTMLElement) {
  return Array.from(row.querySelectorAll('button')).map((b) => b.textContent)
}

async function click(el: HTMLElement, text: string) {
  await act(async () => {
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent === text)?.click()
  })
  await flush()
}

// jsdom 没有 matchMedia(弹框按它判窄屏);给一个「不是窄屏」的桩
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('我的求职', () => {
  it('① 清单没回来不渲', async () => {
    server({ 'GET /api/myjobs/applied': 'hang' })
    expect((await mount(AppliedList)).textContent).toBe('')
  })

  it('② 零条出空态 + 去职位板', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [] } } })
    const el = await mount(AppliedList)
    expect(el.textContent).toContain('mj.emptyApplied')
    expect(Array.from(el.querySelectorAll('a')).find((x) => x.textContent === 'mj.toBoard')?.getAttribute('href')).toBe('/jobs')
  })

  it('③ 接口失败出「刷新再试」,不冒充空态', async () => {
    server({ 'GET /api/myjobs/applied': { status: 500, body: {} } })
    const el = await mount(AppliedList)
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('mj.emptyApplied')
  })

  it('④⑤⑥ 横卡:首字母、职位链、公司、城市、投递于、胶囊、附件;职位已删', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [S, B] } } })
    const el = await mount(AppliedList)
    const a = rowOf(el, 'light duty cleaner')
    expect(a.textContent?.startsWith('C')).toBe(true)
    expect(links(a)).toEqual([
      ['light duty cleaner', '/jobs/101'], ['Clean Co', '/companies/clean-co'],
      ['Winnipeg', MAP('Winnipeg, Manitoba, Canada')], ['Manitoba', MAP('Manitoba, Canada')],
      ['mj.col.resume', '/api/apply/file?id=7&kind=resume'],
      ['mj.col.cover', '/api/apply/file?id=7&kind=cover'], ['mj.open', '/jobs/101'],
    ])
    expect(a.textContent).toContain('温尼伯')   // 城市译名灰字(默认中文界面)
    expect(a.textContent).not.toContain('Winnipeg MB')   // 原「英文名 省码」灰注撤(N6 批省市分开)
    expect(a.textContent).toContain('mj.appliedOn{"d":"2026-10-05"}')
    expect(a.textContent).toContain('ap.applied')
    expect(a.textContent).not.toContain('mj.closed')
    expect(a.textContent).not.toContain('$18/hr')
    const b = rowOf(el, 'Cook')
    expect(links(b)).toEqual([
      ['Steinbach', MAP('Steinbach, Manitoba, Canada')], ['Manitoba', MAP('Manitoba, Canada')],
      ['mj.col.resume', '/api/apply/file?id=8&kind=resume'], ['mj.col.cover', '/api/apply/file?id=8&kind=cover'],
    ])
    expect(b.textContent).toContain('Cook')   // 职位删了:职位名黑字、不成链
    expect(b.textContent).toContain('mj.closed')
    expect(b.textContent).not.toContain('mj.open')
  })

  it('⑨ 草稿行:最近改于、没附件、「继续」去投递区', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [D, S] } } })
    const el = await mount(AppliedList)
    const d = rowOf(el, 'office manager')
    expect(d.textContent).toContain('mj.draft')
    expect(d.textContent).toContain('mj.editedOn{"d":"2026-10-07"}')
    expect(links(d)).toEqual([
      ['office manager', '/jobs/105'], ['Kitchener', MAP('Kitchener, Ontario, Canada')], ['Ontario', MAP('Ontario, Canada')],
    ])
    window.history.replaceState(null, '', '/account?sec=sjobs')
    await click(d, 'mj.cont')   // 2026-10-09 A 批:就地弹投递框(地址栏带上 apply,不整页跳)
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('105')
  })

  it('⑩ 阶段胶囊带计数,点一枚只看那一档', async () => {
    const X = { ...S, id: 11, jobId: 111, title: 'bounced one', stage: 'bounced' }
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [D, S, X] } } })
    const el = await mount(AppliedList)
    expect(buttons(el).slice(0, 6)).toEqual(['mj.all3', 'mj.draft1', 'mj.queued0', 'ap.applied1', 'mj.replied0', 'mj.bounced1'])
    await click(el, 'mj.draft1')
    expect(rowOf(el, 'office manager')).not.toBeNull()
    expect(rowOf(el, 'office manager').textContent).not.toContain('mj.draft')   // 筛到单一状态,行上不再重复挂胶囊(Frank 10-08)
    expect(rowOf(el, 'light duty cleaner')).toBeNull()
    expect(rowOf(el, 'bounced one')).toBeNull()
    await click(el, 'mj.all3')
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()
  })
})

describe('我的收藏', () => {
  it('② 零条出空态', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [] } } })
    expect((await mount(SavedList)).textContent).toContain('sj.empty')
  })

  it('④⑤⑨ 薪资、发布于、没投的没胶囊;有邮箱在架没投过的行「投递」,投过的「打开」,下架的没有「投递」', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [E, A, B] } } })
    const el = await mount(SavedList)
    expect(el.textContent).toContain('mj.savedCount{"n":3}')
    const e = rowOf(el, 'truck washer')
    expect(e.textContent).toContain('$18–$21/hr')
    expect(e.textContent).toContain('mj.postedOn{"d":"2026-09-30"}')
    expect(e.textContent).not.toContain('ap.applied')
    expect(links(e)).toEqual([
      ['truck washer', '/jobs/103'], ['Winnipeg', MAP('Winnipeg, Manitoba, Canada')], ['Manitoba', MAP('Manitoba, Canada')],
    ])
    expect(buttons(e)).toEqual(['mj.apply', 'mj.unsave'])
    window.history.replaceState(null, '', '/account?sec=favs')
    await click(e, 'mj.apply')   // 2026-10-09 A 批:就地弹投递框
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('103')
    const a = rowOf(el, 'light duty cleaner')
    expect(a.textContent).toContain('sj.st.applied')
    expect(links(a)).toEqual([
      ['light duty cleaner', '/jobs/101'], ['Clean Co', '/companies/clean-co'],
      ['Winnipeg', MAP('Winnipeg, Manitoba, Canada')], ['Manitoba', MAP('Manitoba, Canada')], ['mj.open', '/jobs/101'],
    ])
    const b = rowOf(el, 'Cook')
    expect(links(b)).toEqual([['Steinbach', MAP('Steinbach, Manitoba, Canada')], ['Manitoba', MAP('Manitoba, Canada')]])
    expect(buttons(b)).toEqual(['mj.unsave'])
  })

  it('⑦ 取消收藏发 DELETE,成功后那一张没了', async () => {
    const calls = server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'DELETE /api/saved-jobs/9': { status: 200, body: {} },
    })
    const el = await mount(SavedList)
    await act(async () => {
      Array.from(rowOf(el, 'truck washer').querySelectorAll('button')).find((x) => x.textContent === 'mj.unsave')?.click()
    })
    await flush()
    expect(calls).toContain('DELETE /api/saved-jobs/9')
    expect(rowOf(el, 'truck washer')).toBeNull()
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()
  })

  it('⑦ 服务端没删成就退回', async () => {
    server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'DELETE /api/saved-jobs/9': { status: 403, body: {} },
    })
    const el = await mount(SavedList)
    await act(async () => {
      Array.from(rowOf(el, 'truck washer').querySelectorAll('button')).find((x) => x.textContent === 'mj.unsave')?.click()
    })
    await flush()
    expect(rowOf(el, 'truck washer')).not.toBeNull()
  })

  it('⑧ 有公司页的公司名是链,点了叠开公司弹框;没有的是黑字', async () => {
    server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'GET /api/companies/clean-co': 'hang',
    })
    const el = await mount(SavedList)
    // 2026-10-09 N6 批:公司名换 name 桶 CompanyName —— 有公司页的是 /companies/<slug> 链(Ctrl 点新标签开整页),原先是钮
    expect(links(rowOf(el, 'light duty cleaner'))).toContainEqual(['Clean Co', '/companies/clean-co'])
    expect(buttons(rowOf(el, 'light duty cleaner'))).toEqual(['mj.unsave'])
    expect(rowOf(el, 'truck washer').textContent).toContain('Wash Ltd')
    expect(links(rowOf(el, 'truck washer')).map((x) => x[0])).not.toContain('Wash Ltd')
    // 2026-10-09 N 批:公司框改由全站骨架上的 PeekHost 画,本页只往弹框总线上推一层 —— 断言推出去的那一层
    const pushed: object[] = []
    function onPeek(e: Event) {
      pushed.push((e as CustomEvent<{ layer: object }>).detail.layer)
    }
    window.addEventListener('offer2pr:peek', onPeek)
    await act(async () => {
      Array.from(el.querySelectorAll('a')).find((x) => x.textContent === 'Clean Co')?.click()
    })
    await flush()
    window.removeEventListener('offer2pr:peek', onPeek)
    expect(pushed).toEqual([{ kind: 'company', co: { slug: 'clean-co', name: 'Clean Co' } }])
  })
})
