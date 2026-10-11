// 收件箱(2026-10-10 批 3;lib/inbox 的收信回调、站内转发、对投递,与 /api/inbox/* 的本人隔离)。
// 连接是桩(按 SQL 回行、记下每条写库),发信 postMail 打桩,收信全文接口 fetch 打桩;不碰生产库、不真发信。
// 性质:① 认人:收件人里本站子域的地址名 → 那个用户;地址名不是任何人的 → unknown、不取全文不写库;不是本站子域 → ignored;
//          发件人就是本站子域(自己转自己)→ loop;
//       ② 对投递:子地址标记 a<id> 且是本人的 → 那一条;标记不是本人的退到「发件人 = 投过的雇主邮箱」;没标记按 In-Reply-To 对上同一串;
//       ③ 对上投递 → 那一条记「雇主回复」(参数带本人 id);同一封重放(插入回 0 行)不再改状态、不再转发;
//       ④ 转发开 → 发一封到账户邮箱,回复地址 = 原发件人,正文带原发件人;转发关 → 不发;
//       ⑤ 回调口:验过签的 email.received 地址不是任何人的 → 200 不重试;全文取不到 → 502 让 Resend 重试;
//       ⑥ 隔离:/api/inbox、/api/inbox/thread、/api/inbox/read 的每条 SQL 第一个参数都是会话里的用户;别人的投递 → 404。
// 探针:recipientHitOf 不核域名 → ①ignored 那条红;linkAppOf 不核标记归属 → ②第二条红;receiveInbound 重放也改状态 → ③红;
//       forwardIn 不看开关 → ④红;applyInboundRoute 把 fetch 失败也回 200 → ⑤红;INBOX_THREAD_APP 去掉 user_id 条件(桩按参数判)→ ⑥红。
import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

process.env.INBOUND_DOMAIN = 'in.test.dev'
process.env.RESEND_API_KEY = 're_test'
const SECRET_RAW = Buffer.from('inbox-secret').toString('base64')
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + SECRET_RAW

const sent: { to: string, subject: string, text: string, replyTo: string }[] = []
vi.mock('@/lib/mail', async (orig) => {
  const real = await orig<typeof import('@/lib/mail')>()
  return {
    ...real,
    postMail: async (x: { to: string, subject: string, text: string, replyTo: string }) => {
      sent.push({ to: x.to, subject: x.subject, text: x.text, replyTo: x.replyTo })
      return { ok: true, id: 'out_1', why: '' }
    },
  }
})
vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

let dbNow: unknown = null
vi.mock('@/lib/db/server', () => ({ getDb: async () => dbNow }))
let sessionUser: { id: number, email: string } | null = null
vi.mock('@/lib/quota/server', async (orig) => {
  const real = await orig<typeof import('@/lib/quota/server')>()
  return { ...real, getUserOrNull: async () => sessionUser }
})
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { SQL } = await import('@/lib/db')
// 测试例外:域内函数直接点文件
const { receiveInbound } = await import('@/lib/inbox/functions')
const { RECV_DUP, RECV_IGNORED, RECV_LOOP, RECV_STORED, RECV_UNKNOWN } = await import('@/lib/inbox/constants')
const { inboxReadRoute, inboxRoute, inboxThreadRoute } = await import('@/lib/inbox/routes')
const { applyInboundRoute } = await import('@/lib/apply/routes')

type Call = { sql: string, params: unknown[] }

type Opts = {
  forward?: boolean
  ownApps?: number[]
  threadApp?: number | null
  senderApp?: number | null
  dup?: boolean
  knownAlias?: string
}

function db(o: Opts = {}) {
  const calls: Call[] = []
  const conn = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params })
      if (sql === SQL.INBOX_ALIAS_USER) {
        return { rows: params[0] === (o.knownAlias ?? 'liwei.k3x9q') ? [{ user_id: 5, forward: o.forward ?? true, email: 'li@gmail.com' }] : [] }
      }
      if (sql === SQL.INBOX_APP_TAG) {
        return { rows: (o.ownApps ?? []).includes(Number(params[0])) && params[1] === 5 ? [{ id: params[0] }] : [] }
      }
      if (sql === SQL.INBOX_APP_THREAD) {
        return { rows: o.threadApp == null ? [] : [{ id: o.threadApp }] }
      }
      if (sql === SQL.INBOX_APP_SENDER) {
        return { rows: o.senderApp == null ? [] : [{ id: o.senderApp }] }
      }
      if (sql === SQL.INBOX_IN_ADD) {
        return { rows: o.dup ? [] : [{ id: 501 }] }
      }
      return { rows: [] }
    },
  }
  return { conn, calls }
}

