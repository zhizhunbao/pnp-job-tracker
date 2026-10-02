// 资讯评论楼内回复的展开 / 收起换成全站一套 FoldLine(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」
// 「展开 20, 再展开 20, 再开其余, 收起」)。
// 2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」):默认露前 20 条,超出的才折(原「≤3 条恒展开、更多整楼折起」撤)。
// 性质:① 折起来的 = 超出 20 的那几条;② 露出来的 = 时间正序的前缀,条数 = 恒露 + 已展开;
//       ③ 一路点「展开」到底 = 全楼露出,点数 = ⌈折起来几条 / 20⌉。
// 金标(手写):20 条全露无钮;21 条收着「展开其余 1 条回复 ▾」;65 条 → 展开 20 → 再展开 20 → 展开其余 5 → 收起。
// 探针:默认条数改成 19、或 shownRepliesOf 漏加 extra,金标里 20 条 / 65 条那几行对不上。
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
  // 2026-10-02 Frank「默认显示 20 是不是太多了」→「改成 10」:恒露 20 改 10,「展开」一次仍加 20
  it('金标:10 条全露无钮;11 条收着展开其余 1 条;65 条一路展开到底', () => {
    expect(replyHiddenOf(0)).toBe(0)
    expect(replyHiddenOf(10)).toBe(0)
    expect(replyHiddenOf(11)).toBe(1)
    expect(ids(shownRepliesOf({ replies: thread(2), hidden: 0, extra: 0 }))).toEqual([1, 2])
    expect(label(10, 0)).toBe('')
    expect(shownRepliesOf({ replies: thread(11), hidden: 1, extra: 0 })).toHaveLength(10)
    expect(label(11, 0)).toBe('展开其余 1 条回复 ▾')
    expect(label(65, 0)).toBe('展开 20 条回复 ▾')
    expect(shownRepliesOf({ replies: thread(65), hidden: 55, extra: 20 })).toHaveLength(30)
    expect(label(65, 20)).toBe('再展开 20 条回复 ▾')
    expect(label(65, 40)).toBe('展开其余 15 条回复 ▾')
    expect(shownRepliesOf({ replies: thread(65), hidden: 55, extra: 55 })).toHaveLength(65)
    expect(label(65, 55)).toBe('')
  })

  it('性质:折起来的是超出 10 的那几条;露出来的是时间正序前缀,条数 = 恒露 + 已展开', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 300 }), fc.integer({ min: 0, max: 300 }), (count, rawExtra) => {
      const hidden = replyHiddenOf(count)
      expect(hidden).toBe(Math.max(0, count - 10))
      const extra = Math.min(hidden, rawExtra)
      const replies = thread(count)
      const shown = shownRepliesOf({ replies, hidden, extra })
      expect(shown).toHaveLength(count - hidden + extra)
      expect(ids(shown)).toEqual(ids(replies).slice(0, shown.length))
    }), { numRuns: 500 })
  })

  it('一路点「展开」到底:全楼露出,点数 = ⌈折起来几条 / 20⌉', () => {
    fc.assert(fc.property(fc.integer({ min: 21, max: 300 }), (count) => {
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
