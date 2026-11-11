// 「我的」页两张岗位清单(2026-10-06;myjobs 组件桶,数据口 /api/myjobs/applied、/api/myjobs/saved;dev 直连生产库不登录,用 jsdom 挂件验)。
// 2026-10-08 进度板(docs/design/我的模块-求职进度板调研-20261008.md):表换一岗一张横卡,顶上阶段胶囊带计数。
// 性质:① 清单没回来不渲;② 零条出各自的空态(我的求职带「去职位板」);③ 接口失败出「刷新再试」,不冒充空态;
//       ④ 一张横卡:首字母块、职位名链到职位页(普通左键叠开职位描述弹框)、公司、城市(站规:有译名用译名 + 灰注「英文名 省码」;
//          没译名主文案英文、灰注只剩省码)、日期一行(我的求职「投递于」、草稿「最近改于」、我的收藏「发布于」)、状态胶囊;
//    2026-10-10 Frank「去职位板 删掉吧」:我的求职空态只留一行,② 改断言「不带去职位板」。
//       ⑤ 投递状态只读:投过的胶囊「已投递」,没投过没胶囊;下架另挂「已下架」胶囊;我的求职发出去了的行带简历 / 求职信两个链接;
//          2026-10-10 Frank「两处都改吧」:发出时没附求职信(hasCover = false)的行只出简历链接。探针:coverHrefOf 不看 hasCover → 该条红。
//       ⑥ 职位删了:没有链接、没有「打开」;
//    2026-10-10 批 3(1.6 / 2.6):我的投递发出去了的行「打开」从职位页链接改成钮,点了就地弹只读投递框(地址栏 `?app=<投递行 id>`);
//       职位删了的行照样有「打开」(发出那一封与雇主回复还在)—— ④⑥ 改断言。探针:actsOf 投递行回到职位页链接 → ④ 红。
//       2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」:⑦⑪ 点「删除」先弹确认框(mj.delAsk),框里再点「删除」才发 DELETE。
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
// 2026-10-10 批 2「我的求职」四段(16b / 16d):两张清单各成分区白卡(卡头 = 标题 + 计数,「N 个收藏」胶囊撤 → ④⑤⑨ 改断言卡头计数);
//       「草稿」改叫「未发出」、待投并进未发出、未发出不出日期(⑨ 改断言「没有最近改于」);阶段胶囊 全部 / 未发出 / 已投 / 雇主回复 / 退信,
//       计数为 0 的不出(⑩ 改断言)。探针:stagePillsOf 不藏 0 → ⑩ 红。同日 Frank「删吧」:待投(queued)行接口不再列,⑩ 那条待投用例撤。
// 同日 lead 对效果图:网页端改通用表格(行 = tr)、手机一岗一张卡;地点改「一行完整地址 + 市译名灰字」整行一个地图链(原市 / 省两链撤),
//       日期改裸年-月-日(发布 / 收藏于 / 投递于各一列),投递表也出薪资;首字母块撤 → ④⑤⑥ / ⑨ / 收藏 ④⑤⑨ 改断言。
// 2026-10-12 Frank「这个所有的 操作列 都应该有个 删除 按钮」「已下架这个应该有个状态列」:收藏行「取消收藏」改叫「删除」(mj.del),
//       投递行也有「删除」(DELETE /api/myjobs/applied?id=<投递行 id>,⑪);「已下架」从职位名下面挪进状态列胶囊(收藏表加状态列)。
//       探针:removeOf 投递行仍打 /api/saved-jobs → ⑪ 红;tagsOf 不挂已下架 → ⑤ 红。
// 探针:makeUnsave 失败不退回 → ⑦「失败退回」红;closedTextOf 不认下架 → ⑤ 红;byStageOf 不筛 → ⑩ 红;makeLoadMyJobs 失败不拨 failed → ③ 红。
// 2026-11-07 「我的」新域重写(docs/design/我的/我的框架-20261107.md;myjobs / account 桶 → me 桶子桶 jobs 的 JobsBody):
//       三张分区白卡换一条页签「今日推荐 N / 我的收藏 N / 我的投递 N」,本文件挂整页正文 JobsBody、点页签切到要验的那张表;
//       收藏 / 投递条数从卡头挪到页签计数(收藏 ④⑤⑨ 改断言页签字);旧深链 `?sec=favs` 从「滚到收藏卡」改读作「直接落『我的收藏』页签」;
//       一行只留一颗钮(投递:发出去的「打开」、草稿「继续」;收藏:能投的「投递」、投过的「打开」链)—— ④⑤⑥⑨ / 收藏 ④⑤⑨ / ⑧ 改断言「钮恰好那一颗」;
//       撤掉的功能连断言一并撤:⑦ 取消收藏(含失败退回)、⑪ 投递行删除、删除确认框 mj.delAsk、投递行上的简历 / 求职信两个链接(⑤ hasCover 那条)。
//       ① 改读作「页签不挂计数、表格区不渲」;③⑩ 照旧。探针:tabOf 还没拉到也挂计数 → ① 红;actOf 投递行回到职位页链接 → ④ 红;
//       firstTabOf 不认 favs → 深链那条红;tabsOf 收藏计数取 applied → 收藏 ④⑤⑨ 红。
// 2026-11-07 Frank「现在都按 Azure 的来」:收藏 / 投递表的「地址」列(完整地址一行)改「地点」列 —— 链字「市, 省码」、链址仍按完整地址查,
//       灰字「市译名,省译名」照旧;④ 的已投行换一个带街号的完整地址,断言链字与链址分开(列头 mj.col.place)。
//       探针:PlaceCell 回到出 r.address 的形 → ④ 链字那条红。
// 2026-11-07(二)Frank「先做 5 条必备」:删除收进行末「⋯」(menu 桶,无障碍名 mj.more),点了先弹确认框 mj.delAsk ——
//       「一行一颗主钮」的断言照旧,数钮时排除「⋯」(buttons / mainButtons);撤掉的 ⑦ 取消收藏(含失败退回)、⑪ 投递行删除
//       改走「⋯」→ 删除 → 确认接回。探针:removeOf 投递行打 /api/saved-jobs → ⑪ 红;makeRemoveMine 失败不退回 → ⑦ 退回那条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { openAppView } from '@/components/me/apps'
import { secLinkOf } from '@/components/me/functions'
import { JobsBody } from '@/components/me/jobs'

