// 雇主板筛选/分页口径闸(lib/employers 的纯函数 + loadEmployerPage 的假 pool)。
// 2026-09-13 雇主板批二重写(板改读雇主池):
//   ① 参数收窄:行业组 / 排序键只认白名单,不合法一律「不筛」不是「筛出空」;
//   ② 三个态:搜索词非空 = 查证态全库搜(不带组/省条件);选了组 = 榜态(组 × 省 × 开关 × 制度);都没 = 首屏不查行;
//   ③ #313 红线:一次只吐一页,total 报窗口总数 —— 回归成「整包」时这里当场红;
//   ④ 排序主键只经白名单映射成 SQL 片段,用户输入永不拼进 ORDER BY。
import { describe, expect, it } from 'vitest'

import type { Db } from '@/lib/db'
import { loadEmployerPage, normalizePoolFilters, resetEmployersCache } from '@/lib/employers/server'
// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import { isPoolSort, isScopedOf, isSearchOf, toPoolRow } from '@/lib/employers/functions'
import type { PoolFilters } from '@/lib/employers'

const F = (p: Partial<PoolFilters> = {}): PoolFilters =>
  ({ group: '', prov: '', program: '', noc: '', entry: false, q: '', sort: 'star', page: 0, ...p })

describe('参数规范化', () => {
  const of = (o: Record<string, string>) =>
    normalizePoolFilters({ get: (k) => (o[k] == null ? null : o[k]) })

  it('行业组只认八个键,大小写归一', () => {
    expect(of({ group: 'stem' }).group).toBe('stem')
    expect(of({ group: 'STEM' }).group).toBe('stem')
    expect(of({ group: 'IT' }).group).toBe('')
    expect(of({}).group).toBe('')
  })

  it('排序键只认白名单,缺省星级', () => {
    expect(of({}).sort).toBe('star')
    expect(of({ sort: 'open' }).sort).toBe('open')
    expect(of({ sort: 'designated' }).sort).toBe('designated')
    expect(of({ sort: 'DROP TABLE' }).sort).toBe('star')
    expect(isPoolSort('lmia')).toBe(true)
    expect(isPoolSort('skilled')).toBe(false)
  })

  it('制度只认白名单,省只认两位码,职业只认 5 位', () => {
    expect(of({ program: 'aip' }).program).toBe('AIP')
    expect(of({ program: 'OINP' }).program).toBe('')
    expect(of({ prov: 'ns' }).prov).toBe('NS')
    expect(of({ prov: 'Ontario' }).prov).toBe('')
    expect(of({ noc: '72310' }).noc).toBe('72310')
    expect(of({ noc: "1' OR 1=1" }).noc).toBe('')
  })

  it('开关只认 1;搜索词去掉 SQL 通配符;页码负数/非数字回 0,上限封死', () => {
    expect(of({ entry: '1' }).entry).toBe(true)
    expect(of({ entry: 'true' }).entry).toBe(false)
    expect(of({ q: '%tim_ hortons%' }).q).toBe('tim hortons')
    expect(of({ page: '-3' }).page).toBe(0)
    expect(of({ page: 'x' }).page).toBe(0)
    expect(of({ page: '7' }).page).toBe(7)
    expect(of({ page: '999999' }).page).toBe(9999)
  })
})

describe('三个态', () => {
  it('搜索词非空 = 查证态;选了组 = 榜态;都没 = 首屏', () => {
    expect(isSearchOf(F({ q: 'tim' }))).toBe(true)
    expect(isSearchOf(F())).toBe(false)
    expect(isScopedOf(F({ group: 'stem' }))).toBe(true)
    expect(isScopedOf(F())).toBe(false)
  })
})

describe('行构造器', () => {
  it('numeric 列的字符串收成数,可空数值保 null,jsonb 清单成数组', () => {
    const r = toPoolRow({
      key: 'shopify', slug: 'shopify', name: 'Shopify', industry: 'IT', province: 'ON', city: 'Ottawa',
      designated: false, designated_programs: [], open_jobs_total: '40', fetched: '2026-09-13',
      ind_group: 'stem', open_jobs: '35', latest_posted: '2026-09-12', top_titles: ['developer'], entry_jobs: '7',
      entry_share: '20', min_experience: 'junior', lmia_skilled: '3', lmia_last_quarter: '2026Q1', star: '4',
      wage_med_annual: null, wage_index_pct: null, total: '120',
    })
    expect(r.openJobs).toBe(35)
    expect(r.entryShare).toBe(20)
    expect(r.star).toBe(4)
    expect(r.wageMedAnnual).toBeNull()
    expect(r.wageIndexPct).toBeNull()
    expect(r.topTitles).toEqual(['developer'])
    expect(r.designated).toBe(false)
    expect(r.slug).toBe('shopify')
  })

  it('三源独有雇主:slug / 行业 / 季度 为 null 不折空串以外的东西', () => {
    const r = toPoolRow({
      key: 'n:acme', slug: null, name: 'Acme', industry: null, province: 'NB', city: '', designated: true,
      designated_programs: ['AIP', 'RCIP'], open_jobs_total: 0, fetched: '2026-09-13', ind_group: '', open_jobs: 0,
      latest_posted: null, top_titles: null, entry_jobs: 0, entry_share: null, min_experience: null, lmia_skilled: 0,
      lmia_last_quarter: null, star: 3, wage_med_annual: null, wage_index_pct: null, total: 1,
    })
    expect(r.slug).toBeNull()
    expect(r.industry).toBeNull()
    expect(r.programs).toEqual(['AIP', 'RCIP'])
    expect(r.designated).toBe(true)
    expect(r.entryShare).toBeNull()
  })
})