const fetched: string[] = []
function stubFetch(ok = true, headers: Record<string, string> = {}) {
  fetched.length = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    fetched.push(String(url))
    return {
      ok, status: ok ? 200 : 500,
      json: async () => ({ text: 'Hi Li,\nAre you free Tuesday?', html: null, subject: 'Re: Application', headers, message_id: '<e1@corp.com>' }),
    }
  }))
}

function event(to: string, from = 'Sarah Chen <sarah@corp.com>') {
  return JSON.stringify({
    type: 'email.received',
    data: { email_id: 'rcv_1', from, to: [to], cc: [], subject: 'Re: Application', message_id: '<e1@corp.com>' },
  })
}

const mailTo = (x: { userEmail: string, employerEmail: string }) => x.employerEmail
const writes = (calls: Call[]) => calls.filter((c) => c.sql.trimStart().startsWith('INSERT') || c.sql.trimStart().startsWith('UPDATE'))

afterEach(() => {
  vi.unstubAllGlobals()
  sent.length = 0
})

describe('收信回调:认人', () => {
  it('① 本站地址认到人;不是任何人的 unknown;别的域 ignored;自己转自己 loop', async () => {
    stubFetch()
    const a = db()
    expect(await receiveInbound({ db: a.conn as never, body: event('Li <liwei.k3x9q@in.test.dev>'), mailTo })).toBe(RECV_STORED)
    expect(a.calls.find((c) => c.sql === SQL.INBOX_IN_ADD)?.params[0]).toBe(5)

    const b = db()
    expect(await receiveInbound({ db: b.conn as never, body: event('nobody.zzzzz@in.test.dev'), mailTo })).toBe(RECV_UNKNOWN)
    expect(writes(b.calls)).toEqual([])

    stubFetch()
    const c = db()
    expect(await receiveInbound({ db: c.conn as never, body: event('liwei.k3x9q@other.dev'), mailTo })).toBe(RECV_IGNORED)
    expect(c.calls).toEqual([])
    expect(fetched).toEqual([])

    const d = db()
    expect(await receiveInbound({ db: d.conn as never, body: event('liwei.k3x9q@in.test.dev', 'x@in.test.dev'), mailTo })).toBe(RECV_LOOP)
    expect(d.calls).toEqual([])
  })
})

