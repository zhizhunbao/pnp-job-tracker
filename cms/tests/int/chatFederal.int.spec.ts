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
  completeText: vi.fn(async (messages: { content: string }[]) => {
    if (messages[0]?.content?.includes('turn one message')) {
      // 生产回归里故意模拟抽槽幻觉：联邦政策追问即使被塞成厨师，也不能启动职业工具。
      if (messages.at(-1)?.content?.includes('大家都是这么说的 两个一年 能换 3 年')) {
        return '{"occ_en":"cook","noc":"63200","provs":[],"exp_months":null,"status":null,"claims":[]}'
      }
      return '{"occ_en":"","noc":null,"provs":[],"exp_months":null,"status":null,"claims":[]}'
    }
    return 'The PGWP official rules are in the facts.'
  }),
}))

import { lookupCrs, lookupPermit } from '@/lib/chat/tools'
import { buildPgwpCombineAnswer, synthMessages } from '@/lib/chat/answer'
import { collectFacts } from '@/lib/chat/cards'
import { crsLookups, federalRulePrograms, federalRuleProgramsForTurn } from '@/lib/chat/federal'
import { orchestrate } from '@/lib/chat/orchestrate'
import type { ChatTurn, Fact, Slots } from '@/lib/chat/types'

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

  it('生产回归 fca7d1fe1ae8ed20：省略 PGWP 的质疑追问继承上一轮政策主题，不误抛 noOcc', async () => {
    const history: ChatTurn[] = [
      { role: 'user', content: '继续读还是直接找雇主?两个 1 年研文能换 3 年 PGWP 吗?' },
      { role: 'assistant', content: '多个课程长度可以合并，但本站只按官方原文作答。' },
    ]
    const text = '大家都是这么说的 两个一年 能换 3 年'

    expect(federalRuleProgramsForTurn(text, history)).toEqual(['PGWP'])

    const pool = new FakePool()
    const r = await orchestrate(pool, { text, lang: 'zh', history, context: emptySlots() })
    expect(r.slots.noc, '抽槽幻觉不能污染纯 PGWP 追问').toBeNull()
    expect(r.facts.some((x) => x.tool === 'lookupPermit' && x.label.includes('PGWP'))).toBe(true)
    expect(r.facts.every((x) => x.tool === 'lookupPermit')).toBe(true)
    expect(pool.calls).toHaveLength(1)
    expect(pool.calls[0].params).toEqual(['PGWP'])
  })

  it('用户明确改问省份时停止继承旧 PGWP 主题', () => {
    const history: ChatTurn[] = [
      { role: 'user', content: '两个一年制课程能拿 3 年 PGWP 吗?' },
      { role: 'assistant', content: '我按官方 PGWP 规则核对。' },
    ]
    expect(federalRuleProgramsForTurn('那曼省呢?', history)).toEqual([])
  })

  it('PGWP 合并题的组稿只保留决定结果的材料，并要求结论先行', () => {
    const f = (label: string, value: number | null, valueText: string, unit: string): Fact => ({
      tool: 'lookupPermit', label, value, valueText, unit,
      evidence: { url: URL, fetched: '2026-08-10' },
    })
    const messages = synthMessages([
      f('PGWP 工签长度分档', 36, 'If your program was 2 years or more', 'months'),
      f('PGWP 多个课程合并规则', null, 'You may be able to get a PGWP that combines the length of each program', ''),
      f('PGWP 课程最短长度', 8, 'was at least 8 months long', 'months'),
      f('PGWP 一生可申请次数', 1, 'You cannot get a PGWP if you already had one', 'lifetime'),
      f('PGWP 语言门槛', 5, 'minimum level CLB 5', 'CLB'),
    ], '两个 1 年课程能拿 3 年 PGWP 吗?', 'zh', {
      zeroExp: false, hasClaims: false, occ: '', federalPrograms: ['PGWP'],
    })
    expect(messages[0].content).toContain('sentence one must answer yes or no immediately')
    expect(messages[1].content).toContain('PGWP 多个课程合并规则')
    expect(messages[1].content).not.toContain('PGWP 语言门槛')
  })

  it('四条决定性事实齐全时直接生成 GPT 式稳定答案，不夹带 CLB 建档', () => {
    const facts: Fact[] = [
      { tool: 'lookupPermit', label: 'PGWP 工签长度分档', value: 36, valueText: 'If your program was 2 years or more', unit: 'months', evidence: { url: URL, fetched: '2026-08-10' } },
      { tool: 'lookupPermit', label: 'PGWP 多个课程合并规则', value: null, valueText: 'You may be able to get a PGWP that combines the length of each program', unit: '', evidence: { url: URL, fetched: '2026-08-10' } },
      { tool: 'lookupPermit', label: 'PGWP 课程最短长度', value: 8, valueText: 'was at least 8 months long', unit: 'months', evidence: { url: URL, fetched: '2026-08-10' } },
      { tool: 'lookupPermit', label: 'PGWP 一生可申请次数', value: 1, valueText: "You can't get a PGWP if you already had one after completing an earlier program of study", unit: 'lifetime', evidence: { url: URL, fetched: '2026-08-10' } },
    ]
    const answer = buildPgwpCombineAnswer(facts, 'zh', '两个 1 年课程可以申请 3 年 PGWP 吧')
    expect(answer).toMatch(/^对，/)
    expect(answer).toContain('1 年 + 1 年 → 合并约 2 年 → 一次申请 → 最长 3 年')
    expect(answer).toContain('每个项目至少 8 个月')
    expect(answer).not.toMatch(/CLB|省提名|岗位/)
  })
})
