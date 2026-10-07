// 访客向导(lib/guest + lib/quiz 的 mergeBasics;2026-10-03 付费闭环批 A1,设计稿 docs/design/付费闭环-20261003.md)。
// 来由:未登录的人点开第 3 个不同的职位弹框、或点投递 / 收藏时弹四道点选题 + 注册;整页永远不弹(Google 招聘规则)。
// 性质:① 起弹 ⇔ 未登录 ∧ 弹框打开 ∧ 记录里不同的岗位号 ≥ 3(重号不多算);整页、登录永远不弹;
//       ② 浏览记录:新的在前、同号去重、最多 20 条;预选职业取不同的非空码、最多 3 个;
//       ③ 所在省预选:时区对得上省就选省,对不上且不在加拿大境内才预选境外,其余不预选;
//       ④ 草稿并进答案档:没答的格不动旧答案,境外写处境 overseas 且现居省清空,专业码过得了 normalize。
// 同日审查后补的性质:⑤ 并进答案档只填服务端还空着的格(老账号已答的不被访客题盖掉;新号空档 = 全写),
//       处境与现居省绑着判,拼不出「人在境外、住在安省」;推的时候 401 交回 false;
//       ⑥ 交接戳:走到注册屏落、读完即撤、10 分钟有效 —— 补交钩子没戳不碰答案档;
//       ⑦ 向导里刚登录过(软刷没回来)不再起弹;⑧ 草稿读回逐格验值域。
// 2026-10-04 改判(Frank「进来就要求用户登录注册」→「照这样改」):① 改成 起弹 ⇔ 未登录(第 3 个的门槛撤,isGateDue 随删);
//       ⑨ 进站即弹:例外表(职位整页 /jobs/<号>、/legal/*、/about、/account、?reset= / ?login= / ?signup= 落地)不弹,
//       其余页未登录一进来就弹;同一页弹过不再弹(会话存储记最近弹过的那一页),换页再判。
// 同日收口审查:落地参数只在配对的那一页上免弹(根 `/` 的 reset / login / signup,处境页 /plan/pr 的 quiz),别的页带上照弹;
//       进站的登录态认「票据在且认得出人」(会话种子 in 且邮箱不空,与分层态同一把尺)。
//       探针:参数判定去掉路径配对 → 「/employers?reset=」那条红;登录态退回只看 in → 「票据在认不出」那条红。
// 2026-10-04 A2:专业改存 CIP 2021 class 码 —— ⑧ 草稿读回的专业验码形(两位 . 四位),旧大类码 '01'…'12' 按没答;
//       补交钩子补交完、人在职位板上且由头是进站 / 点开职位时按答案换地址栏(由头投递 / 收藏不换)。
//       探针:MAJOR_RE 放宽回大类码表 → 「旧大类码按没答」那条红;useGateSync 去掉 gateBoardGo → 「Google 回跳换地址栏」那条红。
// 同日收口:换地址栏的由头只剩进站(点开职位那一路板子重挂会卸掉刚亮出的职位弹框,撤);补交没成放回戳后再交,
//       地址栏一页只换一次,这一页刚在向导里登录过(邮箱注册当场已换)的不换;草稿并进答案档那几条的专业样例换成 class 码。
//       探针:BOARD_INTENTS 加回 job → 「点开职位不换」那条红;useGateSync 去掉一页一次的判 → 「补交重来不再换」那条红。
// 同日收口审查:补交钩子的登录态改认「票据在且认得出人」(与进站向导同一把尺);syncGateDraft 交回成没成,
//       交成了才记引导弹过、才回职位板(一页只试一次:第一跑没交成,后面换页交成了也不换地址栏);
//       匿名开页先撤交接戳(陈戳不留给之后的页头登录),草稿照留。
//       探针:useGateSync 登录态退回只看 in → 「票据在认不出」那条红;runGateSync 不等结果就 obMarkSeen → 「没交成不记」红;
//       去掉 dropStaleHandoff → 「匿名开页撤陈戳」红。
import fc from 'fast-check'
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import {
  gateDueFor, gatePatchOf, gateProvSeedOf, guessProv, isEntryGateExempt, isGateIntent, isHandoffFresh, markGateHandoff,
  markGateSignedIn, markSeenJob, readGateDraft, readSeenJobs, seenNocsOf, seenWithOf, syncGateDraft, takeEntryGate,
  takeGateHandoff, toGateDraft, writeGateDraft,
} from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import { homeProvinceOf } from '@/lib/location'
import { EMPTY, mergeBasics, readAnswers, resetAnswersMemory, writeAnswers, type Answers } from '@/lib/quiz'
import { blankPatchOf, normalize } from '@/lib/quiz/functions'
import { SessionProvider } from '@/components/auth'
import { useEntryGate, useGateSync } from '@/components/gate/hooks'
import { useActModal } from '@/components/advisor/hooks'
import type { GateDraft, SeenJob } from '@/lib/guest/types'
import type { AdvisorJob, AdvisorPlan } from '@/components/advisor/types'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace }),
  usePathname: () => PATH.current,
}))

