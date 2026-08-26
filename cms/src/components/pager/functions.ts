/**
 * pager 域的纯函数(零 JSX 零 hook)。2026-08-26 Frank 立「tsx 组件体内不许声明
 * 内嵌函数」时立件 —— 翻页两枚手柄自 Pager 体内迁出。
 *
 * @author Frank
 * @time 2026-08-26 16:00:00
 */
import type { PagerHandlesIn, PagerHandlesOut } from './types'

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
