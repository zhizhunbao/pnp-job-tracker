// 站内投递区(2026-10-07 B2;components/apply,jsdom 挂件验 —— dev 直连生产库不登录)。
// 同日改判:独立页 /apply/<id> 撤,投递并进「我的求职」(Frank「合成一个」)—— 投递区 ApplySection 摆在投递记录表上方,
// 地址栏 /account?sec=sjobs&job=<id> 带职位才出。
// 性质:① 地址栏没带职位 → 投递区不出(一个请求都不发);这一岗已发出 → 摆一行「已于 <日期> 投递」(2026-10-08;原先整块不出);下架 / 没投递邮箱 → 只摆原因一行;
//       选好简历又有署名(投过别的岗)直接落预览;
//       ② 第 1 步:英文姓名不合规本地就拦(不发草稿);一份简历都没有拦;合规 + 有简历 → 存草稿(带姓名、填好的信与位置、
//          默认那份简历)→ 求职信;
//       ③ 第 2 步:信里有写不进 PDF 的字 → 列出坏字、「预览」灰;改回来恢复;
//       ④ 第 3 步:页面上铺信的正文、两行附件;发送回 503 mailOff → 钮上一行原因、不收;发送成功 → 投递区收起、
//          通知外面刷新表、地址栏洗掉职位号。
//          2026-10-08 改:两行附件换成逐项检查四行(收件人 / 简历 / 求职信 / 署名),四项没勾满「发送」灰;退回上一步勾清空。
// 探针:ApplySection 不认已发出 → ①红;nextFromResume 去掉姓名闸 → ②第一条红;canNextOf 不看坏字 → ③红;
//       send 成功不调 onSent → ④最后一条红。
// 2026-10-07 批 C(AI 写信每人一辈子试用 3 个职位):
//       ⑤ 免费档:标题行出「AI 试用还剩 N 次」,写成后照回包的余量改;Pro(余量 null)不出余量;
//          用完(写信回 402 trial):信框里是回包带的通用模板,出黄条与升级钮,不出余量;点「按职位重写」不再请求、开升级框。
// 探针:makeRewrite 去掉试用闸 → ⑤「用完」那条红(会多一次写信请求);trialAfterWrite 不认 402 → 黄条不出,同条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApplySection } from '@/components/apply'
import type { ApplyStartView } from '@/components/apply/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, refresh: () => undefined }),
  usePathname: () => '/account',
}))

const TPL = 'Dear Hiring Manager,\n\nI apply for {{title}} at {{company}}.\n\nSincerely,\n{{name}}'
const JOB = { id: 42, title: 'Cook', company: 'Pie Wood', city: 'Steinbach', province: 'MB', closed: false, hasEmail: true }
const LETTER = 'Dear Hiring Manager,\n\nI apply for Cook at Pie Wood.\n\nSincerely,\nZhang San'
const RES = { id: 7, fileName: 'zhang.pdf', mime: 'application/pdf', uploadedAt: '2026-10-06T00:00:00.000Z', isDefault: true }

function start(p: Partial<ApplyStartView> = {}): ApplyStartView {
  return {
    job: JOB, resumes: [], senderName: '', template: TPL, status: '', cover: '', resumeId: null, sentAt: '', trialLeft: 3,
    trialHere: false, ...p,
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

async function mount(search: string, onSent = () => undefined) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.history.replaceState(null, '', '/account' + search)
  const el = document.createElement('div')
  document.body.appendChild(el)
  await act(async () => {
    createRoot(el).render(createElement(ApplySection, { onSent }))
  })
  await flush()
  return el
}

const START = 'GET /api/apply/start?job=42'

function btn(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('button, a')).find((b) => b.textContent === text) as HTMLButtonElement
}

async function tickAll(el: HTMLElement) {
  for (const box of Array.from(el.querySelectorAll('input[type=checkbox]')) as HTMLInputElement[]) {
    await act(async () => {
      box.click()
    })
  }
  await flush()
}

async function click(el: HTMLElement, text: string) {
  await act(async () => {
    btn(el, text).click()
  })
  await flush()
}