const SEEN_KEY = 'o2p_seen_jobs_v1'
const DRAFT_KEY = 'o2p_gate_v2'
const HANDOFF_KEY = 'o2p_gate_handoff_v1'
const ENTRY_KEY = 'o2p_gate_entry_v1'
const OB_SEEN_KEY = 'jobs_onboarding_v1'

function job(id: string, noc: string | null = null): SeenJob {
  return { id, noc }
}

function device(tz: string, lang: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockReturnValue({ timeZone: tz } as Intl.ResolvedDateTimeFormatOptions)
  Object.defineProperty(window.navigator, 'language', { value: lang, configurable: true })
}

function reply(status: number, body: object) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

function draft(p: Partial<GateDraft> = {}): GateDraft {
  return { goal: 0, majors: [], nocs: [], prov: '', abroad: false, intent: 'job', ...p }
}

function serverWith(basic: object | null) {
  const puts: string[] = []
  const gets: number[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init != null && init.method === 'PUT') {
      puts.push(String(init.body))
      return reply(200, { ok: true })
    }
    gets.push(1)
    if (basic == null) {
      return reply(200, { answers: null })
    }
    return reply(200, { answers: { basic, score: { ticks: { 'bc:1': true }, rowAnswers: {}, extraAnswered: {}, profile: {} } } })
  }))
  return { puts, gets }
}

// 挂一个只跑 hook 的探针件(@testing-library/dom 没装,不为测试加依赖;同 boardUrlSync 的 createRoot 形)
function runHook<T>(hook: () => T, wrap: ((c: ReactNode) => ReactNode) | null = null): { current: T | null } {
  const out: { current: T | null } = { current: null }
  function Probe() {
    out.current = hook()
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    const el = createElement(Probe)
    root.render(wrap == null ? el : wrap(el))
  })
  return out
}

function sent(puts: string[]) {
  return JSON.parse(puts[puts.length - 1] ?? '{}')
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  resetAnswersMemory()
  GUEST.signedIn = false
  PATH.current = '/'
  ROUTER.replace.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.cookie = 'o2p_li=; path=/; max-age=0'
})

describe('起弹判定 gateDueFor(2026-10-04 起不数第几个)', () => {
  it('金标:未登录就弹;登录不弹;浏览记录多少条都不影响', () => {
    expect(gateDueFor({ loggedIn: false })).toBe(true)
    expect(gateDueFor({ loggedIn: true })).toBe(false)
    for (let i = 1; i <= 25; i += 1) {
      markSeenJob({ id: i, noc: '' })
      expect(gateDueFor({ loggedIn: false }), `看过 ${i} 个`).toBe(true)
      expect(gateDueFor({ loggedIn: true }), `登录看过 ${i} 个`).toBe(false)
    }
  })
})

