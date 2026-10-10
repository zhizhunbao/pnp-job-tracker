// 智能投递按所在城市的都会区排岗(2026-10-09「我的档案」批:所在地答案加了可选城市 resCity;lib/queue 的 toQueueUser / cityOf /
// loadCandidates 与 SQL.QUEUE_CANDIDATES)。dev 直连生产库不碰库:连接是桩。
// 性质:① 按哪个城市排(QueueUserFact.city)= 目标档 goalBand 恰为 2(先找工作)且 resCity 有值时取 resCity,其余一律空串 ——
//          在「goalBand ∈ {缺, null, 0, 1, 2, 3, '2'} × resCity ∈ {缺, null, '', 'Ottawa', 'Kanata'} × basic 缺 / 答案 null / 答案是 JSON 串」
//          全格上穷举断言;省、想做的工作照旧不受影响;
//       ② firstRunOf 只清上次跑的时刻,城市原样带着;
//       ③ loadCandidates 把城市作第 6 个参数传给 QUEUE_CANDIDATES,前 5 个参数不变;
//       ④ SQL:WHERE 仍只取本省($4),排序头一键按 $6 判同城 / 同 CMA,之后照旧评分、发布时刻。
// 探针:cityOf 去掉 goalBand 判 → ①「拿 PR 的」红;cityOf 把 '2' 也当 2 → ①「字符串档」红;firstRunOf 漏抄 city → ② 红;
//       loadCandidates 漏传 $6 → ③ 红。
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'

import { SQL } from '@/lib/db'
import type { QueryResult, SqlParam } from '@/lib/db'
import { QUEUE_PER_USER } from '@/lib/queue/constants'
// 测试例外:域内函数直接点文件(本域没有 index 门,server 门只放路由)
import { firstRunOf, loadCandidates, toQueueUser } from '@/lib/queue/functions'
import type { QueueUserDbRow } from '@/lib/queue/types'

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

const GOALS = [undefined, null, 0, 1, 2, 3, '2'] as const
const CITIES = [undefined, null, '', 'Ottawa', 'Kanata'] as const

/**
 * 测试用库行(答案按给的 basic 拼;key 缺席 = 不写这一键)。
 */
function dbRow(answers: QueueUserDbRow['answers']): QueueUserDbRow {
  return {
    user_id: 9, sender_name: 'Zhang Wei', last_queue_at: '2026-10-08T12:00:00.000Z', answers, pro_until: null, resume_id: 7,
  }
}

/**
 * 只放进给了值的键(undefined = 这一键压根不在答案里)。
 */
function basicOf(goal: unknown, city: unknown) {
  const basic: Record<string, unknown> = { nocs: ['13110'], resProv: 'ON' }
  if (goal !== undefined) {
    basic.goalBand = goal
  }
  if (city !== undefined) {
    basic.resCity = city
  }
  return basic
}

describe('① 按哪个城市排', () => {
  it('全格穷举:goalBand 恰为 2 且 resCity 有值才取 resCity,省与想做的工作不受影响', () => {
    for (const goal of GOALS) {
      for (const city of CITIES) {
        const basic = basicOf(goal, city)
        let want = ''
        if (goal === 2 && typeof city === 'string') {
          want = city
        }
        for (const answers of [{ basic }, JSON.stringify({ basic })]) {
          const u = toQueueUser(dbRow(answers as QueueUserDbRow['answers']))
          expect(u.city, JSON.stringify({ goal, city, kind: typeof answers })).toBe(want)
          expect(u.prov).toBe('ON')
          expect(u.nocs).toEqual(['13110'])
        }
      }
    }
  })

  it('答案 null / 没有基础段 / 基础段 null → 空串', () => {
    expect(toQueueUser(dbRow(null)).city).toBe('')
    expect(toQueueUser(dbRow({})).city).toBe('')
    expect(toQueueUser(dbRow({ basic: null })).city).toBe('')
  })

  it('任意城市名在先找工作档下原样带出', () => {
    fc.assert(fc.property(fc.string({ maxLength: 40 }), (name) => {
      const u = toQueueUser(dbRow({ basic: { goalBand: 2, resCity: name, resProv: 'ON', nocs: [] } }))
      expect(u.city).toBe(name)
      const pr = toQueueUser(dbRow({ basic: { goalBand: 1, resCity: name, resProv: 'ON', nocs: [] } }))
      expect(pr.city).toBe('')
    }))
  })
})

describe('② firstRunOf', () => {
  it('只清上次跑的时刻,城市原样带着', () => {
    const u = toQueueUser(dbRow({ basic: { goalBand: 2, resCity: 'Ottawa', resProv: 'ON', nocs: ['13110'] } }))
    expect(u.lastQueueAt).not.toBe('')
    const first = firstRunOf(u)
    expect(first.lastQueueAt).toBe('')
    expect(first.city).toBe('Ottawa')
    expect(first.prov).toBe('ON')
  })
})

describe('③ loadCandidates 传 $6', () => {
  it('城市是第 6 个参数;前 5 个不变;不按城市排时传空串', async () => {
    const calls: { sql: string, params: SqlParam[] }[] = []
    const db = {
      query: async (sql: string, params: SqlParam[] = []): Promise<QueryResult> => {
        calls.push({ sql, params })
        return { rows: [{ id: 5, title: 'Medical receptionist', company_name: 'Clinic', city: 'Kanata', province: 'ON' }], rowCount: 1 }
      },
    }
    const user = toQueueUser(dbRow({ basic: { goalBand: 2, resCity: 'Ottawa', resProv: 'ON', nocs: ['13112', '13110'] } }))
    const got = await loadCandidates({ db: db as never, user, since: '1970-01-01T00:00:00.000Z' })
    expect(got).toEqual([{ id: 5, title: 'Medical receptionist', company: 'Clinic', city: 'Kanata', province: 'ON' }])
    expect(calls).toEqual([{
      sql: SQL.QUEUE_CANDIDATES, params: [9, ['1311'], '1970-01-01T00:00:00.000Z', 'ON', QUEUE_PER_USER, 'Ottawa'],
    }])
    const pr = toQueueUser(dbRow({ basic: { goalBand: 1, resCity: 'Ottawa', resProv: 'ON', nocs: ['13112'] } }))
    await loadCandidates({ db: db as never, user: pr, since: 'x' })
    expect(calls[1]?.params).toHaveLength(6)
    expect(calls[1]?.params[5]).toBe('')
  })
})

describe('④ SQL', () => {
  it('只取本省;排序头一键按 $6 判同城 / 同 CMA,之后照旧评分、发布时刻', () => {
    const sql = SQL.QUEUE_CANDIDATES
    expect(sql).toContain('j.province = $4')
    expect(sql).toContain('LEFT JOIN cities jc ON jc.name = j.city AND jc.province = j.province')
    const order = sql.slice(sql.indexOf('ORDER BY'))
    expect(order).toMatch(/^ORDER BY CASE WHEN \$6::text = '' THEN 1 WHEN j\.city = \$6::text THEN 0/)
    expect(order).toContain('jc.cma = (SELECT uc.cma FROM cities uc WHERE uc.name = $6::text AND uc.province = $4 LIMIT 1) THEN 0')
    expect(order).toMatch(/ELSE 1 END,\s+j\.score DESC NULLS LAST, j\.first_seen DESC LIMIT \$5$/)
  })
})
