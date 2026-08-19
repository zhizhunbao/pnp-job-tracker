// 批D 欠账① · AIP 名录名字匹配的口径闸(lib/designationMatch,纯函数无 IO)。
// 金标全部来自 docs/evaluation/名录匹配审计-20260809.md 点名的真实病灶行 ——
// 名录名一字不改抄自 data/mart/designated_employers.json,不自造样本。
import { describe, expect, it } from 'vitest'

import {
  employerNameSegments, matchDesignation, normalizeEmployerName,
} from '@/lib/verdict/designationMatch'

type Row = { name: string; source?: string }
const R = (...names: string[]): Row[] => names.map((name) => ({ name, source: 'AIP' }))

describe('归一', () => {
  it('归一书写形式:大小写 / 标点 / & / 多空格', () => {
    expect(normalizeEmployerName('Grand View Manor')).toBe('grand view manor')
    expect(normalizeEmployerName('  A&L  Bell,  Farms.  ')).toBe('a and l bell farms')
    expect(normalizeEmployerName("Harvey's")).toBe('harvey s')
    expect(normalizeEmployerName('')).toBe('')
  })

  it('🔴 法人后缀一律保留:Foo Inc 与 Foo Ltd 是两家公司,不许归一到一起', () => {
    expect(normalizeEmployerName('Foo Inc')).not.toBe(normalizeEmployerName('Foo Ltd'))
    expect(normalizeEmployerName('Foo Inc')).not.toBe(normalizeEmployerName('Foo'))
  })
})

describe('名段拆分', () => {
  it('o/a 前后各成一段(官方名录 38% 是这个写法)', () => {
    expect(employerNameSegments('Grand View Manor Continuing Care Community o/a Grand View Manor'))
      .toEqual(['Grand View Manor Continuing Care Community', 'Grand View Manor'])
  })

  it('大小写与 dba 变体同款拆', () => {
    expect(employerNameSegments('1919599 Ontario Limited O/A Harveys 2568'))
      .toEqual(['1919599 Ontario Limited', 'Harveys 2568'])
    expect(employerNameSegments('HAPPY CLUB INC DBA HAPPY MOTEL')).toEqual(['HAPPY CLUB INC', 'HAPPY MOTEL'])
  })

  it('没有 o/a 就是整名一段', () => {
    expect(employerNameSegments('3D Property Management')).toEqual(['3D Property Management'])
  })
})

// ── 病灶 ①:词内子串假阳性(旧口径的真误配)────────────────────────────────
describe('审计病灶 · 词内子串假阳性', () => {
  it('Esso 不再匹进 Wheeler Accessories / Montessori(acc·esso·ries 含 esso)', () => {
    const rows = R('Wheeler Accessories', 'Fredericton Montessori Academy', 'Centre de ressources')
    expect(matchDesignation('Esso', rows)).toMatchObject({ row: null, count: 0 })
  })

  it('ARMS Ltd 不再匹进 Wohlgemuth Farms Ltd(f·arms ltd 含 arms ltd)', () => {
    expect(matchDesignation('ARMS Ltd', R('Wohlgemuth Farms Ltd'))).toMatchObject({ row: null, count: 0 })
  })

  it('SOi 不再匹进 Soil Sisters Foods,但 SOI Trade Inc 这种真同名照旧认', () => {
    expect(matchDesignation('SOi', R('Soil Sisters Foods'))).toMatchObject({ count: 0 })
    expect(matchDesignation('SOI Trade Inc', R('Soil Sisters Foods', 'SOI Trade Inc')).row?.name).toBe('SOI Trade Inc')
  })
})

// ── 病灶 ②:连锁多配 ───────────────────────────────────────────────────────
describe('审计病灶 · 连锁多配不点名', () => {
  const CHAIN = R(
    '12345 NB Inc o/a Tim Hortons',
    '67890 NB Ltd o/a Tim Hortons',
    'Burgeo Sands Inc o/a Tim Hortons',
  )

  it('加盟法人的 o/a 段本来就精确等于品牌名 → 三家全是合法完全匹配', () => {
    expect(matchDesignation('Tim Hortons', CHAIN).count).toBe(3)
  })

  it('🔴 多配 → row=null:一个法人名都不点(点名=替用户认了一家不可证的雇主)', () => {
    const m = matchDesignation('Tim Hortons', CHAIN)
    expect(m.row).toBeNull()
    expect(m.source).toBe('AIP')       // 是哪个名录仍说得清,只是不说是哪一家
  })

  it('唯一命中才点名', () => {
    const m = matchDesignation('Tim Hortons', R('Burgeo Sands Inc o/a Tim Hortons'))
    expect(m.count).toBe(1)
    expect(m.row?.name).toBe('Burgeo Sands Inc o/a Tim Hortons')
  })
})

// ── 病灶 ③:最短名胜出选错实体 ─────────────────────────────────────────────
describe('审计病灶 · 不再有「最短名胜出」这回事', () => {
  it('HOTEL HALIFAX 不再被更短的 Atlantica 抢配(完全匹配没有胜出序)', () => {
    const m = matchDesignation('HOTEL HALIFAX', R('Atlantica Hotel o/a Atlantica Hotel Halifax'))
    expect(m.count).toBe(0)            // 名段是 'Atlantica Hotel Halifax',不等于 'Hotel Halifax'
    expect(m.row).toBeNull()
  })
})

// ── 真命中不许误伤 ─────────────────────────────────────────────────────────
describe('真命中照旧认出', () => {
  it('判定卡基准 fixture:营业名段命中(字面完全相等会把这个真命中砍掉)', () => {
    const m = matchDesignation('Grand View Manor', R('Grand View Manor Continuing Care Community o/a Grand View Manor'))
    expect(m.count).toBe(1)
    expect(m.row?.name).toBe('Grand View Manor Continuing Care Community o/a Grand View Manor')
  })

  it('法定名段也算命中(岗位挂的是法定全称时)', () => {
    expect(matchDesignation('Grand View Manor Continuing Care Community',
      R('Grand View Manor Continuing Care Community o/a Grand View Manor')).count).toBe(1)
  })

  it('标点/大小写差异不影响', () => {
    expect(matchDesignation('grand view manor.', R('GRAND VIEW MANOR')).count).toBe(1)
  })
})

describe('边界', () => {
  it('空公司名一律不匹(别拿空串去撞整张表)', () => {
    expect(matchDesignation('', R('Anything'))).toMatchObject({ row: null, count: 0, source: '' })
    expect(matchDesignation('   ', R('Anything')).count).toBe(0)
  })

  it('空名录 → 没认出', () => {
    expect(matchDesignation('Grand View Manor', [])).toMatchObject({ row: null, count: 0 })
  })

  it('多配且 source 不一致 → source 留空,不替用户挑名录', () => {
    const mixed = [{ name: 'Foo', source: 'AIP' }, { name: 'Foo', source: 'NLPNP' }]
    expect(matchDesignation('Foo', mixed)).toMatchObject({ row: null, count: 2, source: '' })
  })
})