describe('进站即弹(2026-10-04)', () => {
  it('例外表金标:/、/employers、/news、/companies/x、/jobs 弹;/jobs/123、/legal/privacy、/about、/account 与找回密码落地不弹', () => {
    const cases: [string, string, boolean][] = [
      ['/', '', false],
      ['/employers', '', false],
      ['/news', '', false],
      ['/news/some-post', '', false],
      ['/companies/x', '', false],
      ['/city/on/toronto', '', false],
      ['/pte/read-aloud', '', false],
      ['/jobs', '', false],
      ['/jobs', '?prov=ON', false],
      ['/jobsboard', '', false],
      ['/legalese', '', false],
      ['/jobs/123', '', true],
      ['/jobs/123', '?from=google', true],
      ['/legal/privacy', '', true],
      ['/legal/terms', '', true],
      ['/about', '', true],
      ['/account', '', true],
      ['/', '?reset=abc', true],
      ['/', 'reset=abc', true],
      ['/', '?login=1', true],
      ['/', '?signup=1', true],
      ['/', '?quiz=1', false],
      ['/plan/pr', '?quiz=1', true],
      ['/plan/pr', '', false],
      ['/plan/pr', '?login=1', false],
      ['/employers', '?prov=ON&reset=t', false],
      ['/news', '?login=1', false],
      ['/companies/x', '?signup=1', false],
    ]
    for (const [path, search, want] of cases) {
      expect(isEntryGateExempt({ path, search }), `${path}${search}`).toBe(want)
    }
  })

  it('任意职位号:/jobs/<号> 永远不弹,职位板 /jobs 永远弹(不带落地参数时)', () => {
    fc.assert(fc.property(fc.stringMatching(/^[A-Za-z0-9-]{1,12}$/), (id) => {
      expect(isEntryGateExempt({ path: '/jobs/' + id, search: '' })).toBe(true)
      expect(isEntryGateExempt({ path: '/jobs', search: '?q=' + id })).toBe(false)
    }))
  })

  it('同一页只弹一次:弹过记下,同页再判不弹;换页再弹;退回刚才那页(最近弹的是别页)再弹', () => {
    expect(takeEntryGate({ loggedIn: false, path: '/', search: '' })).toBe(true)
    expect(sessionStorage.getItem(ENTRY_KEY)).toBe('/')
    expect(takeEntryGate({ loggedIn: false, path: '/', search: '' })).toBe(false)
    expect(takeEntryGate({ loggedIn: false, path: '/', search: '?prov=ON' })).toBe(false)
    expect(takeEntryGate({ loggedIn: false, path: '/employers', search: '' })).toBe(true)
    expect(takeEntryGate({ loggedIn: false, path: '/', search: '' })).toBe(true)
  })

  it('登录、向导里刚登录过、例外页都不弹,也不记「弹过」', () => {
    expect(takeEntryGate({ loggedIn: true, path: '/', search: '' })).toBe(false)
    expect(takeEntryGate({ loggedIn: false, path: '/jobs/9', search: '' })).toBe(false)
    expect(takeEntryGate({ loggedIn: false, path: '/legal/privacy', search: '' })).toBe(false)
    expect(sessionStorage.getItem(ENTRY_KEY)).toBeNull()
    markGateSignedIn()
    expect(takeEntryGate({ loggedIn: false, path: '/news', search: '' })).toBe(false)
    expect(sessionStorage.getItem(ENTRY_KEY)).toBeNull()
  })

  it('会话存储抛了:留痕并照弹(进站闸不许无声失效)', () => {
    const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(takeEntryGate({ loggedIn: false, path: '/', search: '' })).toBe(true)
    expect(logs).toHaveBeenCalled()
  })
})

describe('浏览记录', () => {
  it('新的在前、同号去重、最多 20 条', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 40 }), { maxLength: 60 }), (ids) => {
      let list: SeenJob[] = []
      for (const id of ids) {
        list = seenWithOf({ list, job: job(String(id)) })
      }
      expect(list.length).toBeLessThanOrEqual(20)
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length)
      if (ids.length > 0) {
        expect(list[0]?.id).toBe(String(ids[ids.length - 1]))
      }
    }))
  })

  it('预选职业:不同的非空码、新的在前、最多 3 个', () => {
    const seen = [job('1', '63200'), job('2', null), job('3', '63200'), job('4', '65201'), job('5', '72106'), job('6', '13110')]
    expect(seenNocsOf({ seen })).toEqual(['63200', '65201', '72106'])
    expect(seenNocsOf({ seen: [job('1'), job('2')] })).toEqual([])
  })

  it('向导里刚登录过(软刷没回来、分层态还是匿名):不再起弹', () => {
    expect(gateDueFor({ loggedIn: false })).toBe(true)
    markGateSignedIn()
    expect(gateDueFor({ loggedIn: false })).toBe(false)
  })

  it('落本地存储:新的在前、空码记 null;坏原文按零条算', () => {
    markSeenJob({ id: 101, noc: '63200' })
    markSeenJob({ id: 102, noc: '' })
    expect(readSeenJobs()).toEqual([job('102', null), job('101', '63200')])
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    localStorage.setItem(SEEN_KEY, '{oops')
    expect(readSeenJobs()).toEqual([])
    localStorage.setItem(SEEN_KEY, JSON.stringify([{ id: 5 }, { noc: '63200' }, 'x', { id: '6', noc: 7 }, { id: 8, noc: 'abcde' }]))
    expect(readSeenJobs()).toEqual([job('5', null), job('6', null), job('8', null)])
  })
})

