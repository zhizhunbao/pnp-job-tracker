// 序列表(components/table 的 series 能力,2026-09-06 把脉页省份段契约 §4)的纯函数层。
// 这一层只有算数:指数换算与列过滤 —— 两件都是「算错了页面照样渲出来,没人会发现」的东西,
// 所以钉在这里,而不是靠看图:
//   · 指数 = 值 / 该行**首个有值点** × 100:缺点跳过但**不占位**(x 轴位置仍按原来的第几期算),
//     有值点不足两个的行整行不出线(一个点连不成线),首个有值点是 0 的行也不出线(除以 0);
//   · 表态列过滤:非时间点列恒显(指标名那一列不能被时间窗切掉),时间点列按窗取末 N 个。
import { describe, expect, it } from 'vitest'

import { seriesLinesOf, shownColsOf } from '@/components/table/functions'
import type { Col } from '@/components/table/types'

type Row = { name: string; vals: Record<string, number | null> }

const YEARS = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7']
const WORDS = { table: '表', chart: '趋势', recent: '近 5 期', all: '全部', indexNote: '指数' }

function valueOf(r: Row, key: string): number | null {
  const v = r.vals[key]
  if (v == null) {
    return null
  }
  return v
}

function labelOf(r: Row): string {
  return r.name
}

function rowOf(name: string, vals: Record<string, number | null>): Row {
  return { name, vals }
}

function colsOf(): Col<Row>[] {
  const cols: Col<Row>[] = [{ key: 'name', label: '指标' }]
  for (const y of YEARS) {
    cols.push({ key: y, label: y })
  }
  return cols
}

function keysOf(cols: Col<Row>[]): string[] {
  return cols.map(function keyOf(c) { return c.key })
}

describe('seriesLinesOf:指数换算', () => {
  it('首个有值点记作 100,其余按比例', () => {
    const rows = [rowOf('人口', { y1: 200, y2: 300, y3: 100 })]
    const lines = seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })
    expect(lines).toHaveLength(1)
    expect(lines[0]?.label).toBe('人口')
    expect(lines[0]?.points.map((p) => p.index)).toEqual([100, 150, 50])
  })

  it('首个有值点不是第一期时,它才是基准(前面的空期不参与)', () => {
    const rows = [rowOf('学签', { y3: 50, y4: 75 })]
    const lines = seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })
    expect(lines[0]?.points.map((p) => p.index)).toEqual([100, 150])
  })

  it('缺的点跳过,但 x 位置仍按原来的第几期算(不左移)', () => {
    const rows = [rowOf('EE', { y1: 10, y3: 20, y6: 30 })]
    const lines = seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })
    expect(lines[0]?.points.map((p) => p.at)).toEqual([0, 2, 5])
    expect(lines[0]?.points.map((p) => p.key)).toEqual(['y1', 'y3', 'y6'])
    expect(lines[0]?.points.map((p) => p.value)).toEqual([10, 20, 30])
  })

  it('有值点不足两个的行不出线(一个点连不成线,零个点更不行)', () => {
    const rows = [rowOf('只有一点', { y2: 5 }), rowOf('一点没有', { y1: null, y2: null })]
    expect(seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })).toEqual([])
  })

  it('首个有值点是 0 的行不出线(除以 0 得不出趋势,只会得出一排 Infinity)', () => {
    const rows = [rowOf('从零起', { y1: 0, y2: 100 })]
    expect(seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })).toEqual([])
  })

  it('多行:出线的行按原顺序,跳过的行不占位', () => {
    const rows = [
      rowOf('甲', { y1: 100, y2: 110 }),
      rowOf('乙', { y1: 1 }),
      rowOf('丙', { y2: 8, y3: 4 }),
    ]
    const lines = seriesLinesOf({ pointKeys: YEARS, rows, valueOf, labelOf })
    expect(lines.map((l) => l.label)).toEqual(['甲', '丙'])
    expect(lines[1]?.points.map((p) => p.index)).toEqual([100, 50])
  })
})

describe('shownColsOf:表态的列过滤', () => {
  const cols = colsOf()

  it('近 N 期:时间点列只留末 5 个,非时间点列原样留下', () => {
    const out = shownColsOf({
      cols,
      series: { pointKeys: YEARS, valueOf, labelOf, recent: 5, words: WORDS },
      range: 'recent',
    })
    expect(keysOf(out)).toEqual(['name', 'y3', 'y4', 'y5', 'y6', 'y7'])
  })

  it('全部:一列不切', () => {
    const out = shownColsOf({
      cols,
      series: { pointKeys: YEARS, valueOf, labelOf, recent: 5, words: WORDS },
      range: 'all',
    })
    expect(keysOf(out)).toEqual(['name', ...YEARS])
  })

  it('N 比时间点数还大:全给,不报错也不补空列', () => {
    const out = shownColsOf({
      cols,
      series: { pointKeys: YEARS, valueOf, labelOf, recent: 20, words: WORDS },
      range: 'recent',
    })
    expect(keysOf(out)).toEqual(['name', ...YEARS])
  })

  it('不是序列表(没传 series):连数组身份都不换 —— 换了 useRows 会当成数据变了回第一页', () => {
    expect(shownColsOf({ cols, range: 'recent' })).toBe(cols)
  })
})
