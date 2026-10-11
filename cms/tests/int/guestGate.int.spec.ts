// 访客向导(lib/guest + lib/quiz 的 mergeBasics;2026-10-03 付费闭环批 A1,设计稿 docs/design/通用/付费闭环-20261003.md)。
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
// 2026-10-07 浏览记录整条删(向导不再按看过的岗预选职业,Frank「为什么我选的是 AI 和 cloud,然后做的工作是上面的」→「你弄吧」):
//       ② 撤;① 的「浏览记录多少条都不影响」与职位弹框收口的「浏览照记」两句随之撤。
// 2026-10-09「我的档案」批:首访引导向导退役,「记引导弹过」(本地存储 jobs_onboarding_v1)那一记从补交钩子撤 ——
//       上面「交成了才记引导弹过」与探针「runGateSync 不等结果就 obMarkSeen → 没交成不记红」随之作废,对它的断言删;
//       「交成了才回职位板、没交成不换地址栏、一页只试一次」照验。
// 2026-10-11 Frank「我应该先注册 再问问题吧。不然回答的问题 存哪里去了」→「需要改」:访客不再答题,门只剩注册框 ——
//       ②③④⑤⑥⑧(浏览记录、所在省预选、草稿并进答案档 / mergeBasics、交接戳与补交钩子 useGateSync、草稿读回验值域)
//       随访客草稿整段删,对应断言删;留 ①⑦⑨ 与职位弹框收口、进站整机。「弹向导」现在弹的是注册框(见 gateAuth.int.spec.ts)。
import fc from 'fast-check'
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { gateDueFor, isEntryGateExempt, markGateSignedIn, takeEntryGate } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import { SessionProvider } from '@/components/auth'
import { useEntryGate } from '@/components/gate/hooks'
import { useActModal } from '@/components/advisor/hooks'
import type { AdvisorJob, AdvisorPlan } from '@/components/advisor/types'

const PATH = vi.hoisted(() => ({ current: '/' }))
const ROUTER = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, replace: ROUTER.replace }),
  usePathname: () => PATH.current,
}))

const ENTRY_KEY = 'o2p_gate_entry_v1'

function reply(status: number, body: object) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
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

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
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
  it('金标:未登录就弹;登录不弹', () => {
    expect(gateDueFor({ loggedIn: false })).toBe(true)
    expect(gateDueFor({ loggedIn: true })).toBe(false)
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

describe('向导里刚登录过', () => {
  it('软刷没回来、分层态还是匿名:不再起弹', () => {
    expect(gateDueFor({ loggedIn: false })).toBe(true)
    markGateSignedIn()
    expect(gateDueFor({ loggedIn: false })).toBe(false)
  })
})

describe('职位弹框收口 useActModal(三份入栈手柄都经 PeekStack 画到这一台)', () => {
  function adv(id: number, noc: string) {
    return { id, noc } as unknown as AdvisorJob
  }
  function plan(loggedIn: boolean) {
    return { loggedIn } as unknown as AdvisorPlan
  }

  it('匿名:开哪一个都先弹向导(2026-10-04 起不数);登录永远不弹', () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, {})))
    const open = (id: number, loggedIn = false) =>
      runHook(() => useActModal({ job: adv(id, '21300'), plan: plan(loggedIn) })).current?.gate
    expect(open(1)).toBe(true)
    expect(open(2)).toBe(true)
    expect(open(9, true)).toBe(false)
    expect(open(3)).toBe(true)
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
