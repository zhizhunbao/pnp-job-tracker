// 一个省的城市清单 /api/stats/cities?prov=(2026-10-09「我的档案」批:所在地答案的可选城市下拉;lib/stats 的 statsCitiesRoute)。
// dev 直连生产库不碰库:连接全 mock。
// 性质:① 省码只认 lib/location 的 13 个省 / 地区码(去首尾空白后原样比,不转大小写);缺、空、小写、不认识、
//          原型链上的名字(toString / __proto__ / constructor)一律 400 { error: 'prov' },且不碰库;
//       ② 认得的省 → 200 { cities: [{ name, zh, ko, jobs }] },行序照库给的、译名缺折空串、在招数空折 0;
//          SQL 是 STATS_CITIES_BY_PROV,参数 [省码, 300];带与 city 同口径的 SWR 缓存头;
//       ③ 按省缓存:同省 10 分钟内只查一次库,换省另查,过了 TTL 重查;
//       ④ 零行 / 查挂了 → 200 空清单、查挂了留一行痕,都不进缓存(下一个请求重查)。
// 探针:isProvCode 改成 `prov in PROV_NAMES` → ①「原型链」红;改用本域 PROVS(10 省)→ ①「三个地区」红;
//       route 不判 slot.ts → ③「过了 TTL」红;零行也 set 进缓存 → ④ 红;toProvCityRow 用 numOrNull → ②「空折 0」红。
import fc from 'fast-check'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SQL } from '@/lib/db'
import type { QueryResult, SqlParam } from '@/lib/db'
import { PROV_NAMES } from '@/lib/location'
import { CITY_PROV_CACHE_CONTROL, CITY_PROV_LIMIT, CITY_PROV_TTL_MS } from '@/lib/stats/constants'

const h = vi.hoisted(() => {
  const state: { rows: Record<string, unknown>[], fail: boolean } = { rows: [], fail: false }
  const calls: { sql: string, params: SqlParam[] }[] = []
  const query = vi.fn(async (sql: string, params: SqlParam[] = []): Promise<QueryResult> => {
    calls.push({ sql, params })
    if (state.fail) {
      throw new Error('connection reset')
    }
    return { rows: state.rows, rowCount: state.rows.length }
  })
  return { state, calls, query }
})

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))

/**
 * 每个用例拿一份全新的模块(按省缓存是模块级的,不重载就会串用例)。
 */
async function fresh() {
  vi.resetModules()
  return await import('@/lib/stats/server')
}

/**
 * 打一次 /api/stats/cities,带上查询串(原样拼,测的就是参数闸)。
 */
async function hit(route: (req: Request) => Promise<Response>, qs: string) {
  return await route(new Request('https://offer2pr.com/api/stats/cities' + qs))
}

const ROWS = [
  { city: 'Toronto', name_zh: '多伦多', name_ko: '토론토', open_jobs: 1427 },
  { city: 'Ottawa', name_zh: '渥太华', name_ko: '', open_jobs: '612' },
  { city: 'Beachburg', name_zh: null, name_ko: null, open_jobs: null },
]

// 先热一遍模块转换(冷启动 import 整条 quota / payload 链要好几秒,别让头一个用例吃 5 秒超时)
beforeAll(async () => {
  await import('@/lib/stats/server')
}, 60_000)

