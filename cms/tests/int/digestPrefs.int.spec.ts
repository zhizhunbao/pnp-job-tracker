// 「我的求职」新岗推送设置(2026-10-10 批 2,16b / 16d;lib/alerts 的 saveDigestPrefs / confirmApply / toDigestPrefs)。
// 连接是桩(记下每条 SQL 与参数),发信 sendMail 打桩,不碰生产库、不真发信。
// 性质:① 存成账户邮箱 = 直接生效、收件邮箱列写 NULL;存成已确认的那个 = 直接生效、原样留着;
//       ② 换成新邮箱:先给新邮箱发确认信(信里的链接带 HMAC token),发出去了才记成待确认、收件邮箱不动;没发出去回 mail、频率照存、邮箱不动;
//       ③ 确认链接:用户 id 非数字 / 没有待确认 / token 对不上 → invalid,且不写库;对得上 → 换上,done;
//       ④ 库里频率认不得的折成 off(不发),三档原样。
// 探针:saveDigestPrefs 不发确认信直接写新邮箱 → ② 红;confirmApply 不核 token → ③ 红;toDigestPrefs 原样透传 → ④ 红。
import { describe, expect, it, vi } from 'vitest'

import { SQL } from '@/lib/db'
import type { Db } from '@/lib/db'

const sent: { to: string, html: string }[] = []
let mailOk = true
vi.mock('@/lib/mail', async (orig) => {
  const real = await orig<typeof import('@/lib/mail')>()
  return {
    ...real,
    sendMail: async (x: { to: string, html: string }) => {
      sent.push({ to: x.to, html: x.html })
      return mailOk
    },
  }
})
vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

// 测试例外:域内函数直接点文件
const { confirmApply, saveDigestPrefs, toDigestPrefs } = await import('@/lib/alerts/functions')
const { confirmToken } = await import('@/lib/mail')

type Call = { sql: string, params: unknown[] }

function db(prefs: { freq: string, email: string | null, pending_email: string | null } | null, confirmRows = 1) {
  const calls: Call[] = []
  const conn = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params })
      if (sql === SQL.DIGEST_PREFS_ONE) {
        return { rows: prefs == null ? [] : [prefs] }
      }
      if (sql === SQL.DIGEST_PREFS_CONFIRM) {
        return { rows: Array.from({ length: confirmRows }, () => ({ user_id: 5 })) }
      }
      return { rows: [] }
    },
  }
  return { conn: conn as unknown as Db, calls }
}

const writes = (calls: Call[]) => calls.filter((c) => c.sql !== SQL.DIGEST_PREFS_ONE)

describe('存推送设置', () => {
  it('① 账户邮箱直接生效(列写 NULL);已确认的那个原样留着', async () => {
    sent.length = 0
    const a = db(null)
    expect(await saveDigestPrefs({ db: a.conn, userId: 5, account: 'Me@X.com', freq: 'daily', email: 'me@x.com' })).toBe('saved')
    expect(writes(a.calls)).toEqual([{ sql: SQL.DIGEST_PREFS_PUT, params: [5, 'daily', null] }])
    const b = db({ freq: 'weekly', email: 'other@y.com', pending_email: null })
    expect(await saveDigestPrefs({ db: b.conn, userId: 5, account: 'me@x.com', freq: 'off', email: 'other@y.com' })).toBe('saved')
    expect(writes(b.calls)).toEqual([{ sql: SQL.DIGEST_PREFS_PUT, params: [5, 'off', 'other@y.com'] }])
    expect(sent).toEqual([])
  })

  it('② 新邮箱先发确认信,发出去才记待确认;没发出去回 mail、邮箱不动', async () => {
    sent.length = 0
    mailOk = true
    const a = db(null)
    expect(await saveDigestPrefs({ db: a.conn, userId: 5, account: 'me@x.com', freq: 'weekly', email: 'new@z.com' })).toBe('pending')
    expect(sent.map((m) => m.to)).toEqual(['new@z.com'])
    expect(sent[0]?.html).toContain('u=5&t=' + confirmToken({ userId: 5, email: 'new@z.com' }))
    expect(writes(a.calls)).toEqual([{ sql: SQL.DIGEST_PREFS_PENDING, params: [5, 'weekly', 'new@z.com'] }])
    mailOk = false
    const b = db({ freq: 'weekly', email: 'other@y.com', pending_email: null })
    expect(await saveDigestPrefs({ db: b.conn, userId: 5, account: 'me@x.com', freq: 'daily', email: 'new@z.com' })).toBe('mail')
    expect(writes(b.calls)).toEqual([{ sql: SQL.DIGEST_PREFS_PUT, params: [5, 'daily', 'other@y.com'] }])
    mailOk = true
  })
})

describe('确认链接', () => {
  it('③ 不对的一律 invalid 且不写库;对得上换上', async () => {
    const good = confirmToken({ userId: '5', email: 'new@z.com' })
    for (const [u, t, prefs] of [
      ['abc', good, { freq: 'off', email: null, pending_email: 'new@z.com' }],
      ['5', good, { freq: 'off', email: null, pending_email: null }],
      ['5', good, null],
      ['5', 'deadbeefdeadbeef', { freq: 'off', email: null, pending_email: 'new@z.com' }],
      ['5', good.slice(1), { freq: 'off', email: null, pending_email: 'new@z.com' }],
    ] as const) {
      const d = db(prefs)
      expect(await confirmApply({ db: d.conn, u, t })).toBe('invalid')
      expect(writes(d.calls)).toEqual([])
    }
    const ok = db({ freq: 'off', email: null, pending_email: 'new@z.com' })
    expect(await confirmApply({ db: ok.conn, u: '5', t: good })).toBe('done')
    expect(writes(ok.calls)).toEqual([{ sql: SQL.DIGEST_PREFS_CONFIRM, params: ['5', 'new@z.com'] }])
    const late = db({ freq: 'off', email: null, pending_email: 'new@z.com' }, 0)
    expect(await confirmApply({ db: late.conn, u: '5', t: good })).toBe('invalid')
  })
})

describe('库行', () => {
  it('④ 频率认不得的折 off', () => {
    for (const f of ['off', 'daily', 'weekly', 'monthly', '', null]) {
      const want = f === 'daily' || f === 'weekly' ? f : 'off'
      expect(toDigestPrefs({ freq: f, email: null, pending_email: null }).freq).toBe(want)
    }
  })
})
