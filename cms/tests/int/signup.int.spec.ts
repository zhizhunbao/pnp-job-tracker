// 注册计数的两条来路(2026-09-26 /fe Frank):Google 首次建号原先不计,注册数偏低。
// 来由:Google 那条的建号只有服务端知道(回调里按邮箱查不到 → 当场建),前端拿不到信号;
// 邮箱注册那一处在前端经 lib/track 上报。两条来路落同一个 signup 事件,按渠道(email|google)分组。
// 性质:① 新邮箱首次 Google 登录 = 建号并记一笔 signup(google),同一邮箱再登录不再记;
// ② 先前邮箱注册的老账号改走 Google = 按邮箱关联,不建号不记;③ 本机来源建号照建、不记(dev 直连生产库);
// ④ 登录链失败不建号不记;⑤ 邮箱注册经统一上报门打 signup,渠道 email 两条腿都带上。
// 全程不连库:payload / 配置 / 池全换替身,Google 两个端点由 fetch 替身应答。
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trackSignup } from '@/components/auth/functions'
import { FAIL_PATH, SITE, googleCallbackRoute, loginWithGoogle } from '@/lib/auth/server'
import { SQL } from '@/lib/db'

type FakeUser = { id: number, email: string, loginProvider: string, sessions: object[] }

type FindArgs = { where: { email: { equals: string } } }

type CreateArgs = { data: { email: string, loginProvider: string } }

type Sent = { event: string, prop: string | null }

const h = vi.hoisted(() => {
  // lib/auth 的常量在 import 时读 env:没配 client id 整条回调直接判失败 —— 先给测试值;密钥也换掉,真值不进请求体
  // (stubEnv 在 afterAll 撤回,不漏给同一 worker 里后跑的文件)
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret')
  const users: FakeUser[] = []
  const query = vi.fn(async (_sql: string, _params: string[]) => ({ rows: [] }))
  const create = vi.fn(async (args: CreateArgs) => {
    const u: FakeUser = { id: users.length + 1, email: args.data.email, loginProvider: args.data.loginProvider, sessions: [] }
    users.push(u)
    return u
  })
  const payload = {
    find: async (args: FindArgs) => ({ docs: users.filter((u) => u.email === args.where.email.equals) }),
    create,
    update: async () => ({}),
    collections: { users: { config: { auth: { tokenExpiration: 7200 } } } },
    secret: 'test-secret',
    config: { cookiePrefix: 'payload' },
  }
  return { users, query, create, payload }
})

vi.mock('payload', () => ({
  getPayload: async () => h.payload,
  getFieldsToSign: () => ({}),
  jwtSign: async () => ({ token: 'test-token' }),
}))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))

const PROD_HOST = 'offer2pr.com'
const STATE = 's1'
const EMAIL_NEW = 'new@test.local'
const EMAIL_OLD = 'old@test.local'

function callbackReq(host: string, cookieState: string): Request {
  return new Request('https://offer2pr.com/api/auth/google/callback?code=c1&state=' + STATE, {
    headers: { cookie: 'g_oauth_state=' + cookieState, host },
  })
}

// Google 两个端点:换 token 给 access_token,userinfo 给已验证邮箱
function stubGoogle(email: string) {
  const f = vi.fn(async (url: string) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'test-access' }), { status: 200 })
    }
    return new Response(JSON.stringify({ email, email_verified: true, name: 'Test', picture: null }), { status: 200 })
  })
  vi.stubGlobal('fetch', f)
  return f
}

function stubBeacon() {
  const beacon = vi.fn((_url: string, _body: Blob) => true)
  Object.defineProperty(window.navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true })
  return beacon
}

// jsdom 的 Blob 没有 .text(),走 FileReader 读回请求体
function blobText(b: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.readAsText(b)
  })
}

async function sentOf(beacon: ReturnType<typeof stubBeacon>): Promise<Sent[]> {
  const out: Sent[] = []
  for (const call of beacon.mock.calls) {
    out.push(JSON.parse(await blobText(call[1])) as Sent)
  }
  return out
}

beforeEach(() => {
  h.users.length = 0
  h.query.mockClear()
  h.create.mockClear()
  localStorage.clear()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'umami')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('Google 回调:当场建号才记注册', () => {
  it('新邮箱首次 Google 登录 → 建号并记一笔 signup(google);同一邮箱再登录不再记', async () => {
    stubGoogle(EMAIL_NEW)
    const first = await googleCallbackRoute(callbackReq(PROD_HOST, STATE))
    expect(first.headers.get('location')).toBe(SITE + '/')
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.query.mock.calls).toEqual([[SQL.FUNNEL_EVENT_UPSERT, ['signup', 'google']]])
    const again = await googleCallbackRoute(callbackReq(PROD_HOST, STATE))
    expect(again.headers.get('location')).toBe(SITE + '/')
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.query).toHaveBeenCalledTimes(1)
  })

  it('先前用邮箱注册的老账号改走 Google → 按邮箱关联登录,不建号不记', async () => {
    h.users.push({ id: 1, email: EMAIL_OLD, loginProvider: 'email', sessions: [] })
    stubGoogle(EMAIL_OLD)
    const res = await googleCallbackRoute(callbackReq(PROD_HOST, STATE))
    expect(res.headers.get('location')).toBe(SITE + '/')
    expect(h.create).not.toHaveBeenCalled()
    expect(h.query).not.toHaveBeenCalled()
  })

  it('本机来源建号照建、不记(dev 直连生产库,同漏斗路由口径)', async () => {
    stubGoogle(EMAIL_NEW)
    const res = await googleCallbackRoute(callbackReq('localhost:3000', STATE))
    expect(res.headers.get('location')).toBe(SITE + '/')
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.query).not.toHaveBeenCalled()
  })

  it('登录链失败(state 对不上)→ 不建号不记', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const google = stubGoogle(EMAIL_NEW)
    const res = await googleCallbackRoute(callbackReq(PROD_HOST, 'forged'))
    expect(res.headers.get('location')).toBe(SITE + FAIL_PATH)
    expect(google).not.toHaveBeenCalled()
    expect(h.create).not.toHaveBeenCalled()
    expect(h.query).not.toHaveBeenCalled()
  })
})

describe('loginWithGoogle 交出「是否当场建号」', () => {
  it('库里查不到这个邮箱 → created=true;查得到 → created=false', async () => {
    const first = await loginWithGoogle({ email: EMAIL_NEW, name: null, picture: null })
    const again = await loginWithGoogle({ email: EMAIL_NEW, name: null, picture: null })
    expect([first.created, again.created]).toEqual([true, false])
    expect(h.create).toHaveBeenCalledTimes(1)
  })
})

describe('邮箱注册那一处记渠道 email', () => {
  it('trackSignup → 第一方 signup(email),Umami 那条腿带同一格', async () => {
    const beacon = stubBeacon()
    const umami = vi.fn()
    Object.defineProperty(window, 'umami', { value: { track: umami }, configurable: true, writable: true })
    trackSignup()
    expect(await sentOf(beacon)).toEqual([{ event: 'signup', prop: 'email' }])
    expect(umami).toHaveBeenCalledWith('signup', { mode: 'email' })
  })
})
