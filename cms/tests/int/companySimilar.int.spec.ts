// 相似雇主卡改服务器分页(2026-10-02 Frank「相似雇主 3000 多?为什么只能展开 14 个」「全站统一 都改成 展开 20 和 收起」):
// 卡头写同类总数,原先取数封顶 20 家、先露 6 家折 14 家 —— 钮上「展开其余 14 个」与卡头 3432 对不上。
// 改成首屏服务端取 6 家,「展开 20 家」按页从 /api/jobs/similar 取 20 家往后接,直到总数;收起后再展开不重取。
// 性质:① 任意总数一路点「展开」:每一下钮上写的家数 = 这一下真多露的家数,点到底露满总数、不重不漏、顺序同服务端;
//       点数 = 1 + ⌈(总数 − 6 − 20) / 20⌉ 档(即 ⌈折起来几家 / 20⌉);② 收起再展开不重取;③ 取数中点了不响应。
// 金标(手写):总数 3432 → 首钮「展开 20 家 ▾」(旧形是「展开其余 14 个」);接口地址查询串编码;路由参数校验与绑定参数。
// 同日取页机并进 pager 桶 usePagedFold(AIP 指定雇主卡同一台):下面的卡照它装,用的是 pager 桶的那几只函数。
// 探针:把首屏当「已取 20 家」算折起来几家(旧口径)时金标「展开 20 家」对不上 —— 金标分得开新旧口径。
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { simAnchorOf, simPageUrlOf, simTotalOf } from '@/components/companies/functions'
import type { SimilarEmployer } from '@/components/companies/types'
import { FOLD_STEP } from '@/components/pager/constants'
import {
  foldMoreLabelOf, foldViewOf, makeAppendPage, makePagedFold, makePagedMore, pagedExtraOf, pagedRowsOf, pageUrlOf,
} from '@/components/pager/functions'
import { makeT } from '@/lib/i18n'
import { jobsSimilarRoute, loadSimilarEmployers } from '@/lib/jobs/server'
import type { Db, QueryResult, SqlParam } from '@/lib/db'

const h = vi.hoisted(() => {
  const query = vi.fn(async (_sql: string, _params?: SqlParam[]): Promise<QueryResult> => ({ rows: [], rowCount: 0 }))
  return { query }
})

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))

const zh = makeT('zh')

/** 首屏服务端取几家(lib/jobs 的 SIMILAR_FIRST_ROWS) */
const FIRST = 6

function emp(i: number, total: number): SimilarEmployer {
  return {
    slug: 'co-' + i, name: 'Co ' + i, sponsorGrade: null, openCount: 1, aliasZh: '', aliasKo: '', city: '', province: 'ON',
    total, anchor: 'acme',
  }
}

/** 照 useSimilarCard(pager 桶 usePagedFold)装一台卡:服务端假表、首屏前 6 家,load 按跳过家数切一页 20 家 */
function makeCard(total: number) {
  const all = Array.from({ length: total }, (_, i) => emp(i, total))
  const top = all.slice(0, FIRST)
  const st = { rest: [] as SimilarEmployer[], open: false, loads: 0, busy: false }
  const hidden = Math.max(0, simTotalOf(top) - top.length)
  const append = makeAppendPage<SimilarEmployer>((f) => {
    st.rest = f(st.rest)
  })
  function load(): void {
    st.loads += 1
    const offset = top.length + st.rest.length
    append(all.slice(offset, offset + FOLD_STEP))
  }
  function setOpen(v: boolean): void {
    st.open = v
  }
  return {
    all, top, st, hidden,
    shown: () => pagedRowsOf({ top, rest: st.rest, open: st.open }),
    extra: () => pagedExtraOf({ open: st.open, loaded: st.rest.length }),
    more: () => makePagedMore({ open: st.open, loaded: st.rest.length, remain: hidden - st.rest.length, busy: st.busy, setOpen, load })(),
    fold: () => makePagedFold(setOpen)(),
  }
}