const BASE = {
  titleKo: '', cityKo: '', stage: 'applied', closed: false, salaryAnnual: null, companySlug: '', hasEmail: false, hasCover: true,
  companyZh: '', companyKo: '', address: '', hours: 'full', term: 'permanent', validThrough: '', savedAt: '2026-10-03T15:00:00.000Z',
}
const A = { ...BASE, id: 7, jobId: 101, companySlug: 'clean-co', salaryAnnual: 37440, address: 'Winnipeg, MB', title: 'light duty cleaner', titleZh: '轻型清洁工', company: 'Clean Co', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18/hr', datePosted: '2026-10-02T00:00:00.000Z', updatedAt: '2026-10-05T15:00:00.000Z' }
const B = { ...BASE, id: 8, jobId: null, address: 'Steinbach, MB', title: 'Cook', titleZh: 'Cook', company: 'Pie Wood', city: 'Steinbach', cityZh: '', province: 'MB', salary: '', datePosted: '', updatedAt: '2026-10-04T15:00:00.000Z', closed: true }
const C = { ...BASE, id: 9, jobId: 103, salaryAnnual: 40040, address: 'Winnipeg, MB', title: 'truck washer', titleZh: '', company: 'Wash Ltd', city: 'Winnipeg', cityZh: '温尼伯', province: 'MB', salary: '$18–$21/hr', datePosted: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T15:00:00.000Z', stage: '' }
const D = { ...BASE, id: 10, jobId: 105, address: 'Kitchener, ON', title: 'office manager', titleZh: '', company: 'Anurag Homes Team', city: 'Kitchener', cityZh: '基奇纳', province: 'ON', salary: '$80K/yr', datePosted: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-07T10:00:00.000Z', stage: 'draft' }
const E = { ...C, hasEmail: true }
const S = { ...A, stage: 'sent', address: '393 Portage Ave, Winnipeg, MB R3B 3H6' }

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

// 2026-11-07:挂整页正文 JobsBody(打开只读投递框注入真的 openAppView),再点页签切到要验的那张表
// 2026-11-09 Frank「这三个是不是都放到侧边栏比较好」:页签条撤,出哪一张表由 tab 这个 prop 定(侧边栏点的,页面递来)
type Tab = 'picks' | 'saved' | 'applied'

async function mount(tab: Tab) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(JobsBody, {
      t, tab, plan: { isPro: false, loggedIn: true }, gen: 0, asked: 0, onFill: () => undefined,
      openApp: openAppView,
    }))
  })
  await flush()
  return el
}

