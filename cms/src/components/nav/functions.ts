/**
 * nav 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { cssOf } from '@/components/css'
import { COLLAPSE_ARIA, COUNT_NONE, CURRENT_NONE, CURRENT_PAGE, EXPAND_ARIA, KEY_NONE } from './constants'
import type {
  NavBoolFlipIn, NavBoolSetIn, NavCatClsIn, NavFlipIn, NavFlipsWithIn, NavHoldIn, NavHoldingKeyIn, NavOpenIn, NavPickIn,
  NavRowClsIn,
} from './types'
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

/**
 * 一行(普通项或子项)的类名:子项再加缩进、矮一点的修饰类。
 *
 * @param x 是不是当前项、是不是子项。
 * @returns 类名。
 */
export function navRowClsOf(x: NavRowClsIn): string {
  if (x.sub) {
    return `${navItemClsOf(x.on)} ${cssOf(css.sub)}`
  }
  return navItemClsOf(x.on)
}

/**
 * 当前项在不在这个类别里(类别自己或它的某个子项是当前项)。
 *
 * @param x 类别与当前项的键。
 * @returns 在就是 true。
 */
export function isNavHolding(x: NavHoldIn): boolean {
  if (x.item.key === x.value) {
    return true
  }
  for (const s of x.item.subs) {
    if (s.key === x.value) {
      return true
    }
  }
  return false
}

/**
 * 当前项落在哪个类别里(类别自己或它的某个子项是当前项)。
 *
 * @param x 各项与当前项的键。
 * @returns 类别键;不在任何类别里给 ''。
 */
export function holdingKeyOf(x: NavHoldingKeyIn): string {
  for (const it of x.items) {
    if (it.subs.length > 0 && isNavHolding({ item: it, value: x.value })) {
      return it.key
    }
  }
  return KEY_NONE
}

/**
 * 类别开着没有:用户手动开合过就听用户的;没点过就跟着当前项走(当前项在里面就开)。
 *
 * @param x 类别、当前项的键与手动开合表。
 * @returns 开着就是 true。
 */
export function navOpenOf(x: NavOpenIn): boolean {
  if (x.item.key in x.flips) {
    return x.flips[x.item.key] === true
  }
  return isNavHolding({ item: x.item, value: x.value })
}

/**
 * 类别那一行的类名:开着且当前项在里面 = 深字 + 主色图标;收起且当前项在里面 = 选中指示挪到类别上
 * (Fluent 2 Nav Selection 节:子项是当前页而类别收起时,选中指示显示在类别上)。
 *
 * @param x 开着没有、当前项在不在里面。
 * @returns 类名。
 */
export function navCatClsOf(x: NavCatClsIn): string {
  if (x.holding && x.open) {
    return `${cssOf(css.item)} ${cssOf(css.catOn)}`
  }
  return navItemClsOf(x.holding)
}

/**
 * 类别的点击手柄:把这个类别翻过来(开变关、关变开),记进手动开合表。
 *
 * @param x 改表函数、类别键、点之前开着没有。
 * @returns 无参点击手柄。
 */
export function makeNavFlip(x: NavFlipIn): () => void {
  function next(prev: Record<string, boolean>): Record<string, boolean> {
    return flipsWithOf({ prev, key: x.key, open: x.open === false })
  }
  function onClick() {
    x.setFlips(next)
  }
  return onClick
}

/**
 * 手动开合表改一格后的新表(逐格抄一份,不改原表)。
 *
 * @param x 原表、要改的类别、改成开还是关。
 * @returns 新表。
 */
export function flipsWithOf(x: NavFlipsWithIn): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const k of Object.keys(x.prev)) {
    out[k] = x.prev[k] === true
  }
  out[x.key] = x.open
  return out
}

/**
 * 布尔状态翻转的点击手柄(« / » 收起展开用)。
 *
 * @param x 布尔状态的改写函数。
 * @returns 无参点击手柄。
 */
export function makeNavBoolFlip(x: NavBoolFlipIn): () => void {
  function next(prev: boolean): boolean {
    return prev === false
  }
  function onClick() {
    x.set(next)
  }
  return onClick
}

/**
 * 布尔状态设成定值的点击手柄(抽屉开 / 关用)。
 *
 * @param x 布尔状态的改写函数与要设的值。
 * @returns 无参点击手柄。
 */
export function makeNavBoolSet(x: NavBoolSetIn): () => void {
  function onClick() {
    x.set(x.to)
  }
  return onClick
}

/**
 * 左栏的类名:收起了多一个修饰类(只剩一条窄边放 »)。
 *
 * @param collapsed 收起了没有。
 * @returns 类名。
 */
export function navSideClsOf(collapsed: boolean): string {
  if (collapsed) {
    return `${cssOf(css.side)} ${cssOf(css.sideOff)}`
  }
  return cssOf(css.side)
}

/**
 * 右边内容的类名:bare 时不加内衬。
 *
 * @param bare 内容自己带正文轨。
 * @returns 类名。
 */
export function navMainClsOf(bare: boolean): string {
  if (bare) {
    return `${cssOf(css.main)} ${cssOf(css.mainBare)}`
  }
  return cssOf(css.main)
}

/**
 * « / » 钮的 aria-label 与悬停提示。
 *
 * @param collapsed 收起了没有。
 * @returns 提示词。
 */
export function collapseAriaOf(collapsed: boolean): string {
  if (collapsed) {
    return EXPAND_ARIA
  }
  return COLLAPSE_ARIA
}
