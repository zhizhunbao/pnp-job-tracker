'use client'
/**
 * nav 域的结构:类别(Fluent 2 Nav「带类别的复杂导航」:类别像手风琴,点了只展开 / 收起子项,不跳;
 * 箭头固定在右边)。2026-11-07 Frank「向下的箭头放到 文字后面」:箭头改紧跟文字,右端让给 « 收起钮。
 *
 * @author Frank
 * @time 2026-11-07 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { isNavHolding, makeNavFlip, navCatClsOf } from './functions'
import { NavRow } from './navrow'
import type { NavCatIn } from './types'
import css from './nav.module.css'

/**
 * 一个类别与它展开时的子项。
 *
 * @param props 类别、当前项的键、子项点击回调、开着没有、改开合表函数。
 * @returns 一个列表项。
 */
export function NavCat({ item, value, onPick, open, setFlips }: NavCatIn) {
  const holding = isNavHolding({ item, value })
  const subs = []
  for (const s of item.subs) {
    subs.push(<NavRow key={s.key} item={s} value={value} onPick={onPick} sub />)
  }
  return (
    <li>
      <Button kind={PLAIN_BTN_KIND} onClick={makeNavFlip({ setFlips, key: item.key, open })} expanded={open}
        className={navCatClsOf({ open, holding })}>
        <span className={cssOf(css.icon)}>{item.icon}</span>
        <span className={cssOf(css.catLabel)}>{item.label}</span>
        <span className={cssOf(css.chev)}>
          {open && <IconChevronDown />}
          {open === false && <IconChevronRight />}
        </span>
      </Button>
      {open && <ul className={cssOf(css.list)}>{subs}</ul>}
    </li>
  )
}
