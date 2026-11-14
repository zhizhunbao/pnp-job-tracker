// 访客向导的走法与交接(2026-10-04 收口审查;设计稿 docs/design/通用/付费闭环-20261003.md 10-04 各节)。
// 来由:交接戳原先只有 × 撤 —— 浏览器返回、换页、弹它的那一页自己卸掉,戳都留着,10 分钟内页头登录就替他交草稿;
//       点目标大卡 / 下一步时被点的钮跟着这一屏卸掉,焦点掉回 body。
// 性质:① 向导没在注册屏注册 / 登录成就卸掉 → 交接戳撤掉(草稿照留,只给下次预填);
//       ② 邮箱注册当场:交成了戳撤、卸掉不再动;交没成戳放回去,卸掉向导也不撤(等补交);
//       ③ Google 整页登录:走到注册屏落戳,跳走是整页卸载(React 不跑收尾器)—— 回跳那一页登录态下补交钩子取戳、
//          并进答案档、回职位板按答案筛;
//       ④ 换了题焦点挪到题面(id + tabIndex -1);开屏不挪(焦点不抢、背后页面不滚);返回也挪。
// 探针:去掉 dropHandoffOnLeave → ①红;dropGateHandoff 不看 isGateSignedIn → ②「交没成卸掉不撤」红;
//       focusGateQuestion 恒 return → ④「点目标大卡后焦点在题面」红;开屏也挪 → ④「开屏不挪」红。
// 2026-10-09「我的档案」批:首访引导向导退役,「记引导弹过」(本地存储 jobs_onboarding_v1)那一记从 gate 撤 ——
//       ② ③ 里对它的断言删(③ 原先拿它等补交那一跑交成,交成的证据改由随后的戳 / 草稿 / 地址栏断言给)。
// 2026-10-11 Frank「我应该先注册 再问问题吧」→「需要改」:访客不再答题,访客向导与交接戳整套删 —— ①②③ 随之删;
//       ④ 换题挪焦点照验,挂的件从访客向导换成档案编辑弹框 GateEdit(同一个 focusGateQuestion)。
// 2026-11-07 Frank「删了吧」:一题一屏的 GateEdit 换成一页表单 GateForm(右侧面板)后删,没有「换题」了 ——
//       ④ 换题挪焦点(连 focusGateQuestion、返回钮、没答下一步灰)整条撤;改验一页表单上还活着的三样(挂 GateForm):
//       ⑤ 保存:七格的值一次推进答案档(目标、所在地 + 城市、身份、教育经历),填了英文姓名另存署名,存成交还 onSaved;
//          没登录(答案档 401)框不关、摆一行 gate.saveFail、不交还;
//       ⑥ 城市:选了省才出城市区(按省取、在招多的在前),点一个亮、再点取消;改选「加拿大境外」城市区收起;
//       ⑦ 教育经历:「+ 再加一段」加到两段为止(钮收起),✕ 删一段;只剩一段时 ✕ 清空那一段、界面总留一行。
// 探针:editPatchOf 漏 fitEdu → ⑤「fitEdu」红;makeProvPick 不清城市 → ⑥「换境外再换回城市没亮」红;
//       makeEduRemove 去掉「只剩一段补空段」→ ⑦「总留一行」红。
// 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」「这部分不能直接显示具体的年份和学历 证书吗?」:
//       ⑤ 加验教育经历明细(名称、学校、起止年份)进答案档 eduList,fitEdu 由它派生;
//       ⑧ 匹配规则:一只下拉四项,选哪项存哪一对(matchBy, matchMode);档案里的那一对开面板时亮对应那一项;
//       ⑨ 从简历填写:提取到的教育经历并进几段(先填明细全空的那一段、再往后加),再点一次不重复。
// 探针:makeRulePick 不落 matchMode → ⑧「workStrict」红;editPatchOf 漏 eduList → ⑤「eduList」红;
//       eduMergedOf 不查重 → ⑨「再点一次」红。
// 2026-11-12 Frank「有年份 还需要时长吗」「简历里能抽出来吧」:
//       ⑨ 加验提取到的院校所在地、公立私立、课程时长只填还空着的下拉(选过的那一段三只照留,新加的一段用简历的);
//       ⑩ 手填年份或名称时,时长下拉空着就替他推一个;有值之后(推的或他选的)不再自动改。
// 探针:eduSelOf 不看 have → ⑨「第一段三只照留」红;eduCellSetOf 不看 row.len → ⑩「改到四年后还是 y2」红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内件直接点文件(桶只走门的规矩不管测试)
import { GateForm } from '@/components/gate/gateform'
import type { TFn } from '@/lib/i18n'
import { resetAnswersMemory } from '@/lib/quiz'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace, push: () => undefined }),
  usePathname: () => PATH.current,
}))