// ── loadEmployerPage(假 pool,不连库)───────────────────────────────────────
type QRows = { rows: Record<string, unknown>[] }
function fakePool(handler: (sql: string, params?: unknown[]) => QRows) {
  const seen: { sql: string; params?: unknown[] }[] = []
  return {
    seen,
    // rowCount 在出口统一补 null:QueryResult 摘掉 `?` 后假池也逐格交代(2026-08-21)
    pool: { query: (sql: string, params?: unknown[]) => { seen.push({ sql, params }); return Promise.resolve({ rows: handler(sql, params).rows, rowCount: null }) } } as unknown as Db,
  }
}

const bucketRow = (i: number, total: number) => ({
  key: `e${i}`, slug: null, name: `Employer ${String(i).padStart(3, '0')}`, industry: null, province: i % 2 ? 'NS' : 'NB',
  city: '', designated: i % 3 === 0, designated_programs: [], open_jobs_total: i, fetched: '2026-09-13', ind_group: 'stem',
  open_jobs: i, latest_posted: null, top_titles: [], entry_jobs: 0, entry_share: null, min_experience: null, lmia_skilled: 0,
  lmia_last_quarter: null, star: 2, wage_med_annual: null, wage_index_pct: null, total,
})

describe('loadEmployerPage', () => {
  it('首屏(没组没词)不查行,只回省下拉;total 0', async () => {
    resetEmployersCache()
    const { pool, seen } = fakePool((sql) => (sql.includes('FROM employer_pool ') && sql.includes('GROUP BY province') ? { rows: [{ province: 'NS' }, { province: 'ON' }] } : { rows: [] }))
    const p = await loadEmployerPage({ db: pool, filters: F(), pageSize: 50 })
    expect(p.rows).toEqual([])
    expect(p.total).toBe(0)
    expect(p.provs).toEqual(['NS', 'ON'])
    expect(seen.some((s) => s.sql.includes('employer_pool_buckets'))).toBe(false)
  })

  it('🔴 榜态一次只吐一页,total 报窗口总数;参数带出去不拼串,排序片段来自白名单', async () => {
    resetEmployersCache()
    const { pool, seen } = fakePool((sql, params) => {
      if (sql.includes('employer_pool_buckets b JOIN employer_pool p')) {
        const size = Number(params?.[4])
        return { rows: Array.from({ length: size }, (_, i) => bucketRow(i, 137)) }
      }
      return { rows: [] }
    })
    const p = await loadEmployerPage({ db: pool, filters: F({ group: 'stem', prov: 'NS', entry: true, sort: 'open' }), pageSize: 50 })
    expect(p.rows).toHaveLength(50)
    expect(p.total).toBe(137)
    expect(p.pageSize).toBe(50)
    const q = seen.find((s) => s.sql.includes('employer_pool_buckets b JOIN employer_pool p'))
    expect(q?.params).toEqual(['stem', 'NS', true, '', 50, 0])
    expect(q?.sql).toContain('ORDER BY b.open_jobs DESC')
    expect(q?.sql).not.toContain('DROP')
    const last = await loadEmployerPage({ db: pool, filters: F({ group: 'stem', page: 2 }), pageSize: 50 })
    const q2 = seen.filter((s) => s.sql.includes('employer_pool_buckets b JOIN employer_pool p')).at(-1)
    expect(q2?.params).toEqual(['stem', '', false, '', 50, 100])
    expect(last.page).toBe(2)
  })

  it('查证态:按名全库搜,不带组/省条件;词不拼进 SQL', async () => {
    resetEmployersCache()
    const { pool, seen } = fakePool((sql) => (sql.includes('ILIKE') ? { rows: [bucketRow(1, 1)] } : { rows: [] }))
    const p = await loadEmployerPage({ db: pool, filters: F({ group: 'stem', prov: 'NS', q: 'tim hortons' }), pageSize: 50 })
    expect(p.rows).toHaveLength(1)
    expect(p.total).toBe(1)
    const q = seen.find((s) => s.sql.includes('ILIKE'))
    expect(q?.params).toEqual(['tim hortons', 50, 0])
    expect(q?.sql).not.toContain('tim hortons')
    expect(seen.some((s) => s.sql.includes('employer_pool_buckets b JOIN employer_pool p'))).toBe(false)
  })

  it('池没拿到 / 查挂了都回空表,绝不抛', async () => {
    resetEmployersCache()
    const p0 = await loadEmployerPage({ db: null, filters: F({ group: 'stem' }), pageSize: 50 })
    expect(p0.total).toBe(0)
    const boom = { query: () => Promise.reject(new Error('down')) } as unknown as Db
    const p1 = await loadEmployerPage({ db: boom, filters: F({ group: 'stem' }), pageSize: 50 })
    expect(p1.rows).toEqual([])
    expect(p1.total).toBe(0)
  })
})
