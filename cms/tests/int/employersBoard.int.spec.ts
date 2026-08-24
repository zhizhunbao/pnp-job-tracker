// 雇主板筛选/分页口径闸(lib/employers 的纯函数 + loadEmployerPage 的假 pool)。
// 立这道闸的两个理由:
//   ① 🔴 名录**没写职业**的行(RCIP/FCIP 绝大多数)选 NOC 时必须照常保留 —— 当成不匹配剔掉
//      = 拿我们的数据缺口冒充官方的排除,用户会错过大半个名录。
//   ② #313 红线:SSR/API 一次只吐一页,total 报全量 —— 回归成「整包 6,680 行」时这里当场红。
import { describe, expect, it } from 'vitest'

import type { Db } from '@/lib/db'
import {
  applyEmployerFilters, EMP_PAGE_SIZE, loadEmployerPage, normalizeEmployerFilters, resetEmployersCache,
} from '@/lib/employers/server'
// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import { employerFacets, nocMatches, pageSlice, programMatches } from '@/lib/employers/functions'
import { fmtFetched, nocList, toEmployerRow } from '@/lib/employers/functions'
import type { EmployerFilters, EmployerRow } from '@/lib/employers'

const F = (p: Partial<EmployerFilters> = {}): EmployerFilters =>
  ({ mode: 'designated', program: '', prov: '', city: '', noc: '', q: '', page: 0, ...p })

// 行长得像真名录:AIP 行常带 nocs、按省;RCIP/FCIP 行按社区、nocs 多为空
const D = (name: string, province: string, location: string, source: string, nocs = '') =>
  toEmployerRow({ name, province, location, source, nocs, url: '', fetched: '2026-08-10' })

const ROWS: EmployerRow[] = [
  D('Grand View Manor', 'NS', '', 'AIP', '33102, 31301'),
  D('Bell Farms Inc', 'NB', '', 'AIP', '85101'),
  D('Sudbury Steel', 'ON', 'Greater Sudbury', 'RCIP+FCIP'),
  D('Timmins Transit', 'ON', 'Timmins', 'RCIP'),
  D('Cap-Acadie Bakery', 'NB', 'Cap-Acadie', 'FCIP'),
  D('Moose Jaw Motors', 'SK', 'Moose Jaw', 'RCIP', '72410'),
]

describe('参数规范化', () => {
  const of = (o: Record<string, string>) =>
    normalizeEmployerFilters({ get: (k) => (o[k] == null ? null : o[k]), defMode: 'designated' })

  it('口径缺省跟路径段走,query 只认两个合法值', () => {
    expect(of({}).mode).toBe('designated')
    expect(of({ mode: 'hiring' }).mode).toBe('hiring')
    expect(of({ mode: 'nonsense' }).mode).toBe('designated')
    expect(normalizeEmployerFilters({ get: () => null, defMode: 'hiring' }).mode).toBe('hiring')
  })

  it('制度只认白名单,省只认两位码,职业只认 5 位', () => {
    expect(of({ program: 'aip' }).program).toBe('AIP')
    expect(of({ program: 'OINP' }).program).toBe('')
    expect(of({ prov: 'ns' }).prov).toBe('NS')
    expect(of({ prov: 'Ontario' }).prov).toBe('')
    expect(of({ noc: '72310' }).noc).toBe('72310')
    expect(of({ noc: '723' }).noc).toBe('')
    expect(of({ noc: "1' OR 1=1" }).noc).toBe('')
  })

  it('页码负数/非数字回 0,上限封死', () => {
    expect(of({ page: '-3' }).page).toBe(0)
    expect(of({ page: 'x' }).page).toBe(0)
    expect(of({ page: '7' }).page).toBe(7)
    expect(of({ page: '999999' }).page).toBe(9999)
  })
})

describe('名录职业串解析', () => {
  it('逗号/空格/顿号混排都吃,去重', () => {
    expect(nocList('33102, 31301')).toEqual(['33102', '31301'])
    expect(nocList('33102 33102  31301')).toEqual(['33102', '31301'])
  })

  it('非 5 位的碎片丢弃,不瞎猜', () => {
    expect(nocList('331, 3310299, abc')).toEqual([])
    expect(nocList('')).toEqual([])
  })
})