describe('所在省预选', () => {
  it('金标:时区对得上省选省(东部时区 + 法语 = 魁省),大西洋时区不预选,境外时区预选境外,没报时区不预选', () => {
    const cases: [string, string, { prov: string, abroad: boolean }][] = [
      ['America/Toronto', 'en-CA', { prov: 'ON', abroad: false }],
      ['America/Toronto', 'fr-CA', { prov: 'QC', abroad: false }],
      ['America/Montreal', 'fr-CA', { prov: 'QC', abroad: false }],
      ['America/Vancouver', 'zh-CN', { prov: 'BC', abroad: false }],
      ['America/Halifax', 'en-CA', { prov: '', abroad: false }],
      ['America/Moncton', 'fr-CA', { prov: '', abroad: false }],
      ['Canada/Atlantic', 'en-CA', { prov: '', abroad: false }],
      ['Asia/Shanghai', 'zh-CN', { prov: '', abroad: true }],
      ['Europe/London', 'en-GB', { prov: '', abroad: true }],
      ['America/New_York', 'en-US', { prov: '', abroad: true }],
      ['', 'en-US', { prov: '', abroad: false }],
    ]
    for (const [tz, lang, want] of cases) {
      device(tz, lang)
      expect(guessProv(), `${tz} ${lang}`).toEqual(want)
    }
  })

  it('任意输入:省与境外不并存;有省就不预选境外;境外只在时区不空、对不上省时出现', () => {
    fc.assert(fc.property(fc.constantFrom('', 'ON', 'QC', 'BC'), fc.constantFrom('', 'America/Toronto', 'America/Halifax', 'Asia/Seoul', 'UTC'), (home, tz) => {
      const out = gateProvSeedOf({ home, tz })
      expect(out.prov !== '' && out.abroad).toBe(false)
      if (home !== '') {
        expect(out).toEqual({ prov: home, abroad: false })
      }
      if (out.abroad) {
        expect(home === '' && tz !== '').toBe(true)
      }
    }))
  })

  it('境外预选与 homeProvinceOf 不打架:预选了省的设备一定不预选境外', () => {
    device('America/Toronto', 'en-CA')
    expect(homeProvinceOf()).toBe('ON')
    expect(guessProv().abroad).toBe(false)
  })
})

