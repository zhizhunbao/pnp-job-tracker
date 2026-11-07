/**
 * nav 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { cssOf } from '@/components/css'
import { COUNT_NONE, CURRENT_NONE, CURRENT_PAGE } from './constants'
import type { NavPickIn } from './types'
import css from './nav.module.css'

/**
 * 某一项的点击手柄。
 *
 * @param x 回调与这一项的键。
 * @returns 无参点击手柄。
 */
export function makeNavPick(x: NavPickIn): () => void {
  function onClick() {
    x.onPick(x.key)
  }
  return onClick
}

/**
 * 某一项钮的类名:选中多一个修饰类(浅主色底 + 左边主色竖条)。
 *
 * @param on 是不是当前项。
 * @returns 类名。
 */
export function navItemClsOf(on: boolean): string {
  if (on) {
    return `${cssOf(css.item)} ${cssOf(css.itemOn)}`
  }
  return cssOf(css.item)
}

/**
 * 某一项的 aria-current:当前项念「当前页」,其余写「不是」。
 *
 * @param on 是不是当前项。
 * @returns aria-current 的值。
 */
export function navCurrentOf(on: boolean): typeof CURRENT_PAGE | typeof CURRENT_NONE {
  if (on) {
    return CURRENT_PAGE
  }
  return CURRENT_NONE
}

/**
 * 计数要不要出(0 不出)。
 *
 * @param count 计数。
 * @returns 要出就是 true。
 */
export function isCountShown(count: number): boolean {
  return count > COUNT_NONE
}