describe('🔴 职业口径:名录没写 ≠ 不匹配', () => {
  it('nocs 为空的行,选了任何职业都照常保留', () => {
    expect(nocMatches({ rowNocs: [], noc: '72310' })).toBe(true)
    expect(nocMatches({ rowNocs: [], noc: '' })).toBe(true)
  })

  it('nocs 写了的行按清单判', () => {
    expect(nocMatches({ rowNocs: ['33102'], noc: '33102' })).toBe(true)
    expect(nocMatches({ rowNocs: ['33102'], noc: '72310' })).toBe(false)
  })

  it('整表筛职业:RCIP/FCIP 的空职业行不许被筛掉,写了别的职业的行要被筛掉', () => {
    const hit = applyEmployerFilters({ rows: ROWS, filters: F({ noc: '33102' }) })
    const names = hit.map((r) => r.name)
    expect(names).toContain('Grand View Manor')      // 名录列了 33102
    expect(names).toContain('Sudbury Steel')          // 名录没写职业 → 保留
    expect(names).toContain('Cap-Acadie Bakery')      // 同上
    expect(names).not.toContain('Bell Farms Inc')     // 名录写了 85101,不含 33102
    expect(names).not.toContain('Moose Jaw Motors')   // 名录写了 72410
  })
})

describe('筛选', () => {
  it('制度用子串匹配:双标社区 RCIP+FCIP 对两个筛选都算数', () => {
    expect(programMatches({ rowProgram: 'RCIP+FCIP', program: 'RCIP' })).toBe(true)
    expect(programMatches({ rowProgram: 'RCIP+FCIP', program: 'FCIP' })).toBe(true)
    expect(programMatches({ rowProgram: 'RCIP', program: 'FCIP' })).toBe(false)
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ program: 'FCIP' }) }).map((r) => r.name))
      .toEqual(['Sudbury Steel', 'Cap-Acadie Bakery'])
  })

  it('省与社区各筛各的', () => {
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ prov: 'ON' }) }).map((r) => r.name)).toEqual(['Sudbury Steel', 'Timmins Transit'])
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ city: 'Timmins' }) }).map((r) => r.name)).toEqual(['Timmins Transit'])
  })

  it('关键词搜雇主名,大小写无关、可子串', () => {
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ q: 'manor' }) }).map((r) => r.name)).toEqual(['Grand View Manor'])
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ q: 'FARMS' }) }).map((r) => r.name)).toEqual(['Bell Farms Inc'])
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ q: '没有这家' }) })).toEqual([])
  })

  it('多维叠加取交集', () => {
    expect(applyEmployerFilters({ rows: ROWS, filters: F({ prov: 'ON', program: 'RCIP', city: 'Timmins' }) }).map((r) => r.name))
      .toEqual(['Timmins Transit'])
  })
})

describe('下拉选项', () => {
  it('省与制度看整份数据(切了省下拉不许自己清空)', () => {
    const fc = employerFacets({ rows: ROWS, filters: F({ prov: 'ON' }) })
    expect(fc.provs).toEqual(['NB', 'NS', 'ON', 'SK'])
    expect(fc.programs).toEqual(['AIP', 'RCIP', 'FCIP'])
  })

  it('社区与职业按已选省与制度收窄', () => {
    expect(employerFacets({ rows: ROWS, filters: F({ prov: 'ON' }) }).cities).toEqual(['Greater Sudbury', 'Timmins'])
    expect(employerFacets({ rows: ROWS, filters: F({ prov: 'NS' }) }).nocs).toEqual(['31301', '33102'])
    expect(employerFacets({ rows: ROWS, filters: F({ program: 'FCIP' }) }).cities).toEqual(['Cap-Acadie', 'Greater Sudbury'])
  })
})