describe('草稿并进答案档', () => {
  it('金标:没答的格缺席;境外写处境 overseas 且现居省清空;答了省只写现居省', () => {
    expect(gatePatchOf(draft())).toEqual({})
    expect(gatePatchOf(draft({ goal: 1, majors: ['11.0701'], nocs: ['21232'], prov: 'ON' })))
      .toEqual({ goalBand: 1, majors: ['11.0701'], nocs: ['21232'], resProv: 'ON' })
    expect(gatePatchOf(draft({ majors: ['52.0301', '11.0701'] }))).toEqual({ majors: ['52.0301', '11.0701'] })
    expect(gatePatchOf(draft({ majors: [] }))).not.toHaveProperty('majors')
    expect(gatePatchOf(draft({ goal: 2, abroad: true, prov: 'ON' })))
      .toEqual({ goalBand: 2, status: 'overseas', resProv: '' })
  })

  it('写进答案门面:其余字段原样保留,专业码过得了 normalize', () => {
    writeAnswers({ eduBand: 3, ageBand: 2, clbBand: 5, status: 'working', resProv: 'BC', provs: ['ON'], nocs: ['11100'] })
    writeAnswers(gatePatchOf(draft({ goal: 1, majors: ['52.0201', '11.0701'], abroad: true })))
    const a = readAnswers()
    expect(a.eduBand).toBe(3)
    expect(a.ageBand).toBe(2)
    expect(a.clbBand).toBe(5)
    expect(a.provs).toEqual(['ON'])
    expect(a.nocs).toEqual(['11100'])
    expect(a.status).toBe('overseas')
    expect(a.resProv).toBe('')
    expect(a.goalBand).toBe(1)
    expect(a.majors).toEqual(['52.0201', '11.0701'])
    expect(normalize({ majors: ['52.0203'] }).majors).toEqual(['52.0203'])
    expect(normalize({}).majors).toEqual([])
    expect(normalize({ major: '52.0203' }).majors).toEqual([])
  })

  it('mergeBasics 老账号:先读回服务端档,只填空着的格(已答的处境 / 省 / 职业 / 目标不被盖),整份推上去', async () => {
    const srv = serverWith({ status: 'working', resProv: 'BC', eduBand: 4, nocs: ['11100'], goalBand: 2, bandsV2: true })
    const ok = await mergeBasics(gatePatchOf(draft({ goal: 1, majors: ['51.3801'], nocs: ['21300'], prov: 'ON' })))
    expect(ok).toBe(true)
    expect(srv.puts.length).toBe(1)
    const body = sent(srv.puts)
    expect(body.basic.status).toBe('working')
    expect(body.basic.eduBand).toBe(4)
    expect(body.basic.resProv).toBe('BC')
    expect(body.basic.goalBand).toBe(2)
    expect(body.basic.nocs).toEqual(['11100'])
    expect(body.basic.majors).toEqual(['51.3801'])
    expect(body.score.ticks).toEqual({ 'bc:1': true })
  })

  it('mergeBasics 新注册(服务端空档):四道题全写上去', async () => {
    const srv = serverWith(null)
    expect(await mergeBasics(gatePatchOf(draft({ goal: 1, majors: ['11.0701'], nocs: ['21232'], prov: 'QC' })))).toBe(true)
    const body = sent(srv.puts)
    expect(body.basic.goalBand).toBe(1)
    expect(body.basic.majors).toEqual(['11.0701'])
    expect(body.basic.nocs).toEqual(['21232'])
    expect(body.basic.resProv).toBe('QC')
    expect(body.basic.status).toBe('')
    resetAnswersMemory()
    const abroad = serverWith(null)
    expect(await mergeBasics(gatePatchOf(draft({ goal: 2, abroad: true })))).toBe(true)
    expect(sent(abroad.puts).basic.status).toBe('overseas')
    expect(sent(abroad.puts).basic.resProv).toBe('')
  })

  it('mergeBasics:推的时候会话没了(PUT 401)交回 false,不许当成推成了', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init != null && init.method === 'PUT') {
        return reply(401, {})
      }
      return reply(200, { answers: null })
    }))
    expect(await mergeBasics({ majors: ['52.0201'] })).toBe(false)
  })

  it('只填空格(任意现档 × 任意草稿):已答的格不动;处境与现居省绑着判,拼不出境外 + 有省;空档 = 全写', () => {
    const cur = fc.record({
      status: fc.constantFrom('', 'working', 'overseas'),
      resProv: fc.constantFrom('', 'BC'),
      goalBand: fc.constantFrom(0, 2),
      majors: fc.constantFrom<string[]>([], ['14.0901']),
      nocs: fc.constantFrom<string[]>([], ['11100']),
    })
    const d = fc.record({
      goal: fc.constantFrom(0, 1, 2),
      majors: fc.constantFrom<string[]>([], ['52.0201'], ['52.0201', '11.0701']),
      nocs: fc.constantFrom<string[]>([], ['21300']),
      prov: fc.constantFrom('', 'ON'),
      abroad: fc.boolean(),
      intent: fc.constant('job' as const),
    })
    fc.assert(fc.property(cur, d, (c, g) => {
      const a: Answers = { ...EMPTY, ...c }
      const patch = gatePatchOf(g)
      const out = blankPatchOf({ cur: a, patch })
      if (a.goalBand !== 0) expect(out.goalBand).toBeUndefined()
      if (a.majors.length > 0) expect(out.majors).toBeUndefined()
      if (a.nocs.length > 0) expect(out.nocs).toBeUndefined()
      if (out.status != null) expect(a.status === '' && a.resProv === '').toBe(true)
      if (out.resProv != null && out.resProv !== '') expect(a.resProv === '' && a.status !== 'overseas').toBe(true)
      const merged = { ...a, ...out }
      const torn = (x: Answers) => x.status === 'overseas' && x.resProv !== ''
      if (torn(a) === false) expect(torn(merged)).toBe(false)
      expect(blankPatchOf({ cur: { ...EMPTY }, patch })).toEqual(patch)
    }))
  })

  it('mergeBasics:会话没了(401)就不写不推,交回 false 让调用方留着草稿', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init != null && init.method != null ? init.method : 'GET')
      return reply(401, {})
    }))
    expect(await mergeBasics({ majors: ['52.0201'] })).toBe(false)
    expect(calls).toEqual(['GET'])
  })

  it('草稿原文读回:每格验类型,由头认不出按点开职位,不是对象给 null', () => {
    expect(toGateDraft(JSON.stringify({ goal: 2, majors: ['52.0203'], nocs: ['63200', 7, ''], prov: 'QC', abroad: false, intent: 'save' })))
      .toEqual({ goal: 2, majors: ['52.0203'], nocs: ['63200'], prov: 'QC', abroad: false, intent: 'save' })
    expect(toGateDraft(JSON.stringify({ goal: 'x', abroad: true, intent: 'hack' })))
      .toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: true, intent: 'job' })
    expect(toGateDraft(JSON.stringify([1, 2]))).toBeNull()
    expect(toGateDraft(null)).toBeNull()
  })

  it('草稿原文读回验值域(本地存储是信任边界):值域外的按没答,境外不留省,职业码去重', () => {
    expect(toGateDraft(JSON.stringify({ goal: 3, majors: ['13'], nocs: ['abcde', '1234', '21300', '21300'], prov: 'TERR' })))
      .toEqual({ goal: 0, majors: [], nocs: ['21300'], prov: '', abroad: false, intent: 'job' })
    expect(toGateDraft(JSON.stringify({ goal: 1, majors: ['11.0701'], prov: 'ON', abroad: true, intent: 'apply' })))
      .toEqual({ goal: 1, majors: ['11.0701'], nocs: [], prov: '', abroad: true, intent: 'apply' })
    expect(toGateDraft(JSON.stringify({ goal: 1.5, majors: 7, prov: 'on' })))
      .toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: false, intent: 'job' })
    for (const v of ['job', 'apply', 'save', 'entry']) {
      expect(isGateIntent(v)).toBe(true)
    }
    for (const v of ['', 'JOB', 'hack', 'saves']) {
      expect(isGateIntent(v)).toBe(false)
    }
  })

  it('专业验码形(2026-10-04 A2):CIP class 码两位 . 四位才收;旧大类码 \'01\'…\'12\' 与半截码按没答', () => {
    for (const ok of ['52.0203', '11.0701', '01.0000', '99.9999']) {
      expect(toGateDraft(JSON.stringify({ majors: [ok] }))?.majors, ok).toEqual([ok])
    }
    for (const bad of ['01', '12', '52', '52.02', '5.0203', '52.02031', '52-0203', ' 52.0203', '52.0203 ', 'ab.cdef']) {
      expect(toGateDraft(JSON.stringify({ majors: [bad] }))?.majors, bad).toEqual([])
    }
  })

  it('专业清单读回(2026-10-05 多选)金标:逐个验码形、去重、超过 3 个丢掉、保序;单值那版的 major 串不认;不是数组按没答', () => {
    expect(toGateDraft(JSON.stringify({ majors: ['52.0203', 'x', '52.0203', 7, '11.0701', '14.0901', '26.0101'] }))?.majors)
      .toEqual(['52.0203', '11.0701', '14.0901'])
    expect(toGateDraft(JSON.stringify({ major: '52.0203' }))?.majors).toEqual([])
    expect(toGateDraft(JSON.stringify({ majors: '52.0203' }))?.majors).toEqual([])
    expect(toGateDraft(JSON.stringify({ majors: null }))?.majors).toEqual([])
  })

  it('专业清单往返(任意清单):写进草稿再读回 = 合形的去重后前 3 个;gatePatchOf 有就整份带上,没有就缺席', () => {
    const code = fc.oneof(fc.constantFrom('52.0203', '11.0701', '14.0901', '26.0101', '51.3801'),
      fc.constantFrom('01', '52.02', 'ab.cdef', ' 11.0701'))
    fc.assert(fc.property(fc.array(code, { maxLength: 7 }), (raw) => {
      const want: string[] = []
      for (const c of raw) {
        if (/^\d{2}\.\d{4}$/.test(c) && want.includes(c) === false && want.length < 3) {
          want.push(c)
        }
      }
      writeGateDraft(draft({ majors: raw }))
      const back = readGateDraft()
      expect(back?.majors).toEqual(want)
      const patch = gatePatchOf(back as GateDraft)
      if (want.length > 0) {
        expect(patch.majors).toEqual(want)
      } else {
        expect(patch).not.toHaveProperty('majors')
      }
    }))
  })
})

