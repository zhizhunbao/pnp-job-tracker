// 拖列的 Excel 式行为(2026-08-16 Frank「有时候右边的列移动,有时候左边的列移动,能不能统一都改成
// 右边的列整体移动,类似于 excel」)。拖拽本身在浏览器里,这里钉住它的**数学**:
//   · 被拖列左边的列一像素不动
//   · 差额只从右边出,自最右列起逐列让 → 中间列宽度不变(整体平移)
//   · 总宽恒定(「永不横滚」那条铁律靠它)
//   · 下限=表头不折行,让到底了继续找左边的让位列
import { describe, it, expect } from 'vitest'

import { resizeColWidths } from '@/app/(frontend)/jobs/colWidths'

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

describe('拖列:Excel 式(右边整体让位,左边不动)', () => {
  const base = [100, 200, 150, 120, 180]   // 总 750
  const floors = [60, 60, 60, 60, 60]

  it('拉宽第 2 列:左边两列一像素不动,总宽不变', () => {
    const out = resizeColWidths(base, 1, 260, floors)
    expect(out[0]).toBe(base[0])
    expect(out[1]).toBe(260)
    expect(sum(out)).toBe(sum(base))
  })

  it('差额只从**最右一列**出:中间列宽度不变 = 整体平移', () => {
    const out = resizeColWidths(base, 1, 260, floors)
    expect(out[2]).toBe(base[2])          // 中间列没被动
    expect(out[3]).toBe(base[3])
    expect(out[4]).toBe(base[4] - 60)     // 最右那列独自让出 60
  })

  it('最右列让到下限后,继续往左找让位列(全在被拖列右侧,自右向左依次让)', () => {
    // 拉第 1 列 +300:最右 180→60(让 120)、120→60(让 60)、150→60(让 90)、200→170(让 30)
    const out = resizeColWidths(base, 0, 400, floors)
    expect(out).toEqual([400, 170, 60, 60, 60])
    expect(sum(out)).toBe(sum(base))
  })

  it('缩窄:让位列整体右移(差额全给紧邻的让位列),左边仍不动', () => {
    const out = resizeColWidths(base, 1, 150, floors)
    expect(out[0]).toBe(base[0])
    expect(out[1]).toBe(150)
    expect(out[4]).toBe(base[4] + 50)
    expect(sum(out)).toBe(sum(base))
  })

  it('被拖列不许低于自己的下限', () => {
    const out = resizeColWidths(base, 2, 10, floors)
    expect(out[2]).toBe(60)
    expect(sum(out)).toBe(sum(base))
  })

  it('右侧全部让到下限后就停:不再往左抢,总宽仍不变', () => {
    const out = resizeColWidths(base, 3, 1000, floors)   // 右侧只有最后一列,可让 120
    expect(out[3]).toBe(120 + 120)
    expect(out[4]).toBe(60)
    expect(out[0]).toBe(base[0]); expect(out[1]).toBe(base[1]); expect(out[2]).toBe(base[2])
    expect(sum(out)).toBe(sum(base))
  })

  it('最后一列没有右邻居 → 向左要,且从紧邻的左列开始', () => {
    const out = resizeColWidths(base, 4, 240, floors)
    expect(out[4]).toBe(240)
    expect(out[3]).toBe(120 - 60)
    expect(out[0]).toBe(base[0]); expect(out[1]).toBe(base[1])
    expect(sum(out)).toBe(sum(base))
  })

  it('越界索引原样返回(防御:列集刚换时拖到不存在的列)', () => {
    expect(resizeColWidths(base, -1, 300, floors)).toEqual(base)
    expect(resizeColWidths(base, 9, 300, floors)).toEqual(base)
  })
})
