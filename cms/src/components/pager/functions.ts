/**
 * pager 域的纯函数(零 JSX 零 hook)。2026-08-26 Frank 立「tsx 组件体内不许声明
 * 内嵌函数」时立件 —— 翻页两枚手柄自 Pager 体内迁出。
 *
 * @author Frank
 * @time 2026-08-26 16:00:00
 */
import { cssOf } from '@/components/css'
import {
  CLS_NONE, LINK_GAP, LINK_OFFSETS, LINK_PAGE_PARAM, LINK_QUERY_HEAD, LINK_QUERY_SEP, MORE_BUSY,
} from './constants'
import type {
  MoreLabelIn, PageHrefIn, PageLinkItem, PageLinksIn, PagerHandlesIn, PagerHandlesOut,
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
 * 页码链接行的各格:首页、末页与当前页附近(LINK_OFFSETS),升序去重;两格页码不连续的中间插一格省略。
 *
 * @param x 当前页、总页数、列表页路径与筛选查询串。
 * @returns 各格;总页数 ≤1 给空表。
 */
export function pageLinkItemsOf(x: PageLinksIn): PageLinkItem[] {
  if (x.max <= 1) {
    return []
  }
  const want = new Set<number>([0, x.max - 1])
  for (const d of LINK_OFFSETS) {
    const n = x.page + d
    if (n >= 0 && n < x.max) {
      want.add(n)
    }
  }
  const pages = Array.from(want).sort(byNumber)
  const items: PageLinkItem[] = []
  let prev = -1
  for (const n of pages) {
    if (prev >= 0 && n - prev > 1) {
      items.push({ k: LINK_GAP + String(n), text: LINK_GAP, href: CLS_NONE, cur: false })
    }
    const cur = n === x.page
    let href = CLS_NONE
    if (cur === false) {
      href = pageHrefOf({ n, path: x.path, query: x.query })
    }
    items.push({ k: String(n), text: String(n + 1), href, cur })
    prev = n
  }
  return items
}

/**
 * 数字升序比较器。
 *
 * @param a 左。
 * @param b 右。
 * @returns 差。
 */
// eslint-disable-next-line local/one-parameter -- Array.prototype.sort 的比较器签名,语言规定两参
function byNumber(a: number, b: number): number {
  return a - b
}

/**
 * 一页的地址:第 0 页不带页号(就是列表页本身,别给同一页造第二个网址)。
 *
 * @param x 目标页、路径与筛选查询串。
 * @returns 站内地址。
 */
export function pageHrefOf(x: PageHrefIn): string {
  const parts: string[] = []
  if (x.query !== CLS_NONE) {
    parts.push(x.query)
  }
  if (x.n > 0) {
    parts.push(LINK_PAGE_PARAM + String(x.n))
  }
  if (parts.length === 0) {
    return x.path
  }
  return x.path + LINK_QUERY_HEAD + parts.join(LINK_QUERY_SEP)
}

/**
 * 不是链接的那两种格的类:当前页加重,省略格灰。
 *
 * @param cur 是不是当前页。
 * @returns 类名。
 */
export function curClsOf(cur: boolean): string {
  if (cur) {
    return cssOf(css.linkCur)
  }
  return cssOf(css.linkGap)
}