describe('交接戳与补交', () => {
  it('戳的有效期金标:没落过 / 不是数 / 落在将来 / 过 10 分钟都不算;10 分钟整还算', () => {
    const now = 1_000_000_000
    const cases: [string | null, boolean][] = [
      [null, false], ['', false], ['abc', false], [String(now + 1), false],
      [String(now), true], [String(now - 600000), true], [String(now - 600001), false],
    ]
    for (const [raw, want] of cases) {
      expect(isHandoffFresh({ raw, now }), String(raw)).toBe(want)
    }
  })

  it('取戳读完即撤:落过取一次是 true,再取就没了;没落过是 false', () => {
    expect(takeGateHandoff()).toBe(false)
    markGateHandoff()
    expect(takeGateHandoff()).toBe(true)
    expect(takeGateHandoff()).toBe(false)
    sessionStorage.setItem(HANDOFF_KEY, String(Date.now() - 600001))
    expect(takeGateHandoff()).toBe(false)
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
  })

  it('syncGateDraft 成功:草稿与戳都撤、交回 true;失败(会话没了):草稿与戳都放回去、交回 false', async () => {
    const d = draft({ goal: 1, majors: ['52.0203'], intent: 'apply' })
    writeGateDraft(d)
    markGateHandoff()
    serverWith(null)
    expect(await syncGateDraft(d)).toBe(true)
    expect(readGateDraft()).toBeNull()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    resetAnswersMemory()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async () => reply(401, {})))
    expect(await syncGateDraft(d)).toBe(false)
    expect(readGateDraft()).toEqual(d)
    expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull()
  })
})

