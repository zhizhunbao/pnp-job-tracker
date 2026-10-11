// 职位板列宽压缩(2026-10-11 Frank「jobs 这个 横条去掉」:登录用户列偏好多到 15 列以上,各列最长词下限之和超外框,表格撑出横滚)。
// 性质:① 任意列集 × 任意外框宽:分出来的各列像素之和 = 外框宽(永不横滚;原先下限之和超宽时按下限之和撑);
//       ② 下限之和超宽、但文字列压到表头宽就够时:原子值列(wrap=false)保持最长词下限不动(只差舍入那几像素),
//          文字列不低于表头宽;③ 下限之和没超宽:各列不低于各自下限(原行为);
//       ④ 压得动的列金标:文字列(职位 / 公司 / AIP 等短语列)压得动,日期 / 城市 / 操作列压不动。
//       ⑤ 末路(文字列压到表头宽还不够):操作列照原宽不缩(按钮溢出格子会撑出横滚),其余等比缩,和仍 = 外框宽。
// 探针:allocateColWidths 去掉 squeezeTo 分支 → ①「和 = 外框宽」红;squeezeTo 连原子值列一起等比压 → ②红;
//       squeezableOf 不排除操作列 → ④红;末路不留操作列 → ⑤红。
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { allocateColWidths, keepWidthOf, squeezableOf } from '@/components/jobs/functions'
import type { Alloc } from '@/components/jobs/types'

const COL_FLOOR = 44

function floorOf(c: Alloc): number {
  return Math.max(COL_FLOOR, c.head, c.word)
}

function hardOf(c: Alloc): number {
  return c.wrap ? Math.max(COL_FLOOR, c.head) : floorOf(c)
}

const colArb = fc.record({
  head: fc.integer({ min: 20, max: 160 }),
  word: fc.integer({ min: 0, max: 260 }),
  extraP90: fc.integer({ min: 0, max: 200 }),
  extraMax: fc.integer({ min: 0, max: 300 }),
  wrap: fc.boolean(),
  keep: fc.boolean(),
})

const colsArb = fc.array(colArb, { minLength: 1, maxLength: 22 }).map((raw) => raw.map((r, i): Alloc => ({
  key: 'c' + String(i),
  head: r.head,
  word: r.word,
  p90: r.word + r.extraP90,
  max: r.word + r.extraP90 + r.extraMax,
  wrap: r.wrap,
  keep: r.keep && r.wrap === false && i === raw.length - 1,
})))

function sumOf(out: Record<string, number>, cols: Alloc[]): number {
  let s = 0
  for (const c of cols) {
    s = s + (out[c.key] ?? 0)
  }
  return s
}

describe('allocateColWidths 压缩(2026-10-11)', () => {
  it('① 任意列集 × 任意外框宽:各列之和 = 外框宽', () => {
    fc.assert(fc.property(colsArb, fc.integer({ min: 300, max: 2400 }), (cols, avail) => {
      expect(sumOf(allocateColWidths({ cols, avail }), cols)).toBe(avail)
    }))
  })

  it('② 下限之和超宽、文字列压到表头宽就够:原子值列照下限、文字列不低于表头宽', () => {
    fc.assert(fc.property(colsArb, fc.double({ min: 0, max: 1, noNaN: true }), (cols, f) => {
      let floors = 0
      let hards = 0
      for (const c of cols) {
        floors = floors + floorOf(c)
        hards = hards + hardOf(c)
      }
      fc.pre(floors > hards + 1)
      const avail = Math.floor(hards + (floors - 1 - hards) * f) + 1
      fc.pre(avail < floors && avail >= hards + cols.length)
      const out = allocateColWidths({ cols, avail })
      expect(sumOf(out, cols)).toBe(avail)
      for (const c of cols) {
        const w = out[c.key] ?? 0
        if (c.wrap) {
          expect(w).toBeGreaterThanOrEqual(hardOf(c) - cols.length)
        } else {
          expect(w).toBeGreaterThanOrEqual(floorOf(c) - cols.length)
        }
      }
    }))
  })

  it('② 金标:两列原子值(各下限 100)+ 一列文字(表头 60、最长词 300),外框 300 → 原子值列各 100、文字列 100', () => {
    const cols: Alloc[] = [
      { key: 'date', head: 60, word: 100, p90: 100, max: 100, wrap: false, keep: false },
      { key: 'city', head: 50, word: 100, p90: 100, max: 100, wrap: false, keep: false },
      { key: 'title', head: 60, word: 300, p90: 400, max: 600, wrap: true, keep: false },
    ]
    expect(allocateColWidths({ cols, avail: 300 })).toEqual({ date: 100, city: 100, title: 100 })
  })

  it('③ 下限之和没超宽:各列不低于下限(原行为)', () => {
    fc.assert(fc.property(colsArb, fc.integer({ min: 0, max: 800 }), (cols, spare) => {
      let floors = 0
      for (const c of cols) {
        floors = floors + floorOf(c)
      }
      const avail = floors + spare
      const out = allocateColWidths({ cols, avail })
      expect(sumOf(out, cols)).toBe(avail)
      for (const c of cols) {
        expect(out[c.key] ?? 0).toBeGreaterThanOrEqual(floorOf(c) - cols.length)
      }
    }))
  })

  it('⑤ 末路(表头都放不下):操作列照原宽,其余等比缩,和仍 = 外框宽', () => {
    const cols: Alloc[] = []
    for (let i = 0; i < 30; i = i + 1) {
      cols.push({ key: 'c' + String(i), head: 60, word: 80, p90: 90, max: 120, wrap: i % 2 === 0, keep: false })
    }
    cols.push({ key: 'actions', head: 40, word: 70, p90: 70, max: 70, wrap: false, keep: true })
    const out = allocateColWidths({ cols, avail: 1233 })
    expect(sumOf(out, cols)).toBe(1233)
    expect(out.actions).toBeGreaterThanOrEqual(70 - cols.length)
  })

  it('④ 压得动的列金标', () => {
    expect(squeezableOf('title')).toBe(true)
    expect(squeezableOf('company')).toBe(true)
    expect(squeezableOf('pilot')).toBe(true)
    expect(squeezableOf('datePosted')).toBe(false)
    expect(squeezableOf('validThrough')).toBe(false)
    expect(squeezableOf('city')).toBe(false)
    expect(squeezableOf('actions')).toBe(false)
    expect(keepWidthOf('actions')).toBe(true)
    expect(keepWidthOf('datePosted')).toBe(false)
  })
})