describe('分页', () => {
  const many: EmployerRow[] = Array.from({ length: 120 }, (_, i) => D(`E${String(i).padStart(3, '0')}`, 'NS', '', 'AIP'))
  it('按页切片,越界页给空数组而不是报错', () => {
    expect(pageSlice({ rows: many, page: 0, size: 50 })).toHaveLength(50)
    expect(pageSlice({ rows: many, page: 2, size: 50 })).toEqual(many.slice(100))
    expect(pageSlice({ rows: many, page: 9, size: 50 })).toEqual([])
    expect(pageSlice({ rows: many, page: -1, size: 50 })).toEqual(many.slice(0, 50))
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

const BIG = Array.from({ length: 137 }, (_, i) => ({
  name: `Employer ${String(i).padStart(3, '0')}`, province: i % 2 ? 'NS' : 'NB',
  location: '', source: 'AIP', nocs: i % 3 === 0 ? '' : '33102', url: '', fetched: '2026-08-10',
}))

describe('loadEmployerPage', () => {
  it('🔴 一次只吐一页,total 报全量(#313:整包塞 payload 就是这里破的)', async () => {
    resetEmployersCache()
    const { pool } = fakePool((sql) => (sql.includes('designated_employers') ? { rows: BIG } : { rows: [] }))
    const p = await loadEmployerPage({ db: pool, filters: F(), pageSize: 50 })
    expect(p.rows).toHaveLength(50)
    expect(p.total).toBe(137)
    expect(p.pageSize).toBe(50)
    const last = await loadEmployerPage({ db: pool, filters: F({ page: 2 }), pageSize: 50 })
    expect(last.rows).toHaveLength(37)
    expect(last.rows[0].name).not.toBe(p.rows[0].name)
  })

  it('筛选改变命中行数,且空职业行不被筛掉', async () => {
    resetEmployersCache()
    const { pool } = fakePool((sql) => (sql.includes('designated_employers') ? { rows: BIG } : { rows: [] }))
    const all = await loadEmployerPage({ db: pool, filters: F(), pageSize: 50 })
    const ns = await loadEmployerPage({ db: pool, filters: F({ prov: 'NS' }), pageSize: 50 })
    expect(ns.total).toBeLessThan(all.total)
    expect(ns.rows.every((r) => r.province === 'NS')).toBe(true)
    // 137 行里 46 行 nocs 为空(i%3===0),91 行写了 33102 —— 选 33102 应当 137 全中
    const byNoc = await loadEmployerPage({ db: pool, filters: F({ noc: '33102' }), pageSize: 50 })
    expect(byNoc.total).toBe(137)
    const byOther = await loadEmployerPage({ db: pool, filters: F({ noc: '72310' }), pageSize: 50 })
    expect(byOther.total).toBe(46)
  })

  it('在招口径:省或职业缺一个就不查(站级聚合禁每请求现算)', async () => {
    resetEmployersCache()
    const { pool, seen } = fakePool(() => ({ rows: [] }))
    const p = await loadEmployerPage({ db: pool, filters: F({ mode: 'hiring', prov: 'SK' }), pageSize: 50 })
    expect(p.rows).toEqual([])
    expect(p.total).toBe(0)
    expect(seen.some((s) => s.sql.includes('FROM jobs'))).toBe(false)
  })

  it('在招口径:省+职业齐了才聚合,参数带出去不拼串', async () => {
    resetEmployersCache()
    const { pool, seen } = fakePool((sql) => (sql.includes('FROM jobs')
      ? { rows: [{ name: 'A Co', province: 'SK', location: 'Regina', n: 4 }, { name: 'B Co', province: 'SK', location: 'Saskatoon', n: 1 }] }
      : { rows: [] }))
    const p = await loadEmployerPage({ db: pool, filters: F({ mode: 'hiring', prov: 'SK', noc: '72310' }), pageSize: 50 })
    expect(p.mode).toBe('hiring')
    expect(p.total).toBe(2)
    expect(p.rows[0]).toMatchObject({ name: 'A Co', openJobs: 4, where: 'Regina' })
    expect(seen.find((s) => s.sql.includes('FROM jobs'))?.params).toEqual(['SK', '72310'])
    // 在招口径下社区筛选照常生效
    const one = await loadEmployerPage({ db: pool, filters: F({ mode: 'hiring', prov: 'SK', noc: '72310', city: 'Regina' }), pageSize: 50 })
    expect(one.total).toBe(1)
  })

  it('没有 db / 查询挂了都回空表,绝不抛', async () => {
    resetEmployersCache()
    expect((await loadEmployerPage({ db: null, filters: F(), pageSize: 50 })).total).toBe(0)
    resetEmployersCache()
    const boom = { query: () => Promise.reject(new Error('pool wedged')) } as unknown as Db
    const p = await loadEmployerPage({ db: boom, filters: F(), pageSize: 50 })
    expect(p.rows).toEqual([])
    expect(p.total).toBe(0)
  })

  it('默认页大小是 50', () => {
    expect(EMP_PAGE_SIZE).toBe(50)
  })

  it('抓取日归一在数据层做(生产库实测是 20260419 这种八位写法)', async () => {
    expect(fmtFetched('20260419')).toBe('2026-04-19')
    expect(fmtFetched('2026-04-19T00:00:00Z')).toBe('2026-04-19')
    expect(fmtFetched('')).toBe('')
    resetEmployersCache()
    const { pool } = fakePool((sql) => (sql.includes('designated_employers')
      ? { rows: [{ name: 'A', province: 'NS', location: '', source: 'AIP', nocs: '', url: '', fetched: '20260419' }] }
      : { rows: [] }))
    expect((await loadEmployerPage({ db: pool, filters: F(), pageSize: 50 })).fetched).toBe('2026-04-19')
  })
})
