// 搜索框多词(2026-08-16 Frank「文本框可以搜索多个条件 用空格隔开可以吗 科学吗」)。
// 改之前:整串 `%q%` 只能在同一列命中 —— 本地实测 q="line cook" 432 条、q="cook toronto" 0 条。
// 改之后:按空格拆词、词间 AND、每词自己跨列 OR。这里钉住 SQL 的**形状**(条件数/占位符/分支),
// 不连库:跑得起 SQL 的验证在 API 实测,这里保证语义不被后人改歪。
import { describe, it, expect } from 'vitest'

import { buildJobsWhere, splitQ } from '@/lib/jobs/server'

describe('搜索词拆分', () => {
  it('按空格拆,吃掉多余空白', () => {
    expect(splitQ('  cook   toronto ')).toEqual(['cook', 'toronto'])
  })
  it('封顶 4 词:再多截断而不是报错(搜索不是表单)', () => {
    expect(splitQ('a b c d e f')).toEqual(['a', 'b', 'c', 'd'])
  })
  it('空串 → 没有词', () => {
    expect(splitQ('   ')).toEqual([])
  })
  it('省全名不拆开:拆了哪个词都不是省,只能靠公司名瞎撞', () => {
    expect(splitQ('carpenter nova scotia')).toEqual(['carpenter', 'nova scotia'])
    expect(splitQ('newfoundland and labrador cook')).toEqual(['newfoundland and labrador', 'cook'])
  })
})

describe('buildJobsWhere:q 多词', () => {
  it('单词与旧写法等价:一组括号、一个占位符', () => {
    const w = buildJobsWhere({ startIndex: 1, filters: { q: 'cook' } })
    expect(w.params).toEqual(['%cook%'])
    expect(w.sql.match(/j\.title ILIKE \$\d/g)?.length).toBe(1)     // 一组 = 一个词
    expect(w.sql.match(/ILIKE \$1/g)?.length).toBeGreaterThan(1)    // 同一个 $1 复用到各列
  })

  it('两词:两组条件用 AND 串,各自一个占位符', () => {
    const w = buildJobsWhere({ startIndex: 1, filters: { q: 'cook toronto' } })
    expect(w.params).toEqual(['%cook%', '%toronto%'])
    expect(w.sql.match(/j\.title ILIKE \$\d/g)).toEqual(['j.title ILIKE $1', 'j.title ILIKE $2'])
    expect(w.sql).toContain(') AND (')                              // 词间 AND,不是 OR
  })

  it('短词(≤2 字)才带省码列:trgm 索引对 <3 字退化,长词走这列是死分支', () => {
    expect(buildJobsWhere({ startIndex: 1, filters: { q: 'ON' } }).sql).toContain('j.province ILIKE $1')
    expect(buildJobsWhere({ startIndex: 1, filters: { q: 'cook' } }).sql).not.toContain('j.province ILIKE')
    // 混着来:短词那一组带省码列,长词那一组不带
    const mix = buildJobsWhere({ startIndex: 1, filters: { q: 'ON cook' } })
    expect(mix.sql).toContain('j.province ILIKE $1')
    expect(mix.sql).not.toContain('j.province ILIKE $2')
  })

  it('省全名翻成省码:库里存 ON,不翻译则「carpenter ontario」永远 0 条', () => {
    const w = buildJobsWhere({ startIndex: 1, filters: { q: 'carpenter ontario' } })
    expect(w.params).toEqual(['%carpenter%', '%ontario%', 'ON'])
    expect(w.sql).toContain('j.province = $3')
    // 省名那一组仍带 ILIKE 分支:公司名「Ontario Steel」照样命中
    expect(w.sql).toContain('j.title ILIKE $2')
  })

  it('公司名预查按词各一组:第 i 组喂给第 i 个词', () => {
    const w = buildJobsWhere({ startIndex: 1, filters: { q: 'cook toronto', qCompanyIds: [[7, 8], []] } })
    expect(w.params).toEqual(['%cook%', [7, 8], '%toronto%'])
    expect(w.sql).toContain('j.company_id = ANY($2)')          // 第一词命中两家公司
    expect(w.sql.match(/company_id/g)?.length).toBe(1)          // 第二词零命中 → 不挂空分支
  })

  it('没预查时逐词回退到子查询(语义同,慢)', () => {
    const w = buildJobsWhere({ startIndex: 1, filters: { q: 'cook toronto' } })
    expect(w.sql.match(/SELECT id FROM companies/g)?.length).toBe(2)
  })
})