describe('补交钩子 useGateSync(全站骨架挂的那一个)', () => {
  // 2026-10-04 收口审查:登录 = 票据在且认得出人(邮箱不空),与 useEntryGate 同一把尺;原先这里登录种子的邮箱是空串
  function seed(loggedIn: boolean, email = loggedIn ? 'a@b.c' : '') {
    const initial = { in: loggedIn, email, displayName: null, avatar: null, proUntil: null }
    return function wrapSession(children: ReactNode) {
      // eslint-disable-next-line react/no-children-prop -- SessionProviderIn 的 children 是必填属性,走 createElement 第三参过不了类型
      return createElement(SessionProvider, { initial, children })
    }
  }

  it('已登录 + 有戳 + 有草稿:并进答案档、撤草稿、记引导弹过', async () => {
    const srv = serverWith(null)
    writeGateDraft(draft({ goal: 2, majors: ['51.3801'], nocs: ['31301'], prov: 'NS', intent: 'job' }))
    markGateHandoff()
    runHook(() => useGateSync(), seed(true))
    await vi.waitFor(() => expect(srv.puts.length).toBe(1))
    expect(sent(srv.puts).basic.majors).toEqual(['51.3801'])
    expect(sent(srv.puts).basic.resProv).toBe('NS')
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    await vi.waitFor(() => expect(localStorage.getItem(OB_SEEN_KEY)).not.toBeNull())
  })

  it('已登录 + 有草稿但没戳(页头登录 / 关掉向导之后 / 别的标签页):不碰答案档,草稿留着只给预填', async () => {
    const srv = serverWith({ status: 'pgwp', resProv: 'BC', nocs: ['11100'], bandsV2: true })
    writeGateDraft(draft({ abroad: true, nocs: ['21300'] }))
    runHook(() => useGateSync(), seed(true))
    await new Promise((r) => setTimeout(r, 20))
    expect(srv.gets.length).toBe(0)
    expect(srv.puts.length).toBe(0)
    expect(readGateDraft()).not.toBeNull()
    expect(localStorage.getItem(OB_SEEN_KEY)).toBeNull()
  })

  it('Google 回跳(2026-10-04 A2):人在职位板、由头是进站 → 补交完按答案换地址栏;点开职位 / 投递 / 收藏、别的页不换', async () => {
    serverWith(null)
    writeGateDraft(draft({ goal: 2, majors: ['51.3801'], nocs: ['31301', '33102'], prov: 'NS', intent: 'entry' }))
    markGateHandoff()
    runHook(() => useGateSync(), seed(true))
    await vi.waitFor(() => expect(ROUTER.replace).toHaveBeenCalledTimes(1))
    expect(ROUTER.replace).toHaveBeenLastCalledWith('/?prov=NS&noc=31301%2C33102')

    const cases: [GateDraft['intent'], string][] = [
      ['job', '/'], ['apply', '/'], ['save', '/'], ['entry', '/employers'], ['job', '/jobs/12'],
    ]
    for (const [intent, path] of cases) {
      ROUTER.replace.mockReset()
      PATH.current = path
      serverWith(null)
      writeGateDraft(draft({ nocs: ['31301'], prov: 'NS', intent }))
      markGateHandoff()
      runHook(() => useGateSync(), seed(true))
      await new Promise((r) => setTimeout(r, 20))
      expect(ROUTER.replace, intent + path).not.toHaveBeenCalled()
    }
  })

  it('补交没成、戳放回去后换页再交:没交成不记引导弹过、不换地址栏;后来交成了也不换(地址栏一页只试一次)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async () => reply(401, {})))
    writeGateDraft(draft({ nocs: ['31301'], prov: 'NS', intent: 'entry' }))
    markGateHandoff()
    const root = createRoot(document.createElement('div'))
    function Probe() {
      useGateSync()
      return null
    }
    const tree = () => seed(true)(createElement(Probe))
    act(() => root.render(tree()))
    await vi.waitFor(() => expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull())
    await vi.waitFor(() => expect(readGateDraft()).not.toBeNull())
    expect(ROUTER.replace).not.toHaveBeenCalled()
    expect(localStorage.getItem(OB_SEEN_KEY)).toBeNull()
    resetAnswersMemory()
    const srv = serverWith(null)
    PATH.current = '/employers'
    act(() => root.render(tree()))
    PATH.current = '/'
    act(() => root.render(tree()))
    await vi.waitFor(() => expect(srv.puts.length).toBe(1))
    await vi.waitFor(() => expect(localStorage.getItem(OB_SEEN_KEY)).not.toBeNull())
    await new Promise((r) => setTimeout(r, 20))
    expect(ROUTER.replace).not.toHaveBeenCalled()
    act(() => root.unmount())
  })

  it('票据在但认不出人(会话种子 in 且邮箱空,收口审查):按匿名 —— 不补交、不记引导弹过、不换地址栏;陈戳撤掉,草稿留着', async () => {
    const srv = serverWith(null)
    writeGateDraft(draft({ nocs: ['31301'], prov: 'NS', intent: 'entry' }))
    markGateHandoff()
    runHook(() => useGateSync(), seed(true, ''))
    await new Promise((r) => setTimeout(r, 20))
    expect(srv.gets.length + srv.puts.length).toBe(0)
    expect(localStorage.getItem(OB_SEEN_KEY)).toBeNull()
    expect(ROUTER.replace).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(readGateDraft()).not.toBeNull()
  })

  it('这一页刚在向导里登录过(邮箱注册当场已换过地址栏):补交钩子再交也不换', async () => {
    serverWith(null)
    markGateSignedIn()
    writeGateDraft(draft({ nocs: ['31301'], prov: 'NS', intent: 'entry' }))
    markGateHandoff()
    runHook(() => useGateSync(), seed(true))
    await new Promise((r) => setTimeout(r, 20))
    expect(readGateDraft()).toBeNull()
    expect(ROUTER.replace).not.toHaveBeenCalled()
  })

  it('未登录开页(收口审查改判):不碰答案档;交接戳是陈的(走到注册屏又刷新 / 关页再开),撤掉;草稿留着只给预填', async () => {
    const srv = serverWith(null)
    writeGateDraft(draft({ goal: 1 }))
    markGateHandoff()
    runHook(() => useGateSync(), seed(false))
    await new Promise((r) => setTimeout(r, 20))
    expect(srv.gets.length + srv.puts.length).toBe(0)
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(readGateDraft()).not.toBeNull()
  })
})