const t = ((key: string) => key) as TFn

// 档案全空(GateForm 七格从这里起)
const EMPTY_SEED = { goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', name: '', who: '', edu: [], eduList: [], workNocs: [], matchBy: '', matchMode: '', fromResume: [], cv: { work: [], phone: '', link: '', skills: '', tpl: 'classic' } }

// 从简历提取的回包(⑨ 用;别的用例不点「从简历填写」)
const PREFILL = {
  works: [], majors: [], name: '',
  education: [
    { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', prov: 'BC', kind: 'private', len: 'y2' },
    { credential: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', prov: 'abroad', kind: 'public', len: 'y3' },
  ],
}

const ON_CITIES = [
  { name: 'Toronto', zh: '', ko: '', jobs: 900 },
  { name: 'Ottawa', zh: '', ko: '', jobs: 280 },
]

function reply(status: number, body: object) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

type Sent = { url: string, method: string, body: string }

// 假服务端:答案档 GET 回 answersStatus(200 = 已登录、档空;401 = 会话没了);按省取城市回 ON_CITIES;
// 其余(推答案档、改署名、读当前用户、取热门专业 / 职业)一律 200 空对象;每一发非 GET 都记下来
function server(answersStatus = 200): Sent[] {
  const sent: Sent[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init != null && init.method != null ? init.method : 'GET'
    if (method !== 'GET') {
      sent.push({ url: String(url), method, body: String(init?.body) })
      if (String(url) === '/api/resume/prefill') {
        return reply(200, PREFILL)
      }
      return reply(200, { ok: true })
    }
    if (String(url) === '/api/quiz/answers') {
      return reply(answersStatus, { answers: null })
    }
    if (String(url).startsWith('/api/stats/cities?prov=')) {
      return reply(200, { cities: ON_CITIES })
    }
    return reply(200, {})
  }))
  return sent
}

function mount(onSaved: () => void = () => undefined, seed: typeof EMPTY_SEED = EMPTY_SEED) {
  // jsdom 没有 matchMedia(modal / drawer 判窄屏要它):按宽屏答,不挂监听
  vi.stubGlobal('matchMedia', () => ({
    matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined,
  }))
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(GateForm, { t, seed, onClose: () => undefined, onSaved }))
  })
  return { host, root }
}

function buttonOf(host: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll('button')).find((b) => b.textContent === text)
}

// 2026-11-12 Frank「这个也需要弹框吧」「这个也弹框修改」:所在地、教育经历两格改成摘要加「修改」,省下拉 / 城市 / 教育经历几段
// 挪进叠开的弹框 —— 先点那一格的「修改」(面板里自上而下:想做的工作 0、做过的工作 1、所在地 2、教育经历 3;2026-11-12 专业那一格撤,并进教育经历的每一段),
// 改完点「选好了」收起
const EDIT_WHERE = 2
const EDIT_EDU = 3
function openEdit(host: HTMLElement, at: number) {
  const btn = Array.from(host.querySelectorAll('button')).filter((b) => b.textContent === 'pf.edit')[at]
  if (btn == null) {
    throw new Error('edit button not rendered: ' + at)
  }
  act(() => btn.click())
}

