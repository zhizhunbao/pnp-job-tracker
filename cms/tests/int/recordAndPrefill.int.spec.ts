/**
 * 求职记录导出与档案导入简历(2026-11-08「我的」清单第 7、8 条)。
 *
 * @author Frank
 * @time 2026-11-09 01:30:00
 */
import { describe, expect, it } from 'vitest'
import { contactFilledOf, entriesWithNamesOf } from '@/components/cv/prefill/functions'
import { csvCellOf, hasSentOf, recordCsvOf } from '@/components/me/jobs/record/functions'

const HEAD = { date: 'D', title: 'T', company: 'C', status: 'S' }

describe('求职记录 CSV', () => {
  it('金标:带 BOM、表头在前、每格加引号、引号转义', () => {
    const csv = recordCsvOf({ head: HEAD, rows: [{ date: '2026-11-08', title: 'Cook "A"', company: 'Bassi, Ltd.', status: 'Sent' }] })
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
    expect(csv.slice(1)).toBe('"D","T","C","S"\r\n"2026-11-08","Cook ""A""","Bassi, Ltd.","Sent"\r\n')
  })

  it('性质:表格软件会执行的开头一律变文字(职位名公司名来自抓取)', () => {
    for (const bad of ['=HYPERLINK("x")', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
      expect(csvCellOf(bad).startsWith('"\'')).toBe(true)
    }
    expect(csvCellOf('Cook')).toBe('"Cook"')
  })

  it('金标:只有草稿不出导出钮', () => {
    expect(hasSentOf({ items: [], draft: 'draft' })).toBe(false)
    expect(hasSentOf({ items: [{ stage: 'draft' }], draft: 'draft' })).toBe(false)
    expect(hasSentOf({ items: [{ stage: 'draft' }, { stage: 'sent' }], draft: 'draft' })).toBe(true)
  })
})

describe('档案导入简历', () => {
  const blank = () => ({ title: '', org: '' })

  it('金标:新名字追加,已有的(不分大小写)不重复,已填的条目不动', () => {
    const have = [{ title: 'Cooks', org: 'Bassi' }]
    const r = entriesWithNamesOf({ names: ['cooks', 'Bakers', 'Bakers'], have, blank })
    expect(r.added).toBe(1)
    expect(r.list).toEqual([{ title: 'Cooks', org: 'Bassi' }, { title: 'Bakers', org: '' }])
  })

  it('性质:再导入一次不会多出条目(幂等)', () => {
    const once = entriesWithNamesOf({ names: ['A', 'B'], have: [], blank })
    const twice = entriesWithNamesOf({ names: ['A', 'B'], have: once.list, blank })
    expect(twice.added).toBe(0)
    expect(twice.list).toHaveLength(2)
  })

  it('金标:联系方式只补空格,不盖用户填的', () => {
    const out = contactFilledOf({
      have: { name: 'Mine', city: '', region: '' },
      from: { name: 'Profile', city: 'Ottawa', region: 'ON' },
    })
    expect(out).toEqual({ name: 'Mine', city: 'Ottawa', region: 'ON' })
  })
})
