// 「我的」页两张岗位表(2026-10-06;myjobs 组件桶,数据口 /api/myjobs/applied、/api/myjobs/saved;dev 直连生产库不登录,用 jsdom 挂件验)。
// 性质:① 清单没回来不渲;② 零条出各自的空态;③ 接口失败出「刷新再试」,不冒充空态;
//       ④ 一格一个字段(10-06 Frank「拆」):职位名链到职位页(不带译名)、公司、城市(站规双行:有译名用译名,灰注「英文名 省码」;
//          没译名主文案英文、灰注只剩省码)、日期(我的求职 = 投递日期,我的收藏 = 发布日期);
//       ⑤ 投递状态只读:投过的写「已投」、没投过画横杠;职位状态单独一列:在架 / 已下架;没有可点的进度格;
//       ⑥ 职位删了:没有链接、没有「打开」;
//       ⑦ 我的收藏有「取消收藏」:先本地删、发 DELETE /api/saved-jobs/<id>;服务端没删成就退回;我的求职没有这颗钮;
//       ⑧ 照职位板:公司表里有的公司名是钮、点了叠开公司弹框(标题是公司名),没有的是纯文字;城市只出名字不链职位板
//          (10-07 Frank「这个点击跳转去掉」);
//          点表头排序(薪资按折算年薪,不按字面)。
// 2026-10-07 我的求职多两列附件(简历 / 求职信,开 /api/apply/file 的快照与 PDF),我的收藏不出。
// 探针:makeUnsave 失败不退回 → ⑦「失败退回」红;listingTextOf 不认下架 → ④ 职位状态红;
//       cityLabelOf 不认中文界面 → ④ 城市红;makeLoadMyJobs 失败不拨 failed → ③ 红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppliedList, SavedList } from '@/components/myjobs'

const BASE = { titleKo: '', cityKo: '', stage: 'applied', closed: false, salaryAnnual: null, companySlug: '' }
const A = { ...BASE, id: 7, jobId: 101, companySlug: 'clean-co', salaryAnnual: 37440, title: 'light duty cleaner', titleZh: '轻型清洁工', company: 'Clean Co', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18/hr', datePosted: '2026-10-02T00:00:00.000Z', updatedAt: '2026-10-05T15:00:00.000Z' }
const B = { ...BASE, id: 8, jobId: null, title: 'Cook', titleZh: 'Cook', company: 'Pie Wood', city: 'Steinbach', cityZh: '', province: 'MB', salary: '', datePosted: '', updatedAt: '2026-10-04T15:00:00.000Z', closed: true }
const C = { ...BASE, id: 9, jobId: 103, salaryAnnual: 40040, title: 'truck washer', titleZh: '', company: 'Wash Ltd', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18–$21/hr', datePosted: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T15:00:00.000Z', stage: '' }

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

async function mount(comp: typeof AppliedList) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(comp, { t: (k: string) => k, plan: { isPro: false, loggedIn: true } as never }))
  })
  await flush()
  return el
}

// 只看表(卡片流同一份数据,另在 jsdom 里也渲,按 tr 取行)
function rowOf(el: HTMLElement, name: string) {
  return Array.from(el.querySelectorAll('tr')).find((tr) => tr.textContent?.includes(name)) as HTMLElement
}

function cellsOf(row: HTMLElement) {
  return Array.from(row.querySelectorAll('td')).map((td) => td.textContent ?? '')
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
    const el = await mount(AppliedList)
    expect(el.textContent).toBe('')
  })

  it('② 零条出空态', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [] } } })
    const el = await mount(AppliedList)
    expect(el.textContent).toContain('mj.emptyApplied')
  })

  it('③ 接口失败出「刷新再试」,不冒充空态', async () => {
    server({ 'GET /api/myjobs/applied': { status: 500, body: {} } })
    const el = await mount(AppliedList)
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('mj.emptyApplied')
  })

  it('④⑤⑥ 多列、只读状态、职位已删', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [A, B] } } })
    const el = await mount(AppliedList)
    const a = rowOf(el, 'light duty cleaner')
    const [title, company, city, date, stage, listing, resume, cover, act] = cellsOf(a)
    expect(title).toBe('light duty cleaner')
    expect(Array.from(a.querySelectorAll('a')).find((x) => x.textContent === 'light duty cleaner')?.getAttribute('href')).toBe('/jobs/101')
    expect(company).toBe('Clean Co')
    expect(city).toBe('温尼伯Winnipeg MB')
    expect(date).toBe('2026-10-05')
    expect(stage).toBe('sj.st.applied')
    expect(listing).toBe('mj.live')
    expect(resume).toBe('mj.view')
    expect(cover).toBe('mj.view')
    const files = Array.from(a.querySelectorAll('a')).filter((x) => x.textContent === 'mj.view').map((x) => x.getAttribute('href'))
    expect(files).toEqual(['/api/apply/file?id=7&kind=resume', '/api/apply/file?id=7&kind=cover'])
    expect(act).toBe('mj.open')
    expect(Array.from(a.querySelectorAll('button')).map((x) => x.textContent)).toEqual(['Clean Co'])
    const b = rowOf(el, 'Pie Wood')
    const cb = cellsOf(b)
    expect(cb[0]).toBe('Cook')
    expect(cb[2]).toBe('SteinbachMB')
    expect(cb[4]).toBe('sj.st.applied')
    expect(cb[5]).toBe('mj.closed')
    expect(cb[8]).toBe('')
    expect(Array.from(b.querySelectorAll('a')).map((x) => x.textContent)).toEqual(['mj.view', 'mj.view'])
  })
})

