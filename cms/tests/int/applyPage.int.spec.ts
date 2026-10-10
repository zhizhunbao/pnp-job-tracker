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
// 2026-10-09 A 批投递搬进弹框(docs/design/投递向导-照Azure-20261008.md):投递区搬进全站骨架上的投递框,取数挪到框外壳
//       (useApplyStart 收职位 id),ApplySection 只按取数结果摆正文 —— 探针件照框外壳那样拼(applyIdOf 读地址栏 → useApplyStart →
//       ApplySection),① 的「没带职位」= 地址栏没 `?apply=` 也没旧深链。④ 改读作「发送成功不再收起:切到已投递一步,
//       摆『已发给 <公司>』,并广播 offer2pr:apply-sent 一次;地址栏由关框收拾,投递区不碰」。
//       探针:send 成功不调 onSent(不广播)→ ④最后一条红;发出后不切已投递一步 → 成功条那条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    // 2026-10-09 section 形:「职位信息」分区四行,英文在上、中文灰字在下;没译名的公司只出英文;市和省分开
    expect(pv.textContent).toContain('职位信息')
    expect(pv.textContent).toContain('Cook厨师')
    expect(pv.textContent).toContain('Pie Wood')
    expect(pv.textContent).toContain('Steinbach斯坦巴克')
    expect(pv.textContent).toContain('Manitoba曼尼托巴省')
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
  it('③ 坏字列出、预览钮灰;④ 预览铺正文,发信 503 显示原因不收,成功切到已投递一步摆成功条、广播一次', async () => {
    server({
      [START]: { status: 200, body: start({ senderName: 'Zhang San', resumes: [RES], resumeId: 7, cover: LETTER }) },
      'PUT /api/apply/draft': { status: 200, body: { ok: true } },
      'POST /api/apply/send': { status: 503, body: { error: 'mailOff' } },
    })
    const sent = listenSent()
    const el = await mount('?sec=sjobs&apply=42')
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
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(0)   // 邮件形,勾撤
    expect(el.textContent).toContain('主题')
    expect(btn(el, '发送').disabled).toBe(false)
    await click(el, '上一步')
    await click(el, '预览')
    await click(el, '发送')
    expect(el.textContent).toContain('发信服务没有开启')
    expect(sent.cos).toEqual([])
    server({ 'POST /api/apply/send': { status: 200, body: { ok: true, id: 1 } } })
    await click(el, '发送')
    expect(sent.cos).toEqual(['Pie Wood'])
    expect(el.textContent).toContain('已发给 Pie Wood')
    expect(btn(el, '发送')).toBeUndefined()
    expect(window.location.search).toBe('?sec=sjobs&apply=42')
    sent.off()
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