beforeEach(() => {
  h.state.rows = ROWS
  h.state.fail = false
  h.calls.length = 0
  h.query.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('① 省码闸', () => {
  it('缺、空、小写、不认识、原型链上的名字 → 400 { error: prov },不碰库', async () => {
    const { statsCitiesRoute } = await fresh()
    for (const qs of ['', '?prov', '?prov=', '?prov=%20', '?prov=on', '?prov=Ontario', '?prov=XX', '?prov=ONT',
      '?prov=toString', '?prov=__proto__', '?prov=constructor', '?prov=hasOwnProperty']) {
      const res = await hit(statsCitiesRoute, qs)
      expect(res.status, qs).toBe(400)
      expect(await res.json(), qs).toEqual({ error: 'prov' })
    }
    expect(h.query).not.toHaveBeenCalled()
  })

  it('13 个省 / 地区码全认(含三个地区),首尾空白去掉再比', async () => {
    const { statsCitiesRoute } = await fresh()
    const codes = Object.keys(PROV_NAMES)
    expect(codes).toHaveLength(13)
    for (const code of codes) {
      const res = await hit(statsCitiesRoute, '?prov=' + encodeURIComponent(' ' + code + ' '))
      expect(res.status, code).toBe(200)
    }
    expect(h.calls.map((c) => c.params[0])).toEqual(codes)
  })

  it('任意不在 13 码里的串 → 400', async () => {
    const { statsCitiesRoute } = await fresh()
    const codes = new Set(Object.keys(PROV_NAMES))
    await fc.assert(fc.asyncProperty(fc.string({ maxLength: 6 }), async (s) => {
      fc.pre(codes.has(s.trim()) === false)
      const res = await hit(statsCitiesRoute, '?prov=' + encodeURIComponent(s))
      expect(res.status).toBe(400)
    }), { numRuns: 200 })
    expect(h.query).not.toHaveBeenCalled()
  })
})

describe('② 回包', () => {
  it('行序照库、译名缺折空串、在招数空折 0;SQL 与参数;SWR 头', async () => {
    const { statsCitiesRoute } = await fresh()
    const res = await hit(statsCitiesRoute, '?prov=ON')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      cities: [
        { name: 'Toronto', zh: '多伦多', ko: '토론토', jobs: 1427 },
        { name: 'Ottawa', zh: '渥太华', ko: '', jobs: 612 },
        { name: 'Beachburg', zh: '', ko: '', jobs: 0 },
      ],
    })
    expect(res.headers.get('Cache-Control')).toBe(CITY_PROV_CACHE_CONTROL)
    expect(h.calls).toEqual([{ sql: SQL.STATS_CITIES_BY_PROV, params: ['ON', CITY_PROV_LIMIT] }])
    expect(CITY_PROV_LIMIT).toBe(300)
  })

  it('SQL 只取这一个省、在招多的在前、带上限', () => {
    expect(SQL.STATS_CITIES_BY_PROV).toContain('WHERE s.province = $1')
    expect(SQL.STATS_CITIES_BY_PROV).toContain('ORDER BY s.open_jobs DESC NULLS LAST LIMIT $2')
  })
})

describe('③ 按省缓存', () => {
  it('同省只查一次;换省另查;过了 TTL 重查', async () => {
    const { statsCitiesRoute } = await fresh()
    let now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await hit(statsCitiesRoute, '?prov=ON')
    now += CITY_PROV_TTL_MS - 1
    const again = await hit(statsCitiesRoute, '?prov=ON')
    expect((await again.json()).cities).toHaveLength(3)
    expect(h.query).toHaveBeenCalledTimes(1)
    await hit(statsCitiesRoute, '?prov=BC')
    expect(h.query).toHaveBeenCalledTimes(2)
    await hit(statsCitiesRoute, '?prov=BC')
    expect(h.query).toHaveBeenCalledTimes(2)
    now += 1
    await hit(statsCitiesRoute, '?prov=ON')
    expect(h.query).toHaveBeenCalledTimes(3)
  })
})

describe('④ 零行 / 查挂了', () => {
  it('零行回空清单、不进缓存', async () => {
    const { statsCitiesRoute } = await fresh()
    h.state.rows = []
    const res = await hit(statsCitiesRoute, '?prov=NU')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cities: [] })
    h.state.rows = ROWS
    expect((await (await hit(statsCitiesRoute, '?prov=NU')).json()).cities).toHaveLength(3)
    expect(h.query).toHaveBeenCalledTimes(2)
  })

  it('查挂了回空清单、留痕、不进缓存', async () => {
    const { statsCitiesRoute } = await fresh()
    const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    h.state.fail = true
    const res = await hit(statsCitiesRoute, '?prov=ON')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cities: [] })
    expect(logs.mock.calls.map((c) => String(c[0])).some((s) => s.includes('connection reset'))).toBe(true)
    h.state.fail = false
    expect((await (await hit(statsCitiesRoute, '?prov=ON')).json()).cities).toHaveLength(3)
    expect(h.query).toHaveBeenCalledTimes(2)
  })
})
