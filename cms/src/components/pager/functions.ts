/**
 * pager 域的纯函数(零 JSX 零 hook)。2026-08-26 Frank 立「tsx 组件体内不许声明
 * 内嵌函数」时立件 —— 翻页两枚手柄自 Pager 体内迁出。
 *
 * @author Frank
 * @time 2026-08-26 16:00:00
 */
import { cssOf } from '@/components/css'
import {
  CLS_NONE, FOLD_KEYS, FOLD_MORE_FIRST, FOLD_MORE_NEXT, FOLD_MORE_NONE, FOLD_MORE_REST, FOLD_STEP, K_FOLD_BUSY,
  K_FOLD_UP, MORE_BUSY,
} from './constants'
import type {
  FoldLabelIn, FoldMoreIn, FoldT, FoldView, FoldViewIn, MoreLabelIn, PagerHandlesIn, PagerHandlesOut,
} from './types'
import css from './pager.module.css'

/**
 * 造翻页行的前后两枚手柄(自 Pager 体内迁出)。两枚都在写同一格页码,
 * 一个工厂发齐;越界由 Math.min/max 收在这里,钮的禁用态另走 CSS 的 `:disabled`。
 *
 * @param x 当前页、总页数与翻页回调。
 * @returns 上一页 / 下一页两枚具名手柄。
 */
export function makePagerHandles(x: PagerHandlesIn): PagerHandlesOut {
  function prev() {
    x.onPage(Math.max(0, x.page - 1))
  }

  function next() {
    x.onPage(Math.min(x.max - 1, x.page + 1))
  }

  return { prev, next }
}

/**
 * 「显示更多」钮的类:在途时压淡。
 *
 * @param loading 在途没。
 * @returns 类名或空串。
 */
export function moreBtnClsOf(loading: boolean): string {
  if (loading) {
    return cssOf(css.moreBusy)
  }
  return CLS_NONE
}

/**
 * 「显示更多」的钮面文案:在途时只出占位。
 *
 * @param x 在途没与平时的钮面文案。
 * @returns 钮面文案。
 */
export function moreLabelOf(x: MoreLabelIn): string {
  if (x.loading) {
    return MORE_BUSY
  }
  return x.label
}

/**
 * 清单末尾两只钮这一刻怎么出(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」):其余还剩 > 一步 —— 收着写「展开 20」
 * 、展开着写「再展开 20」;
 * 剩 ≤ 一步写「展开其余 N」;都展开完不出「展开」钮;展开着才出「收起」。
 *
 * @param x 折起来的总数与已展开个数。
 * @returns 「展开」钮的档与个数、「收起」出不出。
 */
export function foldViewOf(x: FoldViewIn): FoldView {
  const remain = x.hidden - x.extra
  const up = x.extra > 0
  if (remain <= 0) {
    return { more: FOLD_MORE_NONE, n: 0, up }
  }
  if (remain <= FOLD_STEP) {
    return { more: FOLD_MORE_REST, n: remain, up }
  }
  if (x.extra === 0) {
    return { more: FOLD_MORE_FIRST, n: FOLD_STEP, up }
  }
  return { more: FOLD_MORE_NEXT, n: FOLD_STEP, up }
}

/**
 * 「展开」钮的字(取数中写加载中;不出钮给 '')。
 *
 * @param x 取词函数、量词、展开态与取数中。
 * @returns 钮面文案。
 */
export function foldMoreLabelOf(x: FoldLabelIn): string {
  if (x.view.more === FOLD_MORE_NONE) {
    return CLS_NONE
  }
  if (x.busy) {
    return x.t(K_FOLD_BUSY)
  }
  const key = FOLD_KEYS[x.view.more]
  if (key == null) {
    return CLS_NONE
  }
  return x.t(key, { n: x.view.n, u: x.unit })
}

/**
 * 「收起」钮的字。
 *
 * @param t 取词函数。
 * @returns 钮面文案。
 */
export function foldUpLabelOf(t: FoldT): string {
  return t(K_FOLD_UP)
}

/**
 * 浏览器端清单的「展开」手柄:一次加一步,封顶折起来的总数。
 *
 * @param x 折起来的总数与已展开个数的写口。
 * @returns 点击手柄。
 */
export function makeFoldMore(x: FoldMoreIn): () => void {
  return function more(): void {
    x.setExtra(function step(prev: number): number {
      return Math.min(x.hidden, prev + FOLD_STEP)
    })
  }
}

/**
 * 「收起」手柄:已展开个数归零。
 *
 * @param setExtra 已展开个数的写口。
 * @returns 点击手柄。
 */
export function makeFoldUp(setExtra: (v: number) => void): () => void {
  return function up(): void {
    setExtra(0)
  }
}
