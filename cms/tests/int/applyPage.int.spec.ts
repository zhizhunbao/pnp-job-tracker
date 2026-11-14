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
// 2026-11-09 Frank 定的投递动线(先查基础简历和额度再决定开什么):有基础简历后分三屏 —— 两个选择 / 三屏对照 / 基础简历投递。
//       旧三步(页签、求职信单选、对照框、确认页)在有简历时已不再渲染,原 ①~⑤ 的用例随之换成新动线的:
//       ① 开在哪一屏;② 直接投基础简历(模板信、不调生成接口、先存草稿再带 base 发);③ 没写成时的基础简历入口;④ 判定全格。
// 探针:startModeOf 免费有额度直接进三屏 → ①第二条红;send 不带 base → ②第一条红;isOutOf 不看 tailored → ④第二条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplySection } from '@/components/apply/applysection'
import { isOutOf, outReasonOf, startModeOf } from '@/components/apply/entry'
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
  id: 42, title: 'Cook', company: 'Pie Wood', city: 'Steinbach', province: 'MB', noc: '63200', closed: false, hasEmail: true,
  subject: '', titleZh: '厨师', titleKo: '요리사', companyZh: '', companyKo: '', cityZh: '斯坦巴克', cityKo: '', companySlug: 'pie-wood',
}
const LETTER = 'Dear Hiring Manager,\n\nI apply for Cook at Pie Wood.\n\nSincerely,\nZhang San'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
// jsdom 里画不了 PDF:简历一律给 Word,预览只出一句话
const RES = { id: 7, fileName: 'zhang.docx', mime: DOCX, uploadedAt: '2026-10-06T00:00:00.000Z', isDefault: true }