function typeInto(node: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(node, value)
  node.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('投递区出不出', () => {
  it('① 没带职位不出、不发请求;已发出摆「已于某日投递」(2026-10-08,原先不出);下架 / 没邮箱只摆原因;投过别的岗直接落预览', async () => {
    const calls = server({})
    expect((await mount('?sec=sjobs')).textContent).toBe('')
    expect(calls).toEqual([])
    server({ [START]: { status: 200, body: start({ status: 'sent', senderName: 'Zhang San', resumes: [RES], resumeId: 7 }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位已经投过了')
    server({ [START]: { status: 200, body: start({ status: 'sent', sentAt: '2026-10-06T10:00:00.000Z' }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位已于 2026-10-06 投递')
    server({ [START]: { status: 200, body: start({ job: { ...JOB, closed: true } }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('职位已下架')
    server({ [START]: { status: 200, body: start({ job: { ...JOB, hasEmail: false } }) } })
    expect((await mount('?sec=sjobs&job=42')).textContent).toBe('这个职位没有投递邮箱')
    server({ [START]: { status: 200, body: start({ senderName: 'Zhang San', resumes: [RES], resumeId: 7, cover: LETTER }) } })
    const pv = await mount('?sec=sjobs&job=42')
    expect(pv.textContent).toContain('I apply for Cook at Pie Wood.')
    expect(pv.textContent).toContain('Cover_Letter_Pie_Wood.pdf')
  })
})

describe('第 1 步 → 第 2 步', () => {
  it('② 姓名不合规本地拦;没选简历拦;选了简历 → 进求职信、按 JD 写一封(带职位、简历、署名)、写好存草稿', async () => {
    const calls = server({
      [START]: { status: 200, body: start() },
    })
    const el = await mount('?sec=sjobs&job=42')
    const name = el.querySelector('input[autocomplete="name"]') as HTMLInputElement
    await act(async () => typeInto(name, '张三'))
    await click(el, '下一步')
    expect(el.textContent).toContain('英文姓名只能用')
    await act(async () => typeInto(name, 'Zhang San'))
    await click(el, '下一步')
    expect(el.textContent).toContain('先上传一份简历')
    expect(calls.some((c) => c === 'POST /api/apply/letter')).toBe(false)
    document.body.innerHTML = ''
    server({
      [START]: { status: 200, body: start({ resumes: [RES, { ...RES, id: 8, fileName: 'cook.pdf', isDefault: false }], resumeId: 7 }) },
      'POST /api/apply/letter': { status: 200, body: { text: LETTER, ai: true } },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
    })
    const el2 = await mount('?sec=sjobs&job=42')
    expect(el2.textContent).toContain('zhang.pdf')
    expect(el2.textContent).toContain('cook.pdf')
    const radios = el2.querySelectorAll('input[type=radio]')
    await act(async () => (radios[1] as HTMLInputElement).click())
    await act(async () => typeInto(el2.querySelector('input[autocomplete="name"]') as HTMLInputElement, 'Zhang San'))
    await click(el2, '下一步')
    const ta = el2.querySelector('textarea') as HTMLTextAreaElement
    expect(ta.value).toBe(LETTER)
    const mock = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls
    const post = mock.find((c) => String(c[0]) === '/api/apply/letter')!
    expect(JSON.parse(String(post[1].body))).toEqual({ jobId: 42, resumeId: 8, senderName: 'Zhang San' })
    const put = mock.find((c) => c[1]?.method === 'PUT')!
    expect(JSON.parse(String(put[1].body))).toMatchObject({ jobId: 42, senderName: 'Zhang San', resumeId: 8, cover: ta.value })
  })

  it('模型没写成(ai = false):给通用信并提示可以重写', async () => {
    server({
      [START]: { status: 200, body: start({ resumes: [RES], resumeId: 7, senderName: 'Zhang San' }) },
      'POST /api/apply/letter': { status: 200, body: { text: LETTER, ai: false } },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
    })
    const el = await mount('?sec=sjobs&job=42')
    await click(el, '下一步')
    expect(el.textContent).toContain('没按职位写成')
    expect(btn(el, '按职位重写')).toBeTruthy()
  })
})

describe('第 2、3 步', () => {
  it('③ 坏字列出、预览钮灰;④ 预览铺正文,发信 503 显示原因不收,成功收起并通知外面、洗掉地址栏职位号', async () => {
    server({
      [START]: { status: 200, body: start({ senderName: 'Zhang San', resumes: [RES], resumeId: 7, cover: LETTER }) },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
      'POST /api/apply/send': { status: 503, body: { error: 'mailOff' } },
    })
    const onSent = vi.fn()
    const el = await mount('?sec=sjobs&job=42', onSent)
    await click(el, '上一步')
    const ta = el.querySelector('textarea') as HTMLTextAreaElement
    await act(async () => typeInto(ta, ta.value + ' 谢谢'))
    expect(el.textContent).toContain('这些字写不进 PDF: 谢')
    expect(btn(el, '预览').disabled).toBe(true)
    await act(async () => typeInto(ta, ta.value.replace(' 谢谢', ' Thanks')))
    expect(btn(el, '预览').disabled).toBe(false)
    await click(el, '预览')
    expect(el.textContent).toContain('Thanks')
    expect(el.textContent).toContain('zhang.pdf')
    expect(el.textContent).toContain('Zhang San')
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(4)
    expect(btn(el, '发送').disabled).toBe(true)
    await tickAll(el)
    expect(btn(el, '发送').disabled).toBe(false)
    await click(el, '上一步')
    await click(el, '预览')
    expect(btn(el, '发送').disabled).toBe(true)
    await tickAll(el)
    await click(el, '发送')
    expect(el.textContent).toContain('发信服务没有开启')
    expect(onSent).not.toHaveBeenCalled()
    server({ 'POST /api/apply/send': { status: 200, body: { ok: true, id: 1 } } })
    await click(el, '发送')
    expect(onSent).toHaveBeenCalledTimes(1)
    expect(el.textContent).toBe('')
    expect(window.location.search).toBe('?sec=sjobs')
  })
})

describe('⑤ AI 写信试用闸(2026-10-07 批 C)', () => {
  it('免费档:标题行出余量,写成后照回包减一;Pro 不出余量', async () => {
    server({
      [START]: { status: 200, body: start({ resumes: [RES], resumeId: 7, senderName: 'Zhang San', trialLeft: 3 }) },
      'POST /api/apply/letter': { status: 200, body: { text: LETTER, ai: true, left: 2 } },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
    })
    const el = await mount('?sec=sjobs&job=42')
    await click(el, '下一步')
    expect(el.textContent).toContain('AI 试用还剩 2 次')
    document.body.innerHTML = ''
    server({
      [START]: { status: 200, body: start({ resumes: [RES], resumeId: 7, senderName: 'Zhang San', trialLeft: null }) },
      'POST /api/apply/letter': { status: 200, body: { text: LETTER, ai: true, left: null } },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
    })
    const pro = await mount('?sec=sjobs&job=42')
    await click(pro, '下一步')
    expect((pro.querySelector('textarea') as HTMLTextAreaElement).value).toBe(LETTER)
    expect(pro.textContent).not.toContain('AI 试用还剩')
  })

  it('用完:信框里是通用模板,出黄条与升级钮;点「按职位重写」不再请求、开升级框', async () => {
    const calls = server({
      [START]: { status: 200, body: start({ resumes: [RES], resumeId: 7, senderName: 'Zhang San', trialLeft: 0 }) },
      'POST /api/apply/letter': { status: 402, body: { error: 'trial', text: LETTER, left: 0 } },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
    })
    const el = await mount('?sec=sjobs&job=42')
    await click(el, '下一步')
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe(LETTER)
    expect(el.textContent).toContain('3 次试用已用完')
    expect(el.textContent).not.toContain('AI 试用还剩')
    expect(btn(el, '升级 Pro')).toBeTruthy()
    const before = calls.filter((c) => c === 'POST /api/apply/letter').length
    // jsdom 没有 matchMedia(modal 桶判窄屏要它):按宽屏答,不挂监听
    vi.stubGlobal('matchMedia', () => ({
      matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined,
    }))
    await click(el, '按职位重写')
    expect(calls.filter((c) => c === 'POST /api/apply/letter').length).toBe(before)
    expect(document.body.textContent).toContain('AI 按职位写信的免费试用已用完')
  })
})