describe('收信回调:对投递与状态', () => {
  it('② 标记是本人的 → 那一条;不是本人的退到发件人;没标记按邮件头串', async () => {
    stubFetch()
    const a = db({ ownApps: [42], senderApp: 9 })
    await receiveInbound({ db: a.conn as never, body: event('liwei.k3x9q+a42@in.test.dev'), mailTo })
    expect(a.calls.find((c) => c.sql === SQL.INBOX_IN_ADD)?.params[1]).toBe(42)

    stubFetch()
    const b = db({ ownApps: [], senderApp: 9 })
    await receiveInbound({ db: b.conn as never, body: event('liwei.k3x9q+a42@in.test.dev'), mailTo })
    expect(b.calls.find((c) => c.sql === SQL.INBOX_IN_ADD)?.params[1]).toBe(9)
    expect(b.calls.find((c) => c.sql === SQL.INBOX_APP_SENDER)?.params).toEqual([5, 'sarah@corp.com'])

    stubFetch(true, { 'in-reply-to': '<prev@corp.com>' })
    const c = db({ threadApp: 77 })
    await receiveInbound({ db: c.conn as never, body: event('liwei.k3x9q@in.test.dev'), mailTo })
    expect(c.calls.find((x) => x.sql === SQL.INBOX_APP_THREAD)?.params).toEqual([5, ['<prev@corp.com>']])
    expect(c.calls.find((x) => x.sql === SQL.INBOX_IN_ADD)?.params[1]).toBe(77)

    stubFetch()
    const d = db()
    await receiveInbound({ db: d.conn as never, body: event('liwei.k3x9q@in.test.dev'), mailTo })
    expect(d.calls.find((x) => x.sql === SQL.INBOX_IN_ADD)?.params[1]).toBeNull()
    expect(d.calls.some((x) => x.sql === SQL.INBOX_APP_REPLIED)).toBe(false)
  })

  it('③ 对上投递记「雇主回复」;重放不再改状态、不再转发', async () => {
    stubFetch()
    const a = db({ ownApps: [42] })
    expect(await receiveInbound({ db: a.conn as never, body: event('liwei.k3x9q+a42@in.test.dev'), mailTo })).toBe(RECV_STORED)
    expect(a.calls.find((c) => c.sql === SQL.INBOX_APP_REPLIED)?.params).toEqual([42, 5])

    stubFetch()
    sent.length = 0
    const b = db({ ownApps: [42], dup: true })
    expect(await receiveInbound({ db: b.conn as never, body: event('liwei.k3x9q+a42@in.test.dev'), mailTo })).toBe(RECV_DUP)
    expect(b.calls.some((c) => c.sql === SQL.INBOX_APP_REPLIED)).toBe(false)
    expect(sent).toEqual([])
  })

  it('④ 转发开:发到账户邮箱、回复地址是原发件人、正文带原发件人;关:不发', async () => {
    stubFetch()
    const a = db({ forward: true })
    await receiveInbound({ db: a.conn as never, body: event('liwei.k3x9q@in.test.dev'), mailTo })
    expect(sent).toHaveLength(1)
    expect(sent[0]?.to).toBe('li@gmail.com')
    expect(sent[0]?.replyTo).toBe('sarah@corp.com')
    expect(sent[0]?.text).toContain('Sarah Chen <sarah@corp.com>')
    expect(sent[0]?.text).toContain('Are you free Tuesday?')
    expect(a.calls.some((c) => c.sql === SQL.INBOX_FORWARDED)).toBe(true)

    sent.length = 0
    stubFetch()
    const b = db({ forward: false })
    await receiveInbound({ db: b.conn as never, body: event('liwei.k3x9q@in.test.dev'), mailTo })
    expect(sent).toEqual([])
    expect(b.calls.some((c) => c.sql === SQL.INBOX_FORWARDED)).toBe(false)
  })
})

function signed(body: string): Request {
  const id = 'msg_1'
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = createHmac('sha256', Buffer.from(SECRET_RAW, 'base64')).update(id + '.' + ts + '.' + body).digest('base64')
  return new Request('http://x/api/apply/inbound', {
    method: 'POST', body, headers: { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': 'v1,' + sig },
  })
}

describe('回调口', () => {
  it('⑤ 地址不是任何人的回 200;全文取不到回 502', async () => {
    stubFetch()
    dbNow = db().conn
    const r1 = await applyInboundRoute(signed(event('nobody.zzzzz@in.test.dev')))
    expect(r1.status).toBe(200)

    stubFetch(false)
    dbNow = db().conn
    const r2 = await applyInboundRoute(signed(event('liwei.k3x9q@in.test.dev')))
    expect(r2.status).toBe(502)
  })
})

describe('本人隔离', () => {
  it('⑥ 每条 SQL 按会话用户收窄;别人的投递 404', async () => {
    const calls: Call[] = []
    dbNow = {
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params })
        if (sql === SQL.INBOX_THREAD_APP) {
          return { rows: params[0] === 1 && params[1] === 42 ? [{ id: 42, company: 'Co', reply_to: 'a+a42@in.test.dev' }] : [] }
        }
        if (sql === SQL.INBOX_ALIAS_ONE) {
          return { rows: [{ alias: 'a', forward: true }] }
        }
        return { rows: [] }
      },
    }
    sessionUser = { id: 2, email: 'b@x.com' }
    const r = await inboxThreadRoute(new Request('http://x/api/inbox/thread?app=42'))
    expect(r.status).toBe(404)

    sessionUser = { id: 1, email: 'a@x.com' }
    const ok = await inboxThreadRoute(new Request('http://x/api/inbox/thread?app=42'))
    expect(ok.status).toBe(200)
    expect((await ok.json()).app.replyTo).toBe('a@in.test.dev')

    calls.length = 0
    sessionUser = { id: 2, email: 'b@x.com' }
    await inboxRoute(new Request('http://x/api/inbox'))
    await inboxReadRoute(new Request('http://x/api/inbox/read', { method: 'POST', body: JSON.stringify({ id: 9 }) }))
    expect(calls.length).toBeGreaterThan(0)
    for (const c of calls) {
      expect(c.params[0]).toBe(2)
    }

    sessionUser = null
    expect((await inboxRoute(new Request('http://x/api/inbox'))).status).toBe(401)
  })
})
