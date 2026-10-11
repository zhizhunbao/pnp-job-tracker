// 顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」;lib/notify 的清单与「看过了」,/api/notify、/api/notify/seen)。
// 连接是桩:按 SQL 第一个参数(会话里的用户 id)分人回行,记下每条写库;今日推荐取数函数打桩。不碰生产库。
// 性质:① 隔离:A 登录只看得到 A 的通知,B 的一条都不出;每条 SQL 第一个参数都是会话里的用户;未登录 401;
//       ② 看过了:POST /api/notify/seen 之后再拉,未读数归 0(清单还在);
//       ③ 今日推荐:0 条那一行不出;有条数时那一行带条数(看得见 + 锁住的);推荐算不成只少那一条,不拖垮清单。
// 探针:NOTIFY_LIST 参数换成别的 id → ①红;notifySeenRoute 不写库 → ②红;notifyJsonOf 不丢 0 条推荐 → ③红。
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

let dbNow: unknown = null
vi.mock('@/lib/db/server', () => ({ getDb: async () => dbNow }))
let sessionUser: { id: number, email: string } | null = null
vi.mock('@/lib/quota/server', async (orig) => {
  const real = await orig<typeof import('@/lib/quota/server')>()
  return { ...real, getUserOrNull: async () => sessionUser, isPro: () => false }
})
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
let picksNow: { picks: object[], more: number } | 'throw' = { picks: [], more: 0 }
vi.mock('@/lib/myjobs/server', () => ({
  getPicks: async () => {
    if (picksNow === 'throw') {
      throw new Error('picks down')
    }
    return picksNow
  },
}))

const { SQL } = await import('@/lib/db')
const { notifyRoute, notifySeenRoute } = await import('@/lib/notify/routes')

type Call = { sql: string, params: unknown[] }
type Row = { kind: string, ref_id: number, label: string, at: string }

const TODAY = '2026-10-11T04:00:00.000Z'
const ROWS: Record<number, Row[]> = {
  7: [
    { kind: 'reply', ref_id: 501, label: 'Acme Ltd', at: '2026-10-11T15:00:00.000Z' },
    { kind: 'sent', ref_id: 31, label: 'Acme Ltd', at: '2026-10-10T15:00:00.000Z' },
  ],
  8: [
    { kind: 'bounced', ref_id: 90, label: 'Secret Corp', at: '2026-10-11T16:00:00.000Z' },
  ],
}

// 桩连接:清单按第一个参数分人;每人的「上次看铃铛」记在 seen 里
function db() {
  const calls: Call[] = []
  const seen = new Map<number, string>()
  const conn = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params })
      const uid = Number(params[0])
      if (sql === SQL.NOTIFY_LIST) {
        const mine = [...(ROWS[uid] ?? []), { kind: 'picks', ref_id: 0, label: '', at: TODAY }]
        const s = seen.get(uid)
        return { rows: mine.map((r) => ({ ...r, unseen: s == null || r.at > s })) }
      }
      if (sql === SQL.NOTIFY_SEEN) {
        seen.set(uid, '2026-10-12T00:00:00.000Z')
        return { rows: [] }
      }
      return { rows: [] }
    },
  }
  return { conn, calls }
}

async function list() {
  const r = await notifyRoute(new Request('http://x/api/notify?prov=ON'))
  return { status: r.status, body: await r.json() as { items: { kind: string, id: number, label: string, n: number }[], unseen: number } }
}

afterEach(() => {
  sessionUser = null
  picksNow = { picks: [], more: 0 }
})

describe('/api/notify', () => {
  it('① 隔离:A 只看得到 A 的,每条 SQL 第一个参数是会话里的人;未登录 401', async () => {
    const d = db()
    dbNow = d.conn
    sessionUser = { id: 7, email: 'a@test.local' }
    const a = await list()
    expect(a.status).toBe(200)
    expect(a.body.items.map((x) => x.label)).not.toContain('Secret Corp')
    expect(a.body.items.map((x) => x.kind)).toEqual(['reply', 'sent'])
    for (const c of d.calls) {
      expect(c.params[0]).toBe(7)
    }
    sessionUser = null
    expect((await list()).status).toBe(401)
  })

  it('② 看过了:seen 之后未读数归 0,清单还在', async () => {
    const d = db()
    dbNow = d.conn
    sessionUser = { id: 7, email: 'a@test.local' }
    expect((await list()).body.unseen).toBe(2)
    const s = await notifySeenRoute(new Request('http://x/api/notify/seen', { method: 'POST' }))
    expect(s.status).toBe(200)
    const after = await list()
    expect(after.body.unseen).toBe(0)
    expect(after.body.items).toHaveLength(2)
    expect(d.calls.filter((c) => c.sql === SQL.NOTIFY_SEEN).map((c) => c.params[0])).toEqual([7])
  })

  it('③ 今日推荐:0 条不出;有条数时带「看得见 + 锁住」;算不成只少那一条', async () => {
    dbNow = db().conn
    sessionUser = { id: 8, email: 'b@test.local' }
    picksNow = { picks: [{}, {}, {}], more: 4 }
    const b = await list()
    const p = b.body.items.find((x) => x.kind === 'picks')
    expect(p?.n).toBe(7)
    expect(b.body.unseen).toBe(2)
    picksNow = 'throw'
    const c = await list()
    expect(c.status).toBe(200)
    expect(c.body.items.map((x) => x.kind)).toEqual(['bounced'])
  })
})