describe('相似雇主卡 服务器分页 + FoldLine', () => {
  it('性质:一路点「展开」,钮上写的家数 = 这一下真多露的家数;点到底露满总数、不重不漏、顺序同服务端', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 3500 }), (total) => {
      const c = makeCard(total)
      let clicks = 0
      while (foldViewOf({ hidden: c.hidden, extra: c.extra() }).more !== '') {
        const promised = foldViewOf({ hidden: c.hidden, extra: c.extra() }).n
        const before = c.shown().length
        c.more()
        clicks += 1
        expect(c.shown().length - before).toBe(promised)
      }
      expect(c.shown().map((e) => e.slug)).toEqual(c.all.map((e) => e.slug))
      expect(clicks).toBe(Math.ceil(c.hidden / FOLD_STEP))
      expect(c.st.loads).toBe(clicks)
    }), { numRuns: 200 })
  })

  it('性质:收起回到首屏那几家,再展开不重取;取数中点了不响应', () => {
    fc.assert(fc.property(fc.integer({ min: FIRST + 1, max: 2000 }), (total) => {
      const c = makeCard(total)
      c.more()
      const opened = c.shown()
      c.fold()
      expect(c.shown()).toEqual(c.top)
      expect(foldViewOf({ hidden: c.hidden, extra: c.extra() }).up).toBe(false)
      c.more()
      expect(c.shown()).toEqual(opened)
      expect(c.st.loads).toBe(1)
      c.st.busy = true
      c.more()
      expect(c.st.loads).toBe(1)
    }), { numRuns: 100 })
  })

  it('金标:总数 3432(Frank 截图那张卡)首钮「展开 20 家」,再展开 20 家,末页「展开其余 6 家」;6 家以内不出钮', () => {
    const unit = zh('fold.u.employer')
    const label = (hidden: number, extra: number) => foldMoreLabelOf({ t: zh, unit, view: foldViewOf({ hidden, extra }), busy: false })
    const c = makeCard(3432)
    expect(c.hidden).toBe(3426)
    expect(label(c.hidden, c.extra())).toBe('展开 20 家 ▾')
    c.more()
    expect(label(c.hidden, c.extra())).toBe('再展开 20 家 ▾')
    expect(label(3426, 3420)).toBe('展开其余 6 家 ▾')
    expect(makeCard(6).hidden).toBe(0)
    expect(label(makeCard(6).hidden, 0)).toBe('')
    // 探针:旧口径(折起来 = 已取 20 − 露 6)写成「展开其余 14 家」,与上面金标分得开
    expect(label(20 - FIRST, 0)).toBe('展开其余 14 家 ▾')
  })

  it('金标:已展开家数、上屏行、总数与锚', () => {
    expect(pagedExtraOf({ open: false, loaded: 40 })).toBe(0)
    expect(pagedExtraOf({ open: true, loaded: 40 })).toBe(40)
    const top = [emp(0, 9)]
    const rest = [emp(1, 9), emp(2, 9)]
    expect(pagedRowsOf({ top, rest, open: false })).toEqual(top)
    expect(pagedRowsOf({ top, rest, open: true })).toEqual(top.concat(rest))
    expect(simTotalOf(top)).toBe(9)
    expect(simTotalOf([])).toBe(0)
    expect(simAnchorOf(top)).toBe('acme')
    expect(simAnchorOf([])).toBe('')
  })

  it('金标:接口地址查询串编码(公司页 slug 与 `n:` 池键)', () => {
    expect(pageUrlOf({ url: simPageUrlOf('acme-inc'), offset: 26 })).toBe('/api/jobs/similar?key=acme-inc&offset=26')
    expect(pageUrlOf({ url: simPageUrlOf('n:a&w'), offset: 6 })).toBe('/api/jobs/similar?key=n%3Aa%26w&offset=6')
  })
})

describe('GET /api/jobs/similar 与首屏取数', () => {
  function req(qs: string): Request {
    return new Request('https://offer2pr.com/api/jobs/similar?' + qs)
  }

  it('参数校验:key 不是 slug 也不是池键、offset 缺位 / 负数 / 非数 / 超上限 一律 400,不进库', async () => {
    h.query.mockClear()
    for (const qs of ['offset=6', 'key=&offset=6', 'key=Bad Key&offset=6', 'key=acme', 'key=acme&offset=-1',
      'key=acme&offset=abc', 'key=acme&offset=20001']) {
      const r = await jobsSimilarRoute(req(qs))
      expect(r.status, qs).toBe(400)
    }
    expect(h.query).not.toHaveBeenCalled()
  })

  it('一页:绑定 [锚, 跳过家数, 20],SQL 带 OFFSET / LIMIT 参数;回 { rows } 带锚与总数', async () => {
    h.query.mockClear()
    h.query.mockResolvedValueOnce({ rows: [{ slug: 'b', name: 'B', total: 3432, anchor: 'n:acme', open_count: 3 }], rowCount: 1 })
    const r = await jobsSimilarRoute(req('key=n%3Aacme&offset=26'))
    expect(r.status).toBe(200)
    const body = await r.json() as { rows: SimilarEmployer[] }
    expect(body.rows.map((e) => [e.slug, e.total, e.anchor, e.openCount])).toEqual([['b', 3432, 'n:acme', 3]])
    const [sql, params] = h.query.mock.calls[0]!
    expect(params).toEqual(['n:acme', 26, 20])
    expect(sql).toMatch(/OFFSET \$2 LIMIT \$3/)
  })

  it('首屏:绑定 [锚, 0, 6];没有锚不进库', async () => {
    h.query.mockClear()
    const db: Db = { query: h.query }
    await loadSimilarEmployers({ db, key: 'acme' })
    expect(h.query.mock.calls[0]![1]).toEqual(['acme', 0, FIRST])
    h.query.mockClear()
    expect(await loadSimilarEmployers({ db, key: '' })).toEqual([])
    expect(h.query).not.toHaveBeenCalled()
  })
})
