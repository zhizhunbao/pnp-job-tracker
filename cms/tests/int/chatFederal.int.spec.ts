/**
 * 联邦规则/计分对话接线回归。
 *
 * 这里调用的是真 lookupPermit / lookupCrs / collectFacts / orchestrate；只有数据库返回行与 LLM 回答是 fixture。
 * fake pool 还会故意把另一套 grid 混进返回值,证明真实工具的 SQL 与返回层都守住 grid 边界。
 * 全组不读取 DATABASE_URI、不连接生产、不执行真实 SQL。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/llm', () => ({
  LlmError: class LlmError extends Error {},
  completeText: vi.fn(async (messages: { content: string }[]) =>
    messages[0]?.content?.includes('turn one message')
      ? '{"occ_en":"","noc":null,"provs":[],"exp_months":null,"status":null,"claims":[]}'
      : 'The PGWP official rules are in the facts.'),
}))

import { lookupCrs, lookupPermit } from '@/lib/chatTools'
import { collectFacts, crsLookups, federalRulePrograms, orchestrate, type Slots } from '@/lib/chatOrchestrate'

const URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/test.html'
const rule = (program: string, factor: string, value: number | null) => ({
  program, stream: '', factor, op: value == null ? 'rule' : '>=', value,
  value_text: value == null ? `${program} official non-numeric rule` : `${program} official numeric rule ${value}`,
  unit: value == null ? '' : 'points', basis: '', label: `${program} rule`, section: 'elig',
  url: URL, page_url: '', fetched: '2026-08-05', effective: '',
})
const point = (grid: 'CRS' | 'FSW67', points: number | null, pointsText: string, seq: number) => ({
  grid, section: grid === 'CRS' ? 'A' : 'FSW', section_label: 'Selection factors', kind: 'detail', table_no: 1,
  heading: 'Official points table', factor: 'Age', criterion: '35 years of age', column_label: 'Points',
  points, points_text: pointsText, seq, url: URL, fetched: '2026-08-05',
})

class FakePool {
  calls: { sql: string; params: unknown[] }[] = []
  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    if (sql.includes('FROM pnp_requirements WHERE province = \'FED\'')) {
      const program = String(params[0])
      return { rows: program === 'PGWP'
        ? [rule(program, 'pgwpMinProgram', 8), rule(program, 'pgwpCombine', null)]
        : [rule(program, 'workHours', program === 'FST' ? 3120 : 1560), rule(program, 'residence', null)] }
    }
    if (sql.includes('FROM ee_points_grid')) {
      const requested = String(params[0]) as 'CRS' | 'FSW67'
      const other = requested === 'CRS' ? 'FSW67' : 'CRS'
      // 真 DB 会按 WHERE grid=$1 过滤；fixture 故意违约,验证工具返回前还有第二道防混表护栏。
      return { rows: [point(requested, null, 'n/a', 1), point(requested, 0, '0', 2), point(other, 67, '67', 3)] }
    }
    throw new Error(`unexpected query: ${sql.slice(0, 80)}`)
  }
}

const emptySlots = (): Slots => ({ noc: null, occText: '', provs: [], expMonths: null, status: null, claims: [] })

describe('联邦查询工具（真实组件 + fake pool）', () => {
  let pool: FakePool
  beforeEach(() => { pool = new FakePool() })

  it('lookupCrs 的 SQL 第一筛选是 grid；返回层不混表，NULL 与真 0 各自保留且都挂 evidence', async () => {
    const r = await lookupCrs(pool, { grid: 'CRS', factor: 'Age' })
    expect(r.availability).toBe('ok')
    expect(r.rows).toHaveLength(2)
    expect(r.rows.every((x) => x.grid === 'CRS')).toBe(true)
    expect(r.rows.map((x) => x.points)).toEqual([null, 0])
    expect(r.rows[0].pointsText).toBe('n/a')
    expect(r.rows.every((x) => x.evidence.url === URL && x.evidence.fetched === '2026-08-05')).toBe(true)

    const q = pool.calls[0]
    expect(q.sql).toMatch(/FROM ee_points_grid\s+WHERE grid = \$1/)
    expect(q.sql.indexOf('WHERE grid = $1')).toBeLessThan(q.sql.indexOf('factor ILIKE'))
    expect(q.params[0]).toBe('CRS')
    expect(q.params[3]).toBe('Age')
  })

  it('lookupCrs 四态边界：未知 grid 不查库并返回 not-applicable；查询失败返回 not-collected', async () => {
    const bad = await lookupCrs(pool, { grid: 'PNP' })
    expect(bad.availability).toBe('not-applicable')
    expect(pool.calls).toHaveLength(0)
    const down = await lookupCrs({ query: async () => { throw new Error('down') } }, { grid: 'FSW67' })
    expect(down.availability).toBe('not-collected')
    expect(down.note).toMatch(/暂不可用/)
  })

  it('lookupPermit 同一真实查询路径可读取 CEC/FSW/FST，非数字规则不变成 0', async () => {
    for (const program of ['CEC', 'FSW', 'FST']) {
      const r = await lookupPermit(pool, { program })
      expect(r.availability).toBe('ok')
      expect(r.rules).toHaveLength(2)
      expect(r.rules[1].value).toBeNull()
      expect(r.rules.every((x) => x.evidence.url === URL)).toBe(true)
    }
    expect(pool.calls.map((x) => x.params[0])).toEqual(['CEC', 'FSW', 'FST'])
  })
})

describe('联邦对话接线（真实 collectFacts/orchestrate + fixture I/O）', () => {
  it('纯联邦问题没有 NOC 也直达六条查询，不触发任何 jobs/省级查询', async () => {
    const pool = new FakePool()
    const steps: string[] = []
    const r = await collectFacts(pool, emptySlots(), null, 'en', (s) => steps.push(s.text), {
      federalPrograms: ['PGWP', 'CEC', 'FSW', 'FST'],
      crs: [{ grid: 'CRS' }, { grid: 'FSW67' }],
    })
    expect(pool.calls).toHaveLength(6)
    expect(pool.calls.every((x) => /pnp_requirements|ee_points_grid/.test(x.sql))).toBe(true)
    expect(r.facts.some((x) => x.tool === 'lookupPermit' && x.label.includes('PGWP'))).toBe(true)
    expect(r.facts.some((x) => x.tool === 'lookupPermit' && x.label.includes('CEC'))).toBe(true)
    expect(r.facts.some((x) => x.tool === 'lookupCrs' && x.value === 0)).toBe(true)
    expect(r.facts.filter((x) => x.value != null).every((x) => !!x.evidence.url)).toBe(true)
    expect(steps).toEqual(expect.arrayContaining([
      'Federal rules checked: PGWP', 'Federal rules checked: CEC',
      'Federal points grid checked: CRS', 'Federal points grid checked: FSW67',
    ]))
  })

  it('非联邦问题不触发 lookupPermit/lookupCrs；FSW 资格与 FSW 67 分严格分流', async () => {
    expect(federalRulePrograms('carpenter jobs in Manitoba')).toEqual([])
    expect(crsLookups('carpenter jobs in Manitoba')).toEqual([])
    expect(federalRulePrograms('Do I qualify for FSW?')).toEqual(['FSW'])
    expect(crsLookups('Do I qualify for FSW?')).toEqual([])
    expect(crsLookups('Show me FSW67 scoring').map((x) => x.grid)).toEqual(['FSW67'])
    expect(crsLookups('How do the FSW 67 points work?').map((x) => x.grid)).toEqual(['FSW67'])
    expect(crsLookups('Compare CRS with the FSW 67 points').map((x) => x.grid)).toEqual(['CRS', 'FSW67'])

    const pool = new FakePool()
    const r = await collectFacts(pool, emptySlots())
    expect(r.facts).toEqual([])
    expect(pool.calls).toHaveLength(0)
  })

  it('真实 orchestrate：PGWP 直问的槽位没有职业时不再抛 noOcc，事实来自 lookupPermit 查询', async () => {
    const pool = new FakePool()
    const r = await orchestrate(pool, { text: 'What are the PGWP rules?', lang: 'en' })
    expect(r.slots.noc).toBeNull()
    expect(r.facts.some((x) => x.tool === 'lookupPermit')).toBe(true)
    expect(pool.calls).toHaveLength(1)
    expect(pool.calls[0].sql).toContain("province = 'FED'")
    expect(pool.calls[0].params).toEqual(['PGWP'])
  })
})