function closePick(host: HTMLElement) {
  act(() => (buttonOf(host, 'pf.pickDone') as HTMLButtonElement).click())
}

// 首项是 pf.none、含某个取值的那只下拉(所在地含 ON,身份含 pgwp;教育经历的三只首项是 fit.edu*)
function selectWith(host: HTMLElement, value: string): HTMLSelectElement {
  const el = Array.from(host.querySelectorAll('select')).find((s) =>
    s.options[0]?.textContent === 'pf.none' && Array.from(s.options).some((o) => o.value === value))
  if (el == null) {
    throw new Error('select not rendered: ' + value)
  }
  return el
}

function pick(el: HTMLSelectElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  act(() => {
    setValue?.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function type(el: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setValue?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

// 教育经历一段 = 三只下拉(所在地 / 公立私立 / 时长,DOM 里挨着),按序三只一组
// (2026-11-12 多了一只首项是 pf.rule.work 的「匹配规则」下拉:改按首项是 fit.edu* 认)
function eduLines(host: HTMLElement): HTMLSelectElement[][] {
  const edu = Array.from(host.querySelectorAll('select')).filter((s) => String(s.options[0]?.textContent).startsWith('fit.edu'))
  const out: HTMLSelectElement[][] = []
  for (let i = 0; i < edu.length; i += 3) {
    out.push(edu.slice(i, i + 3))
  }
  return out
}

// 教育经历明细的输入框:按占位词认(pf.eduCred / pf.eduSchool / pf.eduFrom / pf.eduTo),一段一个,按序
function eduInputs(host: HTMLElement, key: string): HTMLInputElement[] {
  return Array.from(host.querySelectorAll('input[placeholder="' + key + '"]')) as HTMLInputElement[]
}

// 「匹配规则」那只下拉:首项是 pf.rule.work
function ruleSelect(host: HTMLElement): HTMLSelectElement {
  const el = Array.from(host.querySelectorAll('select')).find((s) => s.options[0]?.textContent === 'pf.rule.work')
  if (el == null) {
    throw new Error('rule select not rendered')
  }
  return el
}

async function saveAndReadBasic(m: { host: HTMLElement }, sent: Sent[], onSaved: ReturnType<typeof vi.fn>, n: number) {
  act(() => (buttonOf(m.host, 'gate.save') as HTMLButtonElement).click())
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(n))
  const puts = sent.filter((s) => s.method === 'PUT' && s.url === '/api/quiz/answers')
  return JSON.parse(puts[puts.length - 1]?.body as string).basic
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  document.cookie = 'o2p_li=; path=/; max-age=0'
  resetAnswersMemory()
  PATH.current = '/'
  ROUTER.replace.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.cookie = 'o2p_li=; path=/; max-age=0'
  document.body.innerHTML = ''
})

describe('⑤ 一页表单保存(2026-11-07 GateForm)', () => {
  it('七格一次推进答案档;填了英文姓名另存署名;存成交还 onSaved', async () => {
    const sent = server()
    const onSaved = vi.fn()
    const m = mount(onSaved)
    act(() => (buttonOf(m.host, 'home.g.pr') as HTMLButtonElement).click())
    openEdit(m.host, EDIT_WHERE)
    pick(selectWith(m.host, 'ON'), 'ON')
    await vi.waitFor(() => expect(buttonOf(m.host, 'Toronto')).not.toBeUndefined())
    act(() => (buttonOf(m.host, 'Toronto') as HTMLButtonElement).click())
    closePick(m.host)
    pick(selectWith(m.host, 'pgwp'), 'pgwp')
    openEdit(m.host, EDIT_EDU)
    const [line] = eduLines(m.host)
    pick(line?.[0] as HTMLSelectElement, 'ON')
    pick(line?.[1] as HTMLSelectElement, 'public')
    pick(line?.[2] as HTMLSelectElement, 'y1')
    type(eduInputs(m.host, 'pf.eduCred')[0] as HTMLInputElement, ' Graduate Certificate ')
    type(eduInputs(m.host, 'pf.eduSchool')[0] as HTMLInputElement, 'Algonquin College')
    type(eduInputs(m.host, 'pf.eduFrom')[0] as HTMLInputElement, '2025x')
    type(eduInputs(m.host, 'pf.eduTo')[0] as HTMLInputElement, '20261')
    expect(eduInputs(m.host, 'pf.eduFrom')[0]?.value).toBe('2025')
    expect(eduInputs(m.host, 'pf.eduTo')[0]?.value).toBe('2026')
    closePick(m.host)
    type(m.host.querySelector('input[placeholder="Li Wei"]') as HTMLInputElement, ' Li Wei ')
    act(() => (buttonOf(m.host, 'gate.save') as HTMLButtonElement).click())
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const puts = sent.filter((s) => s.method === 'PUT' && s.url === '/api/quiz/answers')
    expect(puts.length).toBeGreaterThan(0)
    const basic = JSON.parse(puts[puts.length - 1]?.body as string).basic
    expect(basic.goalBand).toBe(1)
    expect(basic.resProv).toBe('ON')
    expect(basic.resCity).toBe('Toronto')
    expect(basic.fitWho).toBe('pgwp')
    expect(basic.fitEdu).toEqual(['ON.public.y1'])
    expect(basic.eduList).toEqual([
      { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' },
    ])
    expect(basic.matchBy).toBe('')
    expect(basic.matchMode).toBe('')
    const names = sent.filter((s) => s.url === '/api/apply/name')
    expect(names.map((s) => s.method)).toEqual(['PATCH'])
    expect(JSON.parse(names[0]?.body as string)).toEqual({ senderName: 'Li Wei' })
    act(() => m.root.unmount())
  })

  it('没登录(答案档 401):框不关、摆一行 gate.saveFail、不交还', async () => {
    server(401)
    const onSaved = vi.fn()
    const m = mount(onSaved)
    act(() => (buttonOf(m.host, 'home.g.jobs') as HTMLButtonElement).click())
    act(() => (buttonOf(m.host, 'gate.save') as HTMLButtonElement).click())
    await vi.waitFor(() => expect(m.host.textContent).toContain('gate.saveFail'))
    expect(onSaved).not.toHaveBeenCalled()
    expect(buttonOf(m.host, 'gate.save')).not.toBeUndefined()
    act(() => m.root.unmount())
  })
})

describe('⑧ 匹配规则一只下拉(2026-11-12)', () => {
  it('四项;选哪项存哪一对 (matchBy, matchMode);原先那两排两段钮不在了', async () => {
    const sent = server()
    const onSaved = vi.fn()
    const m = mount(onSaved)
    const rule = ruleSelect(m.host)
    expect(Array.from(rule.options).map((o) => o.textContent))
      .toEqual(['pf.rule.work', 'pf.rule.workStrict', 'pf.rule.edu', 'pf.rule.eduStrict'])
    expect(rule.value).toBe('')
    expect(m.host.textContent).toContain('pf.rule')
    expect(m.host.textContent).not.toContain('pf.matchBy')
    expect(m.host.textContent).not.toContain('pf.matchMode')
    const want = [
      { v: 'workStrict', matchBy: 'work', matchMode: 'strict' },
      { v: 'edu', matchBy: 'edu', matchMode: 'default' },
      { v: 'eduStrict', matchBy: 'edu', matchMode: 'strict' },
      { v: '', matchBy: 'work', matchMode: 'default' },
    ]
    for (const [i, w] of want.entries()) {
      pick(ruleSelect(m.host), w.v)
      expect(ruleSelect(m.host).value).toBe(w.v)
      const basic = await saveAndReadBasic(m, sent, onSaved, i + 1)
      expect({ matchBy: basic.matchBy, matchMode: basic.matchMode }).toEqual({ matchBy: w.matchBy, matchMode: w.matchMode })
    }
    act(() => m.root.unmount())
  })

  it('档案里的那一对开面板时亮对应那一项', () => {
    server()
    const m = mount(() => undefined, { ...EMPTY_SEED, matchBy: 'edu', matchMode: 'strict' })
    expect(ruleSelect(m.host).value).toBe('eduStrict')
    act(() => m.root.unmount())
  })
})

describe('⑨ 从简历填写教育经历(2026-11-12)', () => {
  it('先填明细全空的那一段(选过的三只下拉照留)、再往后加一段(三只下拉用简历的);再点一次不重复;保存后 fitEdu 是选全三格的段', async () => {
    const sent = server()
    const onSaved = vi.fn()
    const m = mount(onSaved)
    openEdit(m.host, EDIT_EDU)
    const [line] = eduLines(m.host)
    pick(line?.[0] as HTMLSelectElement, 'ON')
    pick(line?.[1] as HTMLSelectElement, 'public')
    pick(line?.[2] as HTMLSelectElement, 'y1')
    act(() => (buttonOf(m.host, 'pf.fill') as HTMLButtonElement).click())
    await vi.waitFor(() => expect(eduInputs(m.host, 'pf.eduCred')).toHaveLength(2))
    expect(eduInputs(m.host, 'pf.eduCred').map((i) => i.value)).toEqual(['Graduate Certificate', 'Bachelor of Engineering'])
    expect(eduInputs(m.host, 'pf.eduSchool').map((i) => i.value)).toEqual(['Algonquin College', 'Wuhan University'])
    expect(eduInputs(m.host, 'pf.eduFrom').map((i) => i.value)).toEqual(['2025', '2014'])
    expect(eduLines(m.host)[0]?.map((s) => s.value)).toEqual(['ON', 'public', 'y1'])
    expect(eduLines(m.host)[1]?.map((s) => s.value)).toEqual(['abroad', 'public', 'y3'])
    // 2026-11-13 Frank「这个绿条不需要」:填上了不出提示;读完进度条收掉
    await vi.waitFor(() => expect(m.host.querySelector('[role="progressbar"]')).toBeNull())
    expect(m.host.textContent).not.toContain('pf.fillOk')
    act(() => (buttonOf(m.host, 'pf.fill') as HTMLButtonElement).click())
    await vi.waitFor(() => expect(m.host.textContent).toContain('pf.fillNone'))
    expect(eduInputs(m.host, 'pf.eduCred')).toHaveLength(2)
    const basic = await saveAndReadBasic(m, sent, onSaved, 1)
    expect(basic.eduList).toEqual([
      { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' },
      { key: 'abroad.public.y3', cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', major: '' },
    ])
    expect(basic.fitEdu).toEqual(['ON.public.y1', 'abroad.public.y3'])
    act(() => m.root.unmount())
  })
})

describe('⑩ 手填时替他推课程时长(2026-11-12)', () => {
  it('填了起止年份时长下拉自己亮;之后再改年份、名称不动它;他自己改选照他的', () => {
    server()
    const m = mount()
    openEdit(m.host, EDIT_EDU)
    const lenOf = () => eduLines(m.host)[0]?.[2]?.value
    expect(lenOf()).toBe('')
    type(eduInputs(m.host, 'pf.eduFrom')[0] as HTMLInputElement, '2024')
    expect(lenOf()).toBe('')
    type(eduInputs(m.host, 'pf.eduTo')[0] as HTMLInputElement, '2026')
    expect(lenOf()).toBe('y2')
    type(eduInputs(m.host, 'pf.eduTo')[0] as HTMLInputElement, '2028')
    expect(lenOf()).toBe('y2')
    type(eduInputs(m.host, 'pf.eduCred')[0] as HTMLInputElement, 'Master of Science')
    expect(lenOf()).toBe('y2')
    pick(eduLines(m.host)[0]?.[2] as HTMLSelectElement, 'master')
    type(eduInputs(m.host, 'pf.eduCred')[0] as HTMLInputElement, 'Diploma')
    expect(lenOf()).toBe('master')
    expect(eduLines(m.host)[0]?.slice(0, 2).map((s) => s.value)).toEqual(['', ''])
    act(() => m.root.unmount())
  })

  it('名称写明是硕士类:时长下拉亮 master', () => {
    server()
    const m = mount()
    openEdit(m.host, EDIT_EDU)
    type(eduInputs(m.host, 'pf.eduCred')[0] as HTMLInputElement, 'MBA')
    expect(eduLines(m.host)[0]?.[2]?.value).toBe('master')
    act(() => m.root.unmount())
  })
})

describe('⑥ 城市区(2026-11-07 改挂 GateForm)', () => {
  it('选了省才出;点一个亮、再点取消;改选境外收起,再选回省城市没亮', async () => {
    server()
    const m = mount()
    expect(m.host.textContent).not.toContain('gate.city')
    openEdit(m.host, EDIT_WHERE)
    expect(m.host.textContent).not.toContain('gate.city')
    const prov = selectWith(m.host, 'ON')
    pick(prov, 'ON')
    await vi.waitFor(() => expect(buttonOf(m.host, 'Toronto')).not.toBeUndefined())
    expect(Array.from(m.host.querySelectorAll('button[aria-pressed]')).map((b) => b.textContent))
      .toEqual(expect.arrayContaining(['Toronto', 'Ottawa']))
    act(() => (buttonOf(m.host, 'Toronto') as HTMLButtonElement).click())
    expect(buttonOf(m.host, 'Toronto')?.getAttribute('aria-pressed')).toBe('true')
    act(() => (buttonOf(m.host, 'Toronto') as HTMLButtonElement).click())
    expect(buttonOf(m.host, 'Toronto')?.getAttribute('aria-pressed')).toBe('false')
    act(() => (buttonOf(m.host, 'Toronto') as HTMLButtonElement).click())
    pick(prov, 'abroad')
    expect(buttonOf(m.host, 'Toronto')).toBeUndefined()
    pick(prov, 'ON')
    await vi.waitFor(() => expect(buttonOf(m.host, 'Toronto')).not.toBeUndefined())
    expect(buttonOf(m.host, 'Toronto')?.getAttribute('aria-pressed')).toBe('false')
    act(() => m.root.unmount())
  })
})

describe('⑦ 教育经历几段(2026-11-07 改挂 GateForm)', () => {
  it('加到两段为止;✕ 删一段;只剩一段时 ✕ 清空那一段、总留一行', () => {
    server()
    const m = mount()
    openEdit(m.host, EDIT_EDU)
    expect(eduLines(m.host)).toHaveLength(1)
    act(() => (buttonOf(m.host, 'fit.addRow') as HTMLButtonElement).click())
    expect(eduLines(m.host)).toHaveLength(2)
    expect(buttonOf(m.host, 'fit.addRow')).toBeUndefined()
    const removes = () => Array.from(m.host.querySelectorAll('button[title="fit.remove"]')) as HTMLButtonElement[]
    act(() => removes()[1]?.click())
    expect(eduLines(m.host)).toHaveLength(1)
    pick(eduLines(m.host)[0]?.[0] as HTMLSelectElement, 'BC')
    expect(eduLines(m.host)[0]?.[0]?.value).toBe('BC')
    act(() => removes()[0]?.click())
    expect(eduLines(m.host)).toHaveLength(1)
    expect(eduLines(m.host)[0]?.[0]?.value).toBe('')
    act(() => m.root.unmount())
  })
})
