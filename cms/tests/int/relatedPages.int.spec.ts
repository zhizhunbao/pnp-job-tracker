// 相关职位两组改服务器按页取(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」):
// 原同公司组只在首屏取到的 12 条里展开、同省同职业组一页 24 条按自造钮续取(useRelatedPages);
// 改成首屏只取露出来的几条(同公司 3、同省同职业 6),组底 FoldLine「展开 20 个」由 pager 桶 usePagedFold
// 按页从 /api/jobs/related/page 取 20 条往后接,直到组总数。
// 性质:① 接口 id / group / offset 不合法一律 400、不进库;② 两组首屏与续取的绑定参数(条数、跳过几条)各就各位;
//       ③ 同公司组本岗没公司名、同职业组本岗没职业码不进库。
// 金标(手写):续取地址查询串;首屏 [公司, 岗号, 3, 0] / 同职业 […, 6, 0];续取一页 20 条。
// 探针:把续取条数改回 24 时「一页 20」那条红 —— 与钮上「展开 20 个」对得上才算数。
import { describe, expect, it, vi } from 'vitest'
import { relPageUrlOf } from '@/components/jobs/functions'
import { pageUrlOf } from '@/components/pager/functions'
import { jobsRelatedPageRoute, loadRelatedJobs } from '@/lib/jobs/server'
import { loadRelatedPage } from '@/lib/jobs/functions'
import type { Db, QueryResult, SqlParam } from '@/lib/db'

const h = vi.hoisted(() => {
  const query = vi.fn(async (_sql: string, _params?: SqlParam[]): Promise<QueryResult> => ({ rows: [], rowCount: 0 }))
  return { query }
})

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))

const job = { id: 42, company: 'Acme', province: 'ON', city: 'Ottawa', noc: '21232', fine: '', mid: '', broad: '' }

describe('相关职位按页取', () => {
  it('金标:续取地址查询串(跳过几条由 usePagedFold 续上)', () => {
    expect(relPageUrlOf({ jobId: 42, group: 'co' })).toBe('/api/jobs/related/page?id=42&group=co')
    expect(pageUrlOf({ url: relPageUrlOf({ jobId: 42, group: 'occ' }), offset: 6 }))
      .toBe('/api/jobs/related/page?id=42&group=occ&offset=6')
  })

  it('接口参数校验:id / group / offset 缺位或非法一律 400,不进库', async () => {
    h.query.mockClear()
    for (const qs of ['group=co&offset=3', 'id=0&group=co&offset=3', 'id=42&offset=3', 'id=42&group=x&offset=3',
      'id=42&group=co&offset=-1', 'id=42&group=co&offset=abc', 'id=42&group=co&offset=5001']) {
      const r = await jobsRelatedPageRoute(new Request('https://offer2pr.com/api/jobs/related/page?' + qs))
      expect(r.status, qs).toBe(400)
    }
    expect(h.query).not.toHaveBeenCalled()
  })

  // 2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」):两组首屏都取 20
  // 2026-10-02 Frank「默认显示 20 是不是太多了」→「改成 10」:首屏 20 改 10,续取一页仍 20
  it('首屏:同公司组绑 [公司, 岗号, 10, 0],同职业组绑 [省, 职业, 岗号, 公司, 城, 10, 0]', async () => {
    h.query.mockClear()
    const db: Db = { query: h.query }
    await loadRelatedJobs({ db, job })
    expect(h.query.mock.calls[0]![1]).toEqual(['Acme', 42, 10, 0])
    expect(h.query.mock.calls[0]![0]).toMatch(/LIMIT \$3 OFFSET \$4/)
    expect(h.query.mock.calls[1]![1]).toEqual(['ON', '21232', 42, 'Acme', 'Ottawa', 10, 0])
  })

  it('续取:一页 20 条、从第 offset 条往后;本岗缺公司名 / 职业码不进库', async () => {
    h.query.mockClear()
    const db: Db = { query: h.query }
    await loadRelatedPage({ db, job, group: 'co', offset: 3 })
    expect(h.query.mock.calls[0]![1]).toEqual(['Acme', 42, 20, 3])
    await loadRelatedPage({ db, job, group: 'occ', offset: 26 })
    expect(h.query.mock.calls[1]![1]).toEqual(['ON', '21232', 42, 'Acme', 'Ottawa', 20, 26])
    h.query.mockClear()
    expect(await loadRelatedPage({ db, job: { ...job, company: '' }, group: 'co', offset: 3 })).toEqual([])
    expect(await loadRelatedPage({ db, job: { ...job, noc: '' }, group: 'occ', offset: 6 })).toEqual([])
    expect(h.query).not.toHaveBeenCalled()
  })
})
