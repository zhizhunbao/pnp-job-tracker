// 站内投递区(2026-10-07 B2;components/apply,jsdom 挂件验 —— dev 直连生产库不登录)。
// 同日改判:独立页 /apply/<id> 撤,投递并进「我的求职」(Frank「合成一个」)—— 投递区 ApplySection 摆在投递记录表上方,
// 地址栏 /account?sec=sjobs&job=<id> 带职位才出。
// 2026-10-09 A 批投递搬进弹框(docs/design/我的/我的求职-20261009.md):投递区搬进全站骨架上的投递框,取数挪到框外壳
//       (useApplyStart 收职位 id),ApplySection 只按取数结果摆正文 —— 探针件照框外壳那样拼(applyIdOf 读地址栏 → useApplyStart →
//       ApplySection),① 的「没带职位」= 地址栏没 `?apply=` 也没旧深链。
// 2026-10-10 投递框三步(设计稿 16d;docs/design/我的/我的求职-20261009.md 1.4 / 2.4)改写本文件:原 ② 姓名本地拦 / 进第 2 步自动写信、
//       ⑤ AI 写信试用闸两组随功能撤(姓名挪到「确认」页且档案里有就不问;试用撤,按职位改写只给 Pro)。现性质:
//       ① 没带职位不出、不发请求;已发出摆「已于某日投递」;下架 / 没投递邮箱只摆原因;没发出的一律落「简历」页(有草稿也是),
//          「职位信息」分区不再出;三个页签 简历 / 求职信 / 确认;
//       ② 简历页:没简历拦在第 1 步;有简历进求职信,不调写信接口;
//       ③ 求职信页:没草稿默认「不附求职信」,有草稿默认选草稿;上传求职信走抽字接口成新的一项并选中;
//          (同日 Frank「两处都改吧」:写过的信不再列,原「写过的信列出来」一条改断言「只有不附一项、不请求信清单」)
//          坏字列出、下一步灰;
//       ④ 按职位改写:免费号不请求、弹升级框;Pro 调写信接口、三栏对照框(原来的 / 职位要求 / 改写后),「用这一版」成一项并选中;
//       ⑤ 确认页:档案里有英文姓名只读,没有出输入框、不合规拦、合规随草稿存回再发;邮件预览是短正文不是求职信全文,不附时不提求职信;
//          发信 503 原因一行不收,成功切已投递一步摆成功条、广播一次。
// 探针:startStepOf 草稿直落确认 → ①红;goStep 不判简历 → ②红;firstPickOf 无草稿选草稿 → ③第一条红;
//       makeLetterRewrite 去掉 Pro 判 → ④第一条红(多一次写信请求);send 不核 askName → ⑤姓名那条红;mailOf 不看附不附 → ⑤正文那条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplySection } from '@/components/apply/applysection'
import { applyIdOf, closeApply, noteOpened, openApply, readApplyId } from '@/components/apply/functions'
import { CACHE } from '@/components/apply/variables'
import { useApplyStart } from '@/components/apply/hooks'
import type { ApplyStartView } from '@/components/apply/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, refresh: () => undefined }),
  usePathname: () => '/account',
}))

const TPL = 'Dear Hiring Manager,\n\nI apply for {{title}} at {{company}}.\n\nSincerely,\n{{name}}'
const JOB = {
  id: 42, title: 'Cook', company: 'Pie Wood', city: 'Steinbach', province: 'MB', closed: false, hasEmail: true,
  titleZh: '厨师', titleKo: '요리사', companyZh: '', companyKo: '', cityZh: '斯坦巴克', cityKo: '', companySlug: 'pie-wood',
}
const LETTER = 'Dear Hiring Manager,\n\nI apply for Cook at Pie Wood.\n\nSincerely,\nZhang San'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
// jsdom 里画不了 PDF:简历一律给 Word,预览只出一句话
const RES = { id: 7, fileName: 'zhang.docx', mime: DOCX, uploadedAt: '2026-10-06T00:00:00.000Z', isDefault: true }

function start(p: Partial<ApplyStartView> = {}): ApplyStartView {
  return {
    job: JOB, resumes: [RES], senderName: 'Zhang San', template: TPL, status: '', cover: '', resumeId: 7, sentAt: '',
    pro: false, replyTo: 'zhang@test.local', ...p,
  }
}

type Reply = { status: number, body: object }