describe('职位弹框收口 useActModal(三份入栈手柄都经 PeekStack 画到这一台)', () => {
  function adv(id: number, noc: string) {
    return { id, noc } as unknown as AdvisorJob
  }
  function plan(loggedIn: boolean) {
    return { loggedIn } as unknown as AdvisorPlan
  }

  it('匿名:开哪一个都先弹向导(2026-10-04 起不数);登录永远不弹;浏览照记', () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, {})))
    const open = (id: number, loggedIn = false) =>
      runHook(() => useActModal({ job: adv(id, '21300'), plan: plan(loggedIn) })).current?.gate
    expect(open(1)).toBe(true)
    expect(open(2)).toBe(true)
    expect(open(9, true)).toBe(false)
    expect(open(3)).toBe(true)
    expect(readSeenJobs().map((s) => s.id)).toEqual(['3', '9', '2', '1'])
  })

  it('向导里刚登录过(软刷没回来):开弹框不再弹', () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, {})))
    markGateSignedIn()
    const out = runHook(() => useActModal({ job: adv(5, ''), plan: plan(false) }))
    expect(out.current?.gate).toBe(false)
  })
})

describe('进站向导整机 useEntryGate(全站骨架上的 GateSync 起)', () => {
  function seed(loggedIn: boolean, email = loggedIn ? 'a@b.c' : '') {
    const initial = { in: loggedIn, email, displayName: null, avatar: null, proUntil: null }
    return function wrapSession(children: ReactNode) {
      // eslint-disable-next-line react/no-children-prop -- SessionProviderIn 的 children 是必填属性,走 createElement 第三参过不了类型
      return createElement(SessionProvider, { initial, children })
    }
  }

  it('未登录进首页:弹;关掉后同一页重挂(刷新)不再弹', () => {
    const first = runHook(() => useEntryGate(), seed(false))
    expect(first.current?.open).toBe(true)
    act(() => first.current?.onClose())
    expect(first.current?.open).toBe(false)
    const again = runHook(() => useEntryGate(), seed(false))
    expect(again.current?.open).toBe(false)
  })

  it('登录不弹;职位整页不弹', () => {
    expect(runHook(() => useEntryGate(), seed(true)).current?.open).toBe(false)
    PATH.current = '/jobs/123'
    expect(runHook(() => useEntryGate(), seed(false)).current?.open).toBe(false)
  })

  it('票据在但认不出人(过期,会话种子 in 且邮箱空):按未登录弹 —— 与开职位弹框的分层态同一把尺', () => {
    expect(runHook(() => useEntryGate(), seed(true, '')).current?.open).toBe(true)
  })

  it('注册完:收起(软刷交给路由),同一页不再弹', () => {
    const first = runHook(() => useEntryGate(), seed(false))
    expect(first.current?.open).toBe(true)
    act(() => first.current?.onDone())
    expect(first.current?.open).toBe(false)
    expect(runHook(() => useEntryGate(), seed(false)).current?.open).toBe(false)
  })
})
