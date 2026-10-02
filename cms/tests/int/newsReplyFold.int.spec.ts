// 资讯评论楼内回复的展开 / 收起换成全站一套 FoldLine(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」
// 「展开 20, 再展开 20, 再开其余, 收起」)。
// 性质:① ≤3 条恒展开(折 0 条),>3 条整楼折起;② 露出来的 = 时间正序的前缀,条数 = 恒露 + 已展开;
//       ③ 一路点「展开」到底 = 全楼露出,点数 = ⌈折起来几条 / 20⌉。
// 金标(手写):2 条全露无钮;5 条收着「展开其余 5 条回复 ▾」;45 条 → 展开 20 → 再展开 20 → 展开其余 5 → 收起。
// 探针:把 REPLIES_OPEN_MAX 改成 4、或 shownRepliesOf 漏加 extra,金标里 5 条 / 45 条那几行对不上。
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { replyHiddenOf, shownRepliesOf } from '@/components/news/functions'
import type { NewsComment } from '@/components/news/types'
import { FOLD_STEP } from '@/components/pager/constants'
import { foldMoreLabelOf, foldViewOf } from '@/components/pager/functions'
import { makeT } from '@/lib/i18n'

const zh = makeT('zh')

const thread = (n: number): NewsComment[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1 }) as NewsComment)

const ids = (rows: NewsComment[]) => rows.map((r) => r.id)

const label = (count: number, extra: number) =>
  foldMoreLabelOf({ t: zh, unit: zh('fold.u.reply'), view: foldViewOf({ hidden: replyHiddenOf(count), extra }), busy: false })

describe('资讯评论楼内回复 展开 / 收起', () => {
  it('金标:≤3 条全露无钮;5 条收着展开其余;45 条一路展开到底', () => {
    expect(replyHiddenOf(0)).toBe(0)
    expect(replyHiddenOf(3)).toBe(0)
    expect(replyHiddenOf(4)).toBe(4)
    expect(ids(shownRepliesOf({ replies: thread(2), hidden: 0, extra: 0 }))).toEqual([1, 2])
    expect(label(2, 0)).toBe('')
    expect(ids(shownRepliesOf({ replies: thread(5), hidden: 5, extra: 0 }))).toEqual([])
    expect(label(5, 0)).toBe('展开其余 5 条回复 ▾')
    expect(label(45, 0)).toBe('展开 20 条回复 ▾')
    expect(shownRepliesOf({ replies: thread(45), hidden: 45, extra: 20 })).toHaveLength(20)
    expect(label(45, 20)).toBe('再展开 20 条回复 ▾')
    expect(label(45, 40)).toBe('展开其余 5 条回复 ▾')
    expect(shownRepliesOf({ replies: thread(45), hidden: 45, extra: 45 })).toHaveLength(45)
    expect(label(45, 45)).toBe('')
  })

  it('性质:折 0 条或整楼;露出来的是时间正序前缀,条数 = 恒露 + 已展开', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 300 }), fc.integer({ min: 0, max: 300 }), (count, rawExtra) => {
      const hidden = replyHiddenOf(count)
      expect(hidden === 0 || hidden === count).toBe(true)
      const extra = Math.min(hidden, rawExtra)
      const replies = thread(count)
      const shown = shownRepliesOf({ replies, hidden, extra })
      expect(shown).toHaveLength(count - hidden + extra)
      expect(ids(shown)).toEqual(ids(replies).slice(0, shown.length))
    }), { numRuns: 500 })
  })

  it('一路点「展开」到底:全楼露出,点数 = ⌈折起来几条 / 20⌉', () => {
    fc.assert(fc.property(fc.integer({ min: 4, max: 300 }), (count) => {
      const hidden = replyHiddenOf(count)
      let extra = 0
      let clicks = 0
      while (foldViewOf({ hidden, extra }).more !== '') {
        extra = Math.min(hidden, extra + FOLD_STEP)
        clicks += 1
      }
      expect(shownRepliesOf({ replies: thread(count), hidden, extra })).toHaveLength(count)
      expect(clicks).toBe(Math.ceil(hidden / FOLD_STEP))
    }), { numRuns: 200 })
  })
})