function server(routes: Record<string, Reply>) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push(key)
    const r = routes[key] ?? { status: 200, body: { items: [] } }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }))
  return calls
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

// 照投递框外壳拼的探针件:取数(按职位 id)→ 投递区正文
function Section({ jobId }: { jobId: number }) {
  return createElement(ApplySection, { s: useApplyStart(jobId) })
}

async function mount(search: string) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.history.replaceState(null, '', '/account' + search)
  const el = document.createElement('div')
  document.body.appendChild(el)
  const jobId = applyIdOf({ search: window.location.search, path: window.location.pathname })
  await act(async () => {
    if (jobId != null) {
      createRoot(el).render(createElement(Section, { jobId }))
    }
  })
  await flush()
  return el
}

// 听「投递发出去了」广播,记下每次带的公司名
function listenSent() {
  const cos: string[] = []
  function onSent(e: Event) {
    cos.push((e as CustomEvent<{ company: string }>).detail.company)
  }
  window.addEventListener('offer2pr:apply-sent', onSent)
  return { cos, off: () => window.removeEventListener('offer2pr:apply-sent', onSent) }
}

const START = 'GET /api/apply/start?job=42'

function btn(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('button, a')).find((b) => b.textContent === text) as HTMLButtonElement
}

async function click(el: HTMLElement, text: string) {
  await act(async () => {
    btn(el, text).click()
  })
  await flush()
}

// 单选一行:按那一行的文字找单选框
function radio(el: HTMLElement, text: string) {
  const row = Array.from(el.querySelectorAll('label')).find((l) => (l.textContent ?? '').includes(text))!
  return row.querySelector('input[type=radio]') as HTMLInputElement
}

function typeInto(node: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(node, value)
  node.dispatchEvent(new Event('input', { bubbles: true }))
}

function bodyOf(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body))
}

function callsTo(url: string): [string, RequestInit][] {
  const mock = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls
  return mock.filter((c) => String(c[0]) === url)
}

