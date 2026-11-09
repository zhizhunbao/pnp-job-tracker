/**
 * 邮件退订(2026-11-08「我的」清单第 16 条):合法链接停掉推送,不合法的什么都不动。
 *
 * @author Frank
 * @time 2026-11-09 00:20:00
 */
import { describe, expect, it, vi } from 'vitest'

import { EMAIL_SHELL, UNSUB_SAVED } from '@/lib/alerts/constants'
import { SQL } from '@/lib/db'
import type { Db } from '@/lib/db'

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

// 测试例外:域内函数直接点文件
const { unsubApply } = await import('@/lib/alerts/functions')
const { unsubToken } = await import('@/lib/mail')

type Call = { sql: string, params: unknown[] }

function run(t: string) {
  const calls: Call[] = []
  const updates: unknown[] = []
  const db = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params })
      return { rows: [] }
    },
  } as unknown as Db
  const payload = {
    update: async (x: unknown) => {
      updates.push(x)
      return {}
    },
  }
  return { calls, updates, out: unsubApply({ payload: payload as never, db, u: '77', t }) }
}

describe('退订', () => {
  it('金标:合法链接 = 周报标记、推送设置两处都停', async () => {
    const r = run(unsubToken('77'))
    expect(await r.out).toBe('done')
    expect(r.updates).toHaveLength(1)
    expect(r.calls.map((c) => c.sql)).toEqual([SQL.DIGEST_PREFS_OFF])
  })

  it('性质:token 不对,一条库都不写', async () => {
    const r = run('0'.repeat(16))
    expect(await r.out).toBe('invalid')
    expect(r.calls).toHaveLength(0)
    expect(r.updates).toHaveLength(0)
  })
})

describe('匹配信', () => {
  it('金标:底部是真的退订链接,不让人去账户页找', () => {
    expect(EMAIL_SHELL).toContain('<a href="{unsubUrl}"')
    expect(UNSUB_SAVED).toBe('Unsubscribe')
  })
})