// 那张白卡(当前这一项的表 / 空态 / 失败一句)
function panelOf(el: HTMLElement) {
  return el.querySelector('section') as HTMLElement
}

// 页签以外的钮(阶段筛选药丸、行上那颗钮、显示更多)
function nonTabButtons(el: HTMLElement) {
  return Array.from(el.querySelectorAll('button:not([role="tab"])')).map((b) => b.textContent)
}

// 一张横卡:按职位名找,往上到带 data-row 的那层;没有这一张给 null
function rowOf(el: HTMLElement, name: string) {
  const title = Array.from(el.querySelectorAll('a, span')).find((x) => x.textContent === name)
  return (title?.closest('[data-row], tr') ?? null) as HTMLElement
}

function links(row: HTMLElement) {
  return Array.from(row.querySelectorAll('a')).map((a) => [a.textContent, a.getAttribute('href')])
}

function buttons(row: HTMLElement) {
  return Array.from(row.querySelectorAll('button:not([aria-label="mj.more"])')).map((b) => b.textContent)
}

// 行末「⋯」→「删除」→ 确认框「删除」(2026-11-07 二)
async function deleteRow(el: HTMLElement, row: HTMLElement) {
  await act(async () => {
    (row.querySelector('button[aria-label="mj.more"]') as HTMLButtonElement).click()
  })
  await click(row, 'mj.del')
  expect(document.body.textContent).toContain('mj.delAsk')
  await click(document.body, 'mj.del')
}

async function click(el: HTMLElement, text: string) {
  await act(async () => {
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent === text)?.click()
  })
  await flush()
}

// jsdom 没有 matchMedia(弹框按它判窄屏;清单按它判手机条 / 网页表格);给一个「不是窄屏」的桩 → 走网页端表格
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  // 2026-11-07:进页落哪一枚页签读地址栏(`?sec=favs`),开投递框 / 只读投递框往地址栏推参数 —— 每条用例从干净地址起
  window.history.replaceState(null, '', '/account')
})

