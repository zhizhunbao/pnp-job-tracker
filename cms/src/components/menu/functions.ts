/**
 * menu 域的行为:点一项的手柄、按状态取类名(三目只许在词汇表里,类名照 nav 桶 navRowClsOf 的先例在这里分)。
 *
 * @author Frank
 * @time 2026-11-07 23:10:00
 */
import { cssOf } from '@/components/css'
import type { PickIn } from './types'
import css from './menu.module.css'

/**
 * 造「点一项」的手柄:菜单先收起,再调这一项(这一项多半会开确认框,菜单不该还挂在上面)。
 *
 * @param x 这一项与收起菜单。
 * @returns 点击手柄。
 */
export function makePick(x: PickIn): () => void {
  return function pick(): void {
    x.close()
    x.item.onClick()
  }
}

/**
 * 「⋯」按钮的类名:开着时灰底。
 *
 * @param open 菜单开着没有。
 * @returns 类名。
 */
export function triggerClsOf(open: boolean): string {
  if (open) {
    return cssOf(css.triggerOpen)
  }
  return cssOf(css.trigger)
}

/**
 * 一项的类名:危险项红字。
 *
 * @param danger 是不是危险操作。
 * @returns 类名。
 */
export function itemClsOf(danger: boolean): string {
  if (danger) {
    return cssOf(css.itemDanger)
  }
  return cssOf(css.item)
}
