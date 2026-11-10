/**
 * 「我的」第一批(2026-11-09):从简历填档案的洗数与映射、「来自简历」标记的去留、每日推送跳过没有职业依据的人。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { describe, expect, it } from 'vitest'
import { fromKeptOf, isFromResume } from '@/components/gate/functions'
import { toDigestUser } from '@/lib/alerts/functions'
import { prefillFactOf, prefillMajorsOf, prefillWorksOf } from '@/lib/resume/functions'
import type { Db } from '@/lib/db'

const MARKS = ['workNocs:21232', 'workNocs:63200', 'majors:11.0701', 'name:Pat Testuser']

describe('来自简历的标记', () => {
  it('值在才算', () => {
    expect(isFromResume({ marks: MARKS, field: 'workNocs', value: '21232' })).toBe(true)
    expect(isFromResume({ marks: MARKS, field: 'majors', value: '21232' })).toBe(false)
  })

  it('未改再存全留;摘掉、改掉的才消失', () => {
    const same = { marks: MARKS, majors: ['11.0701'], workNocs: ['21232', '63200'], name: 'Pat Testuser' }
    expect(fromKeptOf(same)).toEqual(MARKS)
    expect(fromKeptOf({ marks: MARKS, majors: [], workNocs: ['63200'], name: 'Pat Q Testuser' })).toEqual(['workNocs:63200'])
  })
})

describe('模型回包洗数', () => {
  it('非字符串丢掉、超量截断、坏格按没有', () => {
    expect(prefillFactOf({ name: 12, titles: ['a', 3, ' b ', 'c', 'd'], majors: 'x' }))
      .toEqual({ name: '', titles: ['a', 'b', 'c'], majors: [] })
    expect(prefillFactOf({ name: ' Pat ', titles: null, majors: ['m1', 'm2', 'm3'] }))
      .toEqual({ name: 'Pat', titles: [], majors: ['m1', 'm2'] })
  })

  it('专业只取搜索第一名,去重,搜不到留空', () => {
    function hitsOf(q: string): string[] {
      if (q === 'none') {
        return []
      }
      return ['11.0701', q]
    }
    expect(prefillMajorsOf({ names: ['a', 'none', 'b'], hitsOf })).toEqual(['11.0701'])
  })
})

describe('职业名映射职业码', () => {
  function dbOf(sims: Record<string, { noc: string; sim: number }[]>, known: string[]): Db {
    return {
      query: async function query(sql: string, params: string[][] | string[]) {
        if (sql.includes('similarity')) {
          return { rows: sims[String(params[0])] }
        }
        return { rows: known.map(function row(noc) { return { noc, title: 't' } }) }
      },
    } as Db
  }

  it('够线才收第一名,不够留空,库内没名字的码丢掉,重复合并', async () => {
    const db = dbOf({
      dev: [{ noc: '21232', sim: 1 }], dev2: [{ noc: '21232', sim: 0.9 }], weak: [{ noc: '00012', sim: 0.59 }],
      ghost: [{ noc: '64312', sim: 0.8 }], none: [],
    }, ['21232'])
    expect(await prefillWorksOf({ db, titles: ['dev', 'dev2', 'weak', 'ghost', 'none'] })).toEqual(['21232'])
  })
})

describe('每日推送的职业依据', () => {
  it('库里算的 has_occ 原样带出,空按没有', () => {
    const row = { user_id: 1, email: 'a@b', locale: 'en', pro_until: null, last_daily_at: null }
    expect(toDigestUser({ ...row, has_occ: true }).hasOcc).toBe(true)
    expect(toDigestUser({ ...row, has_occ: false }).hasOcc).toBe(false)
    expect(toDigestUser({ ...row, has_occ: null }).hasOcc).toBe(false)
  })
})
