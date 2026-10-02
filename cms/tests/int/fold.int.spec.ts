// 清单展开 / 收起全站一套(components/pager 的 FoldLine;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」
// 「展开 20, 再展开 20, 再开其余, 收起」)。
// 性质:① 任意(折起来几个, 已展开几个):剩 > 20 收着写「展开 20」、展开着写「再展开 20」,剩 ≤ 20 写「展开其余 剩几个」,
//       剩 0 不出「展开」;「收起」只在展开着出;② 浏览器端清单一路点「展开」:每次加 20、封顶,点数 = ⌈折起来几个 / 20⌉。
// 金标(手写,三语):1570 家 → 展开 20 家 ▾ / 再展开 20 家 ▾ / 展开其余 10 家 ▾ / 收起 ▴;取数中写加载中。
// 探针:一步改成 21 时金标里「展开 20」对不上 —— 金标分得开步长。
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { FOLD_STEP } from '@/components/pager/constants'
import { foldMoreLabelOf, foldUpLabelOf, foldViewOf } from '@/components/pager/functions'
import { makeT } from '@/lib/i18n'

const zh = makeT('zh')
const en = makeT('en')
const ko = makeT('ko')

describe('FoldLine 展开 / 收起', () => {
  it('性质:剩 > 一步写「展开 / 再展开」20,剩 ≤ 一步写「展开其余」剩几个,剩 0 不出;收起只在展开着出', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 5000 }), fc.integer({ min: 0, max: 5000 }), (hidden, rawExtra) => {
      const extra = Math.min(hidden, rawExtra)
      const v = foldViewOf({ hidden, extra })
      const remain = hidden - extra
      expect(v.up).toBe(extra > 0)
      if (remain === 0) {
        expect(v.more).toBe('')
      } else if (remain <= FOLD_STEP) {
        expect([v.more, v.n]).toEqual(['rest', remain])
      } else {
        expect([v.more, v.n]).toEqual([extra === 0 ? 'first' : 'next', FOLD_STEP])
      }
    }), { numRuns: 500 })
  })

  it('金标:1570 家一路展开到底(三语),取数中写加载中', () => {
    const label = (t: typeof zh, unit: string, hidden: number, extra: number, busy = false) =>
      foldMoreLabelOf({ t, unit, view: foldViewOf({ hidden, extra }), busy })
    expect(label(zh, '家', 1570, 0)).toBe('展开 20 家 ▾')
    expect(label(zh, '家', 1570, 20)).toBe('再展开 20 家 ▾')
    expect(label(zh, '家', 1570, 1560)).toBe('展开其余 10 家 ▾')
    expect(label(zh, '家', 1570, 1570)).toBe('')
    expect(label(zh, '个', 14, 0)).toBe('展开其余 14 个 ▾')
    expect(label(zh, '家', 1570, 20, true)).toBe(zh('act.loadingText'))
    expect(foldUpLabelOf(zh)).toBe('收起 ▴')
    expect(label(en, '', 1570, 0)).toBe('Show 20 ▾')
    expect(label(en, '', 1570, 20)).toBe('Show 20 more ▾')
    expect(label(en, '', 1570, 1560)).toBe('Show the remaining 10 ▾')
    expect(label(ko, '곳', 1570, 0)).toBe('20곳 펼치기 ▾')
    expect(foldUpLabelOf(en)).toBe('Collapse ▴')
  })

  it('浏览器端清单一路点「展开」:每次加 20、封顶;点的次数 = ⌈折起来几个 / 20⌉', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 3000 }), (hidden) => {
      let extra = 0
      let clicks = 0
      while (foldViewOf({ hidden, extra }).more !== '') {
        extra = Math.min(hidden, extra + FOLD_STEP)
        clicks += 1
      }
      expect(extra).toBe(hidden)
      expect(clicks).toBe(Math.ceil(hidden / FOLD_STEP))
    }), { numRuns: 300 })
  })
})
