'use client'
/**
 * nav 域的结构:导航里的一行(普通一项,或类别下的子项)。有 href 就是链接(页内锚点照常跳),没有就是钮。
 *
 * @author Frank
 * @time 2026-11-07 22:40:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { isCountShown, makeNavPick, navCurrentOf, navRowClsOf } from './functions'
import type { NavRowIn } from './types'
import css from './nav.module.css'

/**
 * 导航里的一行。
 *
 * @param props 这一项、当前项的键、点击回调、是不是子项。
 * @returns 一个列表项。
 */
export function NavRow({ item, value, onPick, sub }: NavRowIn) {
  const on = item.key === value
  const cls = navRowClsOf({ on, sub })
  const pick = makeNavPick({ onPick, key: item.key })
  const body = (
    <>
      {sub === false && <span className={cssOf(css.icon)}>{item.icon}</span>}
      <span className={cssOf(css.label)}>{item.label}</span>
      {isCountShown(item.count) && <span className={cssOf(css.count)}>{item.count}</span>}
    </>
  )
  return (
    <li aria-current={navCurrentOf(on)}>
      {item.href != null && <LinkButton href={item.href} onClick={pick} className={cls}>{body}</LinkButton>}
      {item.href == null && <Button kind={PLAIN_BTN_KIND} onClick={pick} className={cls}>{body}</Button>}
    </li>
  )
}