beforeEach(() => {
  // jsdom 没有 matchMedia(modal 桶判窄屏要它):按宽屏答,不挂监听
  vi.stubGlobal('matchMedia', () => ({
    matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('① 投递区出不出、落哪一步', () => {
  it('没带职位不出;已发出 / 下架 / 没邮箱只摆一行;没发出的一律落「简历」页(有草稿也是),三个页签,不再出「职位信息」', async () => {
    const calls = server({})
    expect((await mount('?sec=sjobs')).textContent).toBe('')
    expect(calls).toEqual([])
    server({ [START]: { status: 200, body: start({ status: 'sent' }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位已经投过了')
    server({ [START]: { status: 200, body: start({ status: 'sent', sentAt: '2026-10-06T10:00:00.000Z' }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位已于 2026-10-06 投递')
    server({ [START]: { status: 200, body: start({ job: { ...JOB, closed: true } }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('职位已下架')
    server({ [START]: { status: 200, body: start({ job: { ...JOB, hasEmail: false } }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位没有投递邮箱')
    server({ [START]: { status: 200, body: start({ cover: LETTER }) } })
    const el = await mount('?sec=sjobs&apply=42')
    const tabs = Array.from(el.querySelectorAll('[role=tab]')).map((t) => t.textContent)
    expect(tabs).toEqual(['简历', '求职信', '确认'])
    expect(el.querySelector('[role=tab][aria-selected=true]')!.textContent).toBe('简历')
    expect(el.textContent).toContain('zhang.docx')
    expect(el.textContent).not.toContain('职位信息')
    expect(el.textContent).not.toContain('英文姓名')
    expect(btn(el, '按职位改写')).toBeTruthy()
    expect(btn(el, '上传新简历')).toBeTruthy()
  })
})

describe('② 简历页', () => {
  it('没简历拦在第 1 步;有简历进求职信,不调写信接口;没到过的页签点了不走', async () => {
    server({ [START]: { status: 200, body: start({ resumes: [], resumeId: null }) } })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    expect(el.textContent).toContain('先上传一份简历')
    document.body.innerHTML = ''
    const calls = server({ [START]: { status: 200, body: start() } })
    const el2 = await mount('?apply=42')
    await click(el2, '确认')
    expect(el2.querySelector('[role=tab][aria-selected=true]')!.textContent).toBe('简历')
    await click(el2, '下一步')
    expect(el2.querySelector('[role=tab][aria-selected=true]')!.textContent).toBe('求职信')
    expect(calls.some((c) => c === 'POST /api/apply/letter')).toBe(false)
    await click(el2, '简历')
    expect(el2.querySelector('[role=tab][aria-selected=true]')!.textContent).toBe('简历')
  })
})

describe('③ 求职信页', () => {
  it('没草稿默认「不附求职信」,只有这一项;不列写过的信(不请求信清单);有草稿选中出正文与「修改」,坏字列出、下一步灰', async () => {
    const calls = server({ [START]: { status: 200, body: start() } })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    expect(radio(el, '不附求职信').checked).toBe(true)
    expect(el.textContent).toContain('只发简历')
    expect(el.querySelectorAll('input[name=apply-letter]')).toHaveLength(1)
    expect(calls).not.toContain('GET /api/apply/letters')
    document.body.innerHTML = ''
    server({ [START]: { status: 200, body: start({ cover: LETTER }) } })
    const el2 = await mount('?apply=42')
    await click(el2, '下一步')
    expect(el2.textContent).toContain('I apply for Cook at Pie Wood.')
    await click(el2, '修改')
    const ta = el2.querySelector('textarea') as HTMLTextAreaElement
    expect(ta.value).toBe(LETTER)
    await act(async () => typeInto(ta, LETTER + ' 谢谢'))
    expect(el2.textContent).toContain('这些字写不进 PDF: 谢')
    expect(btn(el2, '下一步').disabled).toBe(true)
  })

  it('有草稿默认选草稿;上传求职信走抽字接口,成新的一项并选中', async () => {
    const calls = server({
      [START]: { status: 200, body: start({ cover: LETTER }) },
      'POST /api/resume/extract': { status: 200, body: { text: 'Dear Uploaded' } },
    })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    expect(radio(el, '这个职位的草稿').checked).toBe(true)
    expect(el.textContent).toContain('I apply for Cook at Pie Wood.')
    const input = el.querySelectorAll('input[type=file]')[0] as HTMLInputElement
    const file = new File(['x'], 'my_letter.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    await flush()
    expect(calls).toContain('POST /api/resume/extract')
    expect(radio(el, 'my_letter.pdf').checked).toBe(true)
    expect(el.textContent).toContain('Dear Uploaded')
  })
})

describe('④ 按职位改写', () => {
  it('免费号:不请求写信接口,弹升级框', async () => {
    const calls = server({ [START]: { status: 200, body: start() } })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    await click(el, '按职位改写')
    expect(calls.some((c) => c === 'POST /api/apply/letter')).toBe(false)
    expect(document.body.textContent).toContain('按职位改写是 Pro 功能')
  })

  it('Pro:调写信接口,三栏对照框;「用这一版」成一项并选中', async () => {
    server({
      [START]: { status: 200, body: start({ pro: true }) },
      'POST /api/apply/letter': { status: 200, body: { text: 'Dear Tailored', ai: true, jd: 'Need a cook' } },
    })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    await click(el, '按职位改写')
    expect(bodyOf(callsTo('/api/apply/letter')[0]![1])).toEqual({ jobId: 42, resumeId: 7, senderName: 'Zhang San' })
    const page = document.body
    expect(page.textContent).toContain('原来的')
    expect(page.textContent).toContain('Need a cook')
    expect(page.textContent).toContain('Dear Tailored')
    await click(page, '用这一版')
    expect(radio(el, '按职位改写').checked).toBe(true)
    expect(el.textContent).toContain('Dear Tailored')
  })
})

describe('⑤ 确认页与投出', () => {
  it('档案里有英文姓名只读;邮件预览是短正文,不附时不提求职信;发信 503 一行原因,成功切已投递并广播一次', async () => {
    server({
      [START]: { status: 200, body: start() },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
      'POST /api/apply/send': { status: 503, body: { error: 'mailOff' } },
    })
    const sent = listenSent()
    const el = await mount('?sec=sjobs&apply=42')
    await click(el, '下一步')
    await click(el, '下一步')
    expect(el.querySelector('[role=tab][aria-selected=true]')!.textContent).toBe('确认')
    expect(bodyOf(callsTo('/api/apply/draft')[0]![1])).toEqual({ jobId: 42, senderName: 'Zhang San', cover: '', resumeId: 7 })
    expect(el.querySelector('input[autocomplete="name"]')).toBeNull()
    expect(el.textContent).toContain('Zhang San')
    expect(el.textContent).toContain('zhang@test.local')
    expect(el.textContent).toContain('不附求职信')
    expect(el.textContent).toContain('Application for Cook - Zhang San')
    expect(el.textContent).toContain('Please find my resume attached.')
    expect(el.textContent).not.toContain('cover letter')
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
    await click(el, '投出')
    expect(el.textContent).toContain('发信服务没有开启')
    expect(sent.cos).toEqual([])
    server({ 'POST /api/apply/send': { status: 200, body: { ok: true, id: 1 } } })
    await click(el, '投出')
    expect(sent.cos).toEqual(['Pie Wood'])
    expect(el.textContent).toContain('已发给 Pie Wood')
    expect(btn(el, '投出')).toBeUndefined()
    expect(window.location.search).toBe('?sec=sjobs&apply=42')
    sent.off()
  })

  it('档案里没有英文姓名:确认页出输入框,不合规拦;合规随草稿存回再发;附了信正文提求职信', async () => {
    server({
      [START]: { status: 200, body: start({ senderName: '', cover: LETTER }) },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
      'POST /api/apply/send': { status: 200, body: { ok: true, id: 1 } },
    })
    const el = await mount('?apply=42')
    await click(el, '下一步')
    await click(el, '下一步')
    expect(bodyOf(callsTo('/api/apply/draft')[0]![1]).senderName).toBe('')
    expect(el.textContent).toContain('Cover_Letter_Pie_Wood.pdf')
    expect(el.textContent).toContain('resume and cover letter attached')
    const name = el.querySelector('input[autocomplete="name"]') as HTMLInputElement
    await act(async () => typeInto(name, '张三'))
    await click(el, '投出')
    expect(el.textContent).toContain('英文姓名只能用')
    expect(callsTo('/api/apply/send')).toHaveLength(0)
    await act(async () => typeInto(name, 'Zhang San'))
    await click(el, '投出')
    const drafts = callsTo('/api/apply/draft')
    expect(bodyOf(drafts[drafts.length - 1]![1])).toMatchObject({ senderName: 'Zhang San', cover: LETTER })
    expect(callsTo('/api/apply/send')).toHaveLength(1)
  })
})

describe('投递框的地址栏(2026-10-09 A 批)', () => {
  it('applyIdOf:?apply= 任一页都认;旧深链 ?job= 只在 /account 认;非正整数不认', () => {
    expect(applyIdOf({ search: '?apply=42', path: '/jobs/7' })).toBe(42)
    expect(applyIdOf({ search: '?sec=sjobs&job=42', path: '/account' })).toBe(42)
    expect(applyIdOf({ search: '?job=42', path: '/jobs/7' })).toBeNull()
    for (const bad of ['?apply=abc', '?apply=0', '?apply=-3', '?apply=1.5', '?apply=', '']) {
      expect(applyIdOf({ search: bad, path: '/jobs/7' })).toBeNull()
    }
  })

  it('开框推一笔历史、同一岗不重推;关框退回去;深链进来的框关掉只洗参数(旧 job 一并洗)不退', () => {
    window.history.replaceState(null, '', '/jobs/7?q=cook')
    CACHE.pushed = false
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const len = window.history.length
    openApply(42)
    expect(window.location.search).toBe('?q=cook&apply=42')
    expect(window.history.length).toBe(len + 1)
    openApply(42)
    expect(window.history.length).toBe(len + 1)
    closeApply()
    expect(back).toHaveBeenCalledTimes(1)
    expect(CACHE.pushed).toBe(false)
    window.history.replaceState(null, '', '/account?sec=sjobs&job=42')
    closeApply()
    expect(back).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?sec=sjobs')
    back.mockRestore()
  })

  it('noteOpened:宿主活着时框从无到有才记账;刚挂上就带着(深链)不记;地址栏没了框就清账', () => {
    CACHE.pushed = false
    noteOpened({ first: true, prev: null, id: 42 })
    expect(CACHE.pushed).toBe(false)
    noteOpened({ first: false, prev: 42, id: 43 })
    expect(CACHE.pushed).toBe(false)
    noteOpened({ first: false, prev: null, id: 42 })
    expect(CACHE.pushed).toBe(true)
    window.history.replaceState(null, '', '/jobs/7')
    expect(readApplyId()).toBeNull()
    expect(CACHE.pushed).toBe(false)
  })
})
