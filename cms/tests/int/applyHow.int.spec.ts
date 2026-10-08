// 投递邮箱只给登录用户、点了才查(2026-10-04 Frank「进来就要求用户登录注册」→「照这样改」;同日收口审查补测)。
// 性质:① 接口 applyhow 未登录 401、不进库;② 日限按登录用户计(键 = 用户号,不看 IP):同一 IP 两个用户各算各的;
//       ③ 读库优先,库里存好的直接回;④ 投递栏在架岗一律出,已下架只看有没有原帖链接(applyBarShownOf 金标);
//       ⑤ 投递栏整机 useApplyBar:向导里刚登录过(软刷没回来)点投递不再弹向导、直接查;在途时再点不重复查、
//          「已投」只记一次;× 关掉投递向导撤落地的投递意图;查完没有邮箱不弹框、留痕。
// 探针:删掉路由的 user == null 闸 → ①红;限额键换回 ipOf(req) → ②红;onApply 去掉 isGateSignedIn → ⑤第一条红;
//       launch 去掉在途闸 → ⑤第二条红。
// 2026-10-04 二轮收口审查补:② 改读作「每用户 + 每 IP 两位都判」—— 同一 IP 轮换新号,到 IP 上限 429,换个 IP 照常;
//       ⑤ 查完没有邮箱改成弹「投递失败」一行(原先无声);会话过期 401 → 记投递意图、弹登录框;429 → 弹「次数用完」一行;
//       网络断 → 「投递失败」。探针:限额去掉每 IP 那一位 → IP 那条红;launch 去掉 else 分流 → 三条提示全红。
//       ⑥ 详情页直出的整理版(loadJdSsrById)与原文一样脱敏:[APPLY] 节里的雇主邮箱 / 电话不随载荷发给匿名访客。
//       探针:loadJdSsrById 的整理版去掉 scrubPii → ⑥红。
// 2026-10-05 Frank「已经下架了,就不要在有按钮点击了吧」:④ 改读作「已下架一律不出」(灰色「看官网」钮撤)。
// 2026-10-07 B2 站内投递(投递钮切到 /apply/<id>,mailto 整条删):接口 applyhow 连同 ①② 撤;⑤ 改读作「点投递只跳投递页一次,
//       不查邮箱、不记「已投」、不弹邮件框」;会话过期 / 次数用完 / 查无邮箱三条提示随之撤(由投递页的门与接口各自回)。
//       探针:launch 里留一次取邮箱 → 「一次 applyhow 都不请求」红;去掉在途闸 → 「连点只跳一次」红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyBarShownOf } from '@/components/jobs/functions'
import { useApplyBar } from '@/components/jobs/hooks'
import type { JobFact, JobPlan } from '@/components/jobs/types'
import { loadJdSsrById } from '@/lib/jobs/server'
import { markGateSignedIn } from '@/lib/guest/functions'
import { CACHE as GUEST } from '@/lib/guest/variables'
import type { QueryResult, SqlParam } from '@/lib/db'

const h = vi.hoisted(() => {
  const user: { current: { id: number, email: string, role: string } | null } = { current: null }
  const query = vi.fn(async (_sql: string, _params?: SqlParam[]): Promise<QueryResult> => ({
    rows: [{ apply_email: 'hr@acme.ca' }], rowCount: 1,
  }))
  const push = vi.fn((_url: string) => undefined)
  return { user, query, push }
})

vi.mock('payload', () => ({ getPayload: async () => ({ auth: async () => ({ user: h.user.current }) }) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: h.push }), usePathname: () => '/jobs/42',
}))

const INTENT_KEY = 'apply_resume_v1'

function job(p: Partial<JobFact> = {}): JobFact {
  return { id: 42, applyUrl: 'https://example.com/post/42', status: 'active', ...p } as unknown as JobFact
}

function plan(loggedIn: boolean): JobPlan {
  return { loggedIn, profileOk: true, profile: null } as unknown as JobPlan
}

function reply(status: number, body: object) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

// 挂一个只跑 hook 的探针件(同 guestGate 的 createRoot 形,不为测试加依赖)
function runBar(j: JobFact, p: JobPlan) {
  const out: { current: ReturnType<typeof useApplyBar> | null } = { current: null }
  function Probe() {
    out.current = useApplyBar({ job: j, t: (k: string) => k, plan: p, onPage: false })
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => {
    root.render(createElement(Probe))
  })
  return out
}