function start(p: Partial<ApplyStartView> = {}): ApplyStartView {
  return {
    job: JOB, resumes: [RES], senderName: 'Zhang San', template: TPL, status: '', cover: '', resumeId: 7, sentAt: '',
    pro: false, replyTo: 'zhang@test.local', credit: { plan: 'free', left: 3, max: 3, resetAt: null }, tailored: false,
    baseCover: LETTER, ...p,
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
  return createElement(ApplySection, { s: useApplyStart(jobId), base: false, onBig: () => {} })
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

// 按钮文字里含某段话的那一颗(选择卡是「标题 + 小注」两行,不能按整串找)
function btnHas(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes(text)) as HTMLButtonElement
}

function tailorCalls(calls: string[]) {
  return calls.filter((c) => c.includes('/api/tailor/'))
}

const STATE = 'GET /api/tailor/state?job=42'
const STEP = 'POST /api/tailor/step'
const NO_STATE = { status: 200, body: { review: null, hasResume: false, hasCover: false, status: '', cover: '', jd: '' } }

describe('① 投递区出不出、开在哪一屏(2026-11-09 投递动线)', () => {
  it('没带职位不出;已发出 / 下架 / 没邮箱只摆一行', async () => {
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
  })

  it('免费有额度:第一屏两个选择,写明还剩几个;不点改写就不调生成接口', async () => {
    const calls = server({ [START]: { status: 200, body: start({ credit: { plan: 'free', left: 2, max: 3, resetAt: null } }) } })
    const el = await mount('?apply=42')
    expect(btnHas(el, '按这个职位改写').textContent).toContain('用 1 个额度,免费额度还剩 2 个')
    expect(btnHas(el, '直接投基础简历')).toBeTruthy()
    expect(tailorCalls(calls)).toEqual([])
  })

  it('没有基础简历:只出上传卡,没有两个选择,卡头不再有「按职位改写」', async () => {
    const calls = server({ [START]: { status: 200, body: start({ resumes: [], resumeId: null }) } })
    const el = await mount('?apply=42')
    expect(el.textContent).toContain('先传一份基础简历,之后每个职位都以它为准')
    expect(btnHas(el, '按这个职位改写')).toBeUndefined()
    expect(btn(el, '按职位改写')).toBeUndefined()
    expect(btn(el, '上传新简历')).toBeTruthy()
    expect(tailorCalls(calls)).toEqual([])
  })

  it('会员有额度、或这一岗生成过:不出两个选择,直接进三屏框(取现状)', async () => {
    for (const p of [
      { credit: { plan: 'pro' as const, left: 60, max: 60, resetAt: '2026-12-01T00:00:00.000Z' } },
      { tailored: true, credit: { plan: 'free' as const, left: 0, max: 3, resetAt: null } },
    ]) {
      document.body.innerHTML = ''
      const calls = server({ [START]: { status: 200, body: start(p) }, [STATE]: NO_STATE, [STEP]: { status: 502, body: { error: 'llm' } } })
      const el = await mount('?apply=42')
      expect(btnHas(el, '按这个职位改写')).toBeUndefined()
      expect(calls).toContain(STATE)
    }
  })
})

describe('② 直接投基础简历:附原件、模板信可改、不调模型', () => {
  it('点「直接投基础简历」:信是模板填好的那一封,不调生成接口;发送先存草稿再带 base 发,成功切已投递并广播一次', async () => {
    const calls = server({ [START]: { status: 200, body: start() }, [STATE]: NO_STATE })
    const el = await mount('?apply=42')
    await click(el, btnHas(el, '直接投基础简历').textContent ?? '')
    const area = el.querySelector('textarea') as HTMLTextAreaElement
    expect(area.value).toBe(LETTER)
    expect(el.textContent).toContain('zhang.docx')
    expect(el.textContent).toContain('已自动保存,可在我的投递里继续')
    await act(async () => {
      typeInto(area, LETTER + '\nP.S. Available now.')
    })
    const heard = listenSent()
    await click(el, '发送投递')
    heard.off()
    // 2026-11-11 基础简历屏并进三栏外框:右栏的职位描述要取一次现状(只读);生成接口照旧一次不调
    expect(tailorCalls(calls).filter((c) => c !== STATE)).toEqual([])
    const drafts = callsTo('/api/apply/draft')
    const draft = bodyOf(drafts[drafts.length - 1]![1])
    expect(draft.cover).toBe(LETTER + '\nP.S. Available now.')
    expect(draft.resumeId).toBe(7)
    expect(bodyOf(callsTo('/api/apply/send')[0]![1])).toEqual({ jobId: 42, base: true })
    expect(calls.indexOf('PUT /api/apply/draft')).toBeLessThan(calls.indexOf('POST /api/apply/send'))
    // 2026-11-13 成功绿条撤:「已发给 <公司>」改由投递框宿主听广播发右上角提示,这一屏不再写公司名,只验广播
    expect(heard.cos).toEqual(['Pie Wood'])
  })

  // 2026-11-13 第一条的主按钮「下一个:职位名」撤,每条同形(职位名 + 「投递」)
  it('发出后「接着投」:按刚投的职位取同类岗,每条一颗「投递」,点第一条只换地址栏里的职位号', async () => {
    const pick = (id: number, title: string) => ({
      id, title, titleZh: '', titleKo: '', company: 'Maple Diner', companyZh: '', companyKo: '', companySlug: 'maple-diner',
      address: '', city: 'Steinbach', cityZh: '', cityKo: '', province: 'MB',
    })
    const calls = server({
      [START]: { status: 200, body: start() },
      'GET /api/myjobs/picks?after=42': { status: 200, body: { picks: [pick(77, 'Line Cook'), pick(78, 'Prep Cook')] } },
    })
    const el = await mount('?apply=42')
    await click(el, btnHas(el, '直接投基础简历').textContent ?? '')
    await click(el, '发送投递')
    expect(calls).toContain('GET /api/myjobs/picks?after=42')
    expect(calls.filter((c) => c.includes('/api/myjobs/picks?prov='))).toEqual([])
    expect(el.textContent).toContain('Line Cook')
    expect(Array.from(el.querySelectorAll('button')).filter((b) => b.textContent === '投递').length).toBe(2)
    const before = calls.length
    await click(el, '投递')
    expect(new URL(window.location.href).searchParams.get('apply')).toBe('77')
    expect(window.location.pathname).toBe('/account')
    expect(tailorCalls(calls.slice(before))).toEqual([])
  })

  it('这一岗存着草稿信、又没生成过本岗版本:基础简历屏接着用草稿', async () => {
    server({ [START]: { status: 200, body: start({ cover: 'My own draft letter.' }) } })
    const el = await mount('?apply=42')
    await click(el, btnHas(el, '直接投基础简历').textContent ?? '')
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('My own draft letter.')
  })

  it('档案里没有英文姓名:基础简历屏出输入框,不合规时发送钮禁用,填好才能发(邮件主题里的姓名不能为空)', async () => {
    const calls = server({ [START]: { status: 200, body: start({ senderName: '' }) } })
    const el = await mount('?apply=42')
    await click(el, btnHas(el, '直接投基础简历').textContent ?? '')
    expect(btn(el, '发送投递').disabled).toBe(true)
    await act(async () => {
      typeInto(el.querySelector('input[autocomplete=name]') as HTMLInputElement, 'Zhang San')
    })
    expect(btn(el, '发送投递').disabled).toBe(false)
    expect(el.textContent).toContain('Zhang San')
    expect(calls).not.toContain('POST /api/apply/send')
  })

  it('发信失败留在本屏、原因一行、不广播', async () => {
    server({ [START]: { status: 200, body: start() }, 'POST /api/apply/send': { status: 503, body: { error: 'mail_off' } } })
    const el = await mount('?apply=42')
    await click(el, btnHas(el, '直接投基础简历').textContent ?? '')
    const heard = listenSent()
    await click(el, '发送投递')
    heard.off()
    expect(el.querySelector('textarea')).toBeTruthy()
    expect(btn(el, '发送投递')).toBeTruthy()
    expect(heard.cos).toEqual([])
  })
})

describe('③ 三屏框里的基础简历入口', () => {
  it('生成没写成:提示这次不扣额度,点「直接投基础简历」原地换到基础简历屏', async () => {
    server({
      [START]: { status: 200, body: start({ credit: { plan: 'pro', left: 60, max: 60, resetAt: '2026-12-01T00:00:00.000Z' } }) },
      [STATE]: NO_STATE, [STEP]: { status: 502, body: { error: 'llm' } },
    })
    const el = await mount('?apply=42')
    expect(el.textContent).toContain('没写成,这次不扣额度')
    await click(el, '直接投基础简历')
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe(LETTER)
  })
})

describe('④ 开在哪一屏的判定(子桶 entry)', () => {
  it('startModeOf 全格:升级框进来的落基础简历;生成过的进三屏;没额度落基础简历;会员进三屏;免费有额度出两个选择', () => {
    for (const base of [false, true]) {
      for (const tailored of [false, true]) {
        for (const plan of ['free', 'pro']) {
          for (const left of [0, 1, 3, 60]) {
            const got = startModeOf({ start: { credit: { plan, left, resetAt: null }, tailored, status: '', resumes: [{}] }, base })
            let want = 'choose'
            if (base) {
              want = 'base'
            } else if (tailored) {
              want = 'tailor'
            } else if (left === 0) {
              want = 'base'
            } else if (plan === 'pro') {
              want = 'tailor'
            }
            expect(got).toBe(want)
          }
        }
      }
    }
  })

  it('isOutOf:有基础简历、没发出、没生成过、额度为 0 才直接出升级框;说明分免费与会员(会员带恢复日)', () => {
    const base = { credit: { plan: 'free', left: 0, resetAt: null }, tailored: false, status: '', resumes: [{}] }
    expect(isOutOf(base)).toBe(true)
    expect(isOutOf(null)).toBe(false)
    expect(isOutOf({ ...base, resumes: [] })).toBe(false)
    expect(isOutOf({ ...base, tailored: true })).toBe(false)
    expect(isOutOf({ ...base, credit: { plan: 'free', left: 1, resetAt: null } })).toBe(false)
    for (const status of ['sent', 'replied', 'bounced', 'sending']) {
      expect(isOutOf({ ...base, status })).toBe(false)
    }
    expect(isOutOf({ ...base, status: 'draft' })).toBe(true)
    expect(outReasonOf(base)).toEqual({ key: 'ap.creditOut', d: '' })
    expect(outReasonOf({ ...base, credit: { plan: 'pro', left: 0, resetAt: '2026-12-01T00:00:00.000Z' } }))
      .toEqual({ key: 'ap.creditOutPro', d: '2026-12-01' })
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
