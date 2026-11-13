/**
 * 求职记录导出(2026-11-08「我的」清单第 7 条)。2026-11-12 生成简历窗口(cv 桶)撤,「档案导入简历」那一组随它删。
 *
 * @author Frank
 * @time 2026-11-09 01:30:00
 */
import { describe, expect, it } from 'vitest'
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