// fetch 桩:applyhow 按调用方给的回包(可挂起),收藏 / 已投接口照常 2xx;按地址分账
function server(applyhow: () => Promise<ReturnType<typeof reply>>) {
  const calls = { applyhow: 0, saved: 0 }
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/api/jobs/applyhow')) {
      calls.applyhow += 1
      return applyhow()
    }
    if (String(url).includes('saved') && init != null && init.method === 'POST') {
      calls.saved += 1
    }
    return reply(200, { docs: [] })
  }))
  return calls
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  GUEST.signedIn = false
  h.user.current = null
  h.query.mockClear()
  h.push.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('详情页直出的整理版脱敏 loadJdSsrById', () => {
  const FMT = '[ROLE]\n- Bake bread\n[REQS]\n- High school\n[PAY]\n- $18 hourly\n[WORKHOURS]\n- 40 hours\n'
    + '[APPLY]\nContact Dave Landry at 902-345-2229 or davidlandry@hotmail.ca'

  function dbOf(row: object) {
    return { query: async () => ({ rows: [row], rowCount: 1 }) } as unknown as Parameters<typeof loadJdSsrById>[0]['db']
  }

  it('整理版与原文都不带雇主邮箱 / 电话(匿名访客与爬虫拿到的载荷里没有);其余节原样', async () => {
    const out = await loadJdSsrById({
      db: dbOf({ description: 'Bake bread. Email davidlandry@hotmail.ca', jd_formatted: FMT, seo_ok: true }), id: 79059478,
    })
    expect(out.formatted).not.toBeNull()
    expect(String(out.formatted)).not.toContain('@')
    expect(String(out.formatted)).not.toContain('902-345-2229')
    expect(String(out.formatted)).toContain('Bake bread')
    expect(out.text).not.toContain('@')
  })

  it('没整理版照旧给 null(不把空格子脱成空串)', async () => {
    const out = await loadJdSsrById({ db: dbOf({ description: 'Bake bread', jd_formatted: null, seo_ok: false }), id: 1 })
    expect(out.formatted).toBeNull()
  })
})

describe('投递栏出不出 applyBarShownOf', () => {
  it('金标:在架岗一律出(原帖链接空也出);已下架一律不出(2026-10-05 撤「看官网」钮)', () => {
    expect(applyBarShownOf(job())).toBe(true)
    expect(applyBarShownOf(job({ applyUrl: '' }))).toBe(true)
    expect(applyBarShownOf(job({ status: 'closed' }))).toBe(false)
    expect(applyBarShownOf(job({ status: 'closed', applyUrl: '' }))).toBe(false)
  })
})

describe('投递栏整机 useApplyBar(点投递跳投递页)', () => {
  it('匿名点投递弹访客向导、不跳;向导里刚登录过(软刷没回来)再点不弹,直接跳 /apply/42', () => {
    const calls = server(async () => reply(200, { email: 'hr@acme.ca' }))
    const anon = runBar(job(), plan(false))
    act(() => anon.current?.onApply())
    expect(anon.current?.stage).toBe('auth')
    expect(h.push).not.toHaveBeenCalled()
    markGateSignedIn()
    const fresh = runBar(job(), plan(false))
    act(() => fresh.current?.onApply())
    expect(h.push).toHaveBeenCalledWith('/account?sec=sjobs&job=42')
    expect(calls.applyhow).toBe(0)
    expect(calls.saved).toBe(0)
  })

  it('登录用户点投递:只跳一次投递页,一次 applyhow 都不请求、不记「已投」;连点三下只跳一次,在途 busy', () => {
    const calls = server(async () => reply(200, { email: 'hr@acme.ca' }))
    const bar = runBar(job(), plan(true))
    act(() => bar.current?.onApply())
    act(() => bar.current?.onApply())
    act(() => bar.current?.onApply())
    expect(h.push).toHaveBeenCalledTimes(1)
    expect(h.push).toHaveBeenCalledWith('/account?sec=sjobs&job=42')
    expect(bar.current?.busy).toBe(true)
    expect(calls.applyhow).toBe(0)
    expect(calls.saved).toBe(0)
  })

  it('× 关掉投递向导:撤落地的投递意图(之后别处登录再回本岗不会替他续投)', () => {
    server(async () => reply(200, { email: 'hr@acme.ca' }))
    const bar = runBar(job(), plan(false))
    act(() => bar.current?.onApply())
    expect(localStorage.getItem(INTENT_KEY)).not.toBeNull()
    act(() => bar.current?.onAuthClose())
    expect(localStorage.getItem(INTENT_KEY)).toBeNull()
    expect(bar.current?.stage).toBe('idle')
  })
})