describe('我的收藏', () => {
  it('② 零条出空态', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [] } } })
    const el = await mount(SavedList)
    expect(el.textContent).toContain('sj.empty')
  })

  it('④⑤ 薪资、发布日期、没投的状态空着', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } } })
    const el = await mount(SavedList)
    const [, , , salary, date, stage, listing, act] = cellsOf(rowOf(el, 'truck washer'))
    expect(salary).toBe('$18–$21/hr')
    expect(date).toBe('2026-09-30')
    expect(stage).toBe('—')
    expect(listing).toBe('mj.live')
    expect(act).toBe('mj.openmj.unsave')
    expect(cellsOf(rowOf(el, 'light duty cleaner'))[5]).toBe('sj.st.applied')
  })

  it('⑦ 取消收藏发 DELETE,成功后那一行没了', async () => {
    const calls = server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'DELETE /api/saved-jobs/9': { status: 200, body: {} },
    })
    const el = await mount(SavedList)
    const btn = Array.from(rowOf(el, 'truck washer').querySelectorAll('button')).find((x) => x.textContent === 'mj.unsave')
    await act(async () => {
      btn?.click()
    })
    await flush()
    expect(calls).toContain('DELETE /api/saved-jobs/9')
    expect(rowOf(el, 'truck washer')).toBeUndefined()
    expect(rowOf(el, 'light duty cleaner')).toBeDefined()
  })

  it('⑦ 服务端没删成就退回', async () => {
    server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'DELETE /api/saved-jobs/9': { status: 403, body: {} },
    })
    const el = await mount(SavedList)
    const btn = Array.from(rowOf(el, 'truck washer').querySelectorAll('button')).find((x) => x.textContent === 'mj.unsave')
    await act(async () => {
      btn?.click()
    })
    await flush()
    expect(rowOf(el, 'truck washer')).toBeDefined()
  })
})

describe('照职位板:公司弹框、城市链接、排序', () => {
  it('⑧ 有公司页的公司名是钮,点了叠开公司弹框;没有的是纯文字', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } } })
    const el = await mount(SavedList)
    const coBtn = Array.from(rowOf(el, 'light duty cleaner').querySelectorAll('button')).find((x) => x.textContent === 'Clean Co')
    expect(coBtn).toBeDefined()
    expect(Array.from(rowOf(el, 'truck washer').querySelectorAll('button')).some((x) => x.textContent === 'Wash Ltd')).toBe(false)
    await act(async () => {
      coBtn?.click()
    })
    await flush()
    expect(document.body.querySelector('[role="dialog"]')?.textContent ?? document.body.textContent).toContain('Clean Co')
    expect(document.body.textContent?.split('Clean Co').length).toBeGreaterThan(3)
  })

  it('⑧ 城市只出名字,不链职位板', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [A] } } })
    const el = await mount(SavedList)
    const row = rowOf(el, 'light duty cleaner')
    expect(row.textContent).toContain('温尼伯')
    expect(Array.from(row.querySelectorAll('a')).some((x) => x.textContent === '温尼伯')).toBe(false)
  })

  it('⑧ 点薪资表头按折算年薪排', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } } })
    const el = await mount(SavedList)
    const th = Array.from(el.querySelectorAll('th')).find((x) => x.textContent?.includes('col.salary')) as HTMLElement
    await act(async () => {
      th.click()
    })
    await flush()
    const order = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')?.textContent ?? '')
    expect(order[0]).toContain('truck washer')
    expect(order[1]).toContain('light duty cleaner')
  })
})