describe('我的求职', () => {
  it('① 清单没回来不渲:表格区空着', async () => {
    server({ 'GET /api/myjobs/applied': 'hang' })
    const el = await mount('applied')
    expect(panelOf(el).textContent).toBe('')
  })

  it('② 零条出空态,不带去职位板', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [] } } })
    const el = await mount('applied')
    expect(panelOf(el).textContent).toContain('mj.emptyApplied')
    expect(Array.from(el.querySelectorAll('a')).find((x) => x.textContent === 'mj.toBoard')).toBeUndefined()
  })

  it('③ 接口失败出「刷新再试」,不冒充空态', async () => {
    server({ 'GET /api/myjobs/applied': { status: 500, body: {} } })
    const el = await mount('applied')
    expect(panelOf(el).textContent).toContain('mj.fail')
    expect(panelOf(el).textContent).not.toContain('mj.emptyApplied')
  })

  it('④⑤⑥ 表格行:职位链、公司、地点「市, 省码」(完整地址的地图链 + 市译名灰字)、薪资、工时 / 雇佣期、投递于、状态胶囊、唯一一颗「打开」;职位已删', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [S, B] } } })
    const el = await mount('applied')
    const a = rowOf(el, 'light duty cleaner')
    expect(a.tagName).toBe('TR')   // 2026-10-10 批 2:网页端走通用表格
    // 2026-11-07 效果图:投递行上的简历 / 求职信两个链接撤(只读投递框里照有)
    // 2026-11-07:「地址」列改「地点」列 —— 链字「市, 省码」,链址仍按完整地址一行查;完整地址不上屏
    expect(links(a)).toEqual([
      ['light duty cleaner', '/jobs/101'], ['Clean Co', '/companies/clean-co'],
      ['Winnipeg, MB', MAP('393 Portage Ave, Winnipeg, MB R3B 3H6')],
    ])
    expect(a.textContent).not.toContain('393 Portage Ave')
    expect(panelOf(el).textContent).toContain('mj.col.place')
    expect(panelOf(el).textContent).not.toContain('mj.col.addr')
    expect(a.textContent).toContain('温尼伯')   // 地点灰字「市译名,省译名」(默认中文界面)
    expect(a.textContent).toContain('Full-time')
    expect(a.textContent).toContain('Permanent')
    expect(a.textContent).toContain('2026-10-05')   // 投递于
    expect(a.textContent).toContain('ap.applied')
    expect(a.textContent).not.toContain('mj.closed')
    expect(a.textContent).toContain('$18/hr')   // 2026-10-10 批 2:投递表也出薪资列
    const b = rowOf(el, 'Cook')
    expect(links(b)).toEqual([['Steinbach, MB', MAP('Steinbach, MB')]])
    expect(b.textContent).toContain('Cook')   // 职位删了:职位名黑字、不成链
    expect(b.textContent).toContain('mj.closed')
    // 2026-11-07 效果图:一行一颗钮 —— 发出去的(连职位删了的)只剩「打开」,「删除」撤
    expect(buttons(b)).toEqual(['mj.open'])
    expect(buttons(a)).toEqual(['mj.open'])
    await act(async () => {
      Array.from(a.querySelectorAll('button')).find((x) => x.textContent === 'mj.open')?.click()
    })
    expect(new URL(window.location.href).searchParams.get('app')).toBe('7')
    await act(async () => {
      Array.from(b.querySelectorAll('button')).find((x) => x.textContent === 'mj.open')?.click()
    })
    expect(new URL(window.location.href).searchParams.get('app')).toBe('8')
  })

  it('⑨ 草稿行:未发出、不出日期、没附件、唯一一颗「继续」就地弹投递框', async () => {
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [D, S] } } })
    const el = await mount('applied')
    const d = rowOf(el, 'office manager')
    expect(d.textContent).toContain('mj.unsent')
    expect(d.textContent).not.toContain('2026-10-07')   // 未发出不出投递于 / 改于
    expect(links(d)).toEqual([['office manager', '/jobs/105'], ['Kitchener, ON', MAP('Kitchener, ON')]])
    expect(buttons(d)).toEqual(['mj.cont'])   // 2026-11-07:一行一颗钮
    window.history.replaceState(null, '', '/account?sec=sjobs')
    await click(d, 'mj.cont')   // 2026-10-09 A 批:就地弹投递框(地址栏带上 apply,不整页跳)
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('105')
    expect(new URLSearchParams(window.location.search).get('app')).toBeNull()   // 不是只读投递框
  })

  it('⑪ 投递行「⋯」→ 删除 → 确认:打 /api/myjobs/applied?id=<投递行 id>,这一行没了', async () => {
    const calls = server({
      'GET /api/myjobs/applied': { status: 200, body: { items: [D, S] } },
      'DELETE /api/myjobs/applied?id=10': { status: 200, body: { ok: true } },
    })
    const el = await mount('applied')
    await deleteRow(el, rowOf(el, 'office manager'))
    expect(calls).toContain('DELETE /api/myjobs/applied?id=10')
    expect(rowOf(el, 'office manager')).toBeNull()
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()
  })

  it('⑩ 阶段胶囊带计数,点一枚只看那一档', async () => {
    const X = { ...S, id: 11, jobId: 111, title: 'bounced one', stage: 'bounced' }
    server({ 'GET /api/myjobs/applied': { status: 200, body: { items: [D, S, X] } } })
    const el = await mount('applied')
    // 2026-11-07:页签也是钮,药丸从页签以外的钮里数
    expect(nonTabButtons(el).slice(0, 4)).toEqual(['mj.all3', 'mj.unsent1', 'ap.applied1', 'mj.bounced1'])
    expect(nonTabButtons(el).some((b) => b?.startsWith('mj.replied'))).toBe(false)   // 计数 0 的不出
    await click(el, 'mj.unsent1')
    expect(rowOf(el, 'office manager')).not.toBeNull()
    expect(rowOf(el, 'office manager').textContent).not.toContain('mj.unsent')   // 筛到单一状态,行上不再重复挂胶囊(Frank 10-08)
    expect(rowOf(el, 'light duty cleaner')).toBeNull()
    expect(rowOf(el, 'bounced one')).toBeNull()
    await click(el, 'mj.all3')
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()
  })
})

