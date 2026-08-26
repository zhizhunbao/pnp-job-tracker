/**
 * search 域的纯函数(零 JSX 零 hook)。2026-08-26 Frank 立「tsx 组件体内不许声明
 * 内嵌函数」时立件 —— 清除钮的手柄自 Search 体内迁出。
 *
 * @author Frank
 * @time 2026-08-26 16:00:00
 */
import { QUERY_NONE } from './constants'
import type { ClickFn, SearchClearIn } from './types'

/**
 * 造清除钮的点击手柄(自 Search 体内迁出):把查询词打回空档。
 *
 * @param x 改值回调。
 * @returns 挂到清除钮上的 onClick。
 */
export function makeSearchClear(x: SearchClearIn): ClickFn {
  function clear() {
    x.onChange(QUERY_NONE)
  }

  return clear
}