describe('我的收藏', () => {
  it('旧深链 ?sec=favs 落侧边栏的「我的收藏」子项;?sec=sjobs 落「我的求职」;子项的键也认(2026-11-09 改:原「落我的收藏页签」)', async () => {
    window.history.replaceState(null, '', '/account?sec=favs')
    expect(secLinkOf()).toBe('saved')
    window.history.replaceState(null, '', '/account?sec=sjobs')
    expect(secLinkOf()).toBe('sjobs')
    window.history.replaceState(null, '', '/account?sec=applied')
    expect(secLinkOf()).toBe('applied')
    window.history.replaceState(null, '', '/account?sec=nope')
    expect(secLinkOf()).toBeNull()
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [A] } } })
    const el = await mount('saved')
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()
    expect(el.querySelector('[role="tab"]')).toBeNull()   // 页签条撤了
  })

  it('② 零条出空态', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [] } } })
    expect(panelOf(await mount('saved')).textContent).toContain('sj.empty')
  })

  it('④⑤⑨ 薪资、发布于、没投的没胶囊;有邮箱在架没投过的行「投递」,投过的「打开」,下架的没有钮', async () => {
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [E, A, B] } } })
    const el = await mount('saved')
    const e = rowOf(el, 'truck washer')
    expect(e.textContent).toContain('$18–$21/hr')
    expect(e.textContent).toContain('2026-09-30')   // 发布日期
    expect(e.textContent).toContain('2026-10-03')   // 收藏于
    expect(e.textContent).not.toContain('ap.applied')
    expect(links(e)).toEqual([['truck washer', '/jobs/103'], ['Winnipeg, MB', MAP('Winnipeg, MB')]])
    expect(buttons(e)).toEqual(['mj.apply'])   // 2026-11-07:一行一颗钮,「删除」撤
    window.history.replaceState(null, '', '/account?sec=favs')
    await click(e, 'mj.apply')   // 2026-10-09 A 批:就地弹投递框
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('103')
    const a = rowOf(el, 'light duty cleaner')
    expect(buttons(a)).toEqual([])   // 投过的收藏行:「打开」是链、没有「投递」
    expect(a.textContent).toContain('sj.st.applied')   // 投过的有状态胶囊
    expect(links(a)).toEqual([
      ['light duty cleaner', '/jobs/101'], ['Clean Co', '/companies/clean-co'], ['Winnipeg, MB', MAP('Winnipeg, MB')],
      ['mj.open', '/jobs/101'],
    ])
    const b = rowOf(el, 'Cook')
    expect(links(b)).toEqual([['Steinbach, MB', MAP('Steinbach, MB')]])
    expect(buttons(b)).toEqual([])   // 下架又职位删了:没有钮(2026-11-07「删除」撤)
    expect(b.textContent).toContain('mj.closed')
  })

  it('⑦ 收藏行「⋯」→ 删除 → 确认:删的是收藏记录(/api/saved-jobs/<收藏 id>),行没了;服务端没删成退回原样', async () => {
    const calls = server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [E, A] } },
      'DELETE /api/saved-jobs/9': { status: 200, body: {} },
      'DELETE /api/saved-jobs/7': { status: 500, body: {} },
    })
    const el = await mount('saved')
    await deleteRow(el, rowOf(el, 'truck washer'))
    expect(calls).toContain('DELETE /api/saved-jobs/9')
    expect(rowOf(el, 'truck washer')).toBeNull()
    await deleteRow(el, rowOf(el, 'light duty cleaner'))
    expect(calls).toContain('DELETE /api/saved-jobs/7')
    expect(rowOf(el, 'light duty cleaner')).not.toBeNull()   // 500:退回
  })

  it('⑨ 收藏行没有投递邮箱 / 已下架:不出「投递」', async () => {
    const noMail = { ...C, id: 21, title: 'no mail job' }
    const closed = { ...E, id: 22, jobId: 104, title: 'closed with mail', closed: true }
    server({ 'GET /api/myjobs/saved': { status: 200, body: { items: [noMail, closed] } } })
    const el = await mount('saved')
    expect(buttons(rowOf(el, 'no mail job'))).toEqual([])
    expect(buttons(rowOf(el, 'closed with mail'))).toEqual([])
  })

  it('⑧ 有公司页的公司名是链,点了叠开公司弹框;没有的是黑字', async () => {
    server({
      'GET /api/myjobs/saved': { status: 200, body: { items: [A, C] } },
      'GET /api/companies/clean-co': 'hang',
    })
    const el = await mount('saved')
    // 2026-10-09 N6 批:公司名换 name 桶 CompanyName —— 有公司页的是 /companies/<slug> 链(Ctrl 点新标签开整页),原先是钮
    expect(links(rowOf(el, 'light duty cleaner'))).toContainEqual(['Clean Co', '/companies/clean-co'])
    expect(buttons(rowOf(el, 'light duty cleaner'))).toEqual([])   // 2026-11-07:「删除」撤,公司名不是钮
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
