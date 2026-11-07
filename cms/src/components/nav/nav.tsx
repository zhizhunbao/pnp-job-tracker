'use client'
/**
 * nav 域的结构:侧边导航(照 Fluent 2 Nav 的 Simple nav —— 一层、每项带图标、当前项左边一条主色竖条;
 * 2026-11-07 Frank「我的」整页照 Fluent / Azure 重做,docs/design/我的/我的框架-20261107.md)。
 * 宽屏常驻在 NavFrame 左栏,窄屏装进 NavDrawer;两处同一个件。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { isCountShown, makeNavPick, navCurrentOf, navItemClsOf } from './functions'
import type { NavIn } from './types'
import css from './nav.module.css'

/**
 * 侧边导航。
 *
 * @param props 各项、当前项、点击回调与无障碍名。
 * @returns nav 地标。
 */
export function Nav({ items, value, onPick, ariaLabel }: NavIn) {
  const rows = []
  for (const it of items) {
    const on = it.key === value
    rows.push(
      <li key={it.key} aria-current={navCurrentOf(on)}>
        <Button kind={PLAIN_BTN_KIND} onClick={makeNavPick({ onPick, key: it.key })} className={navItemClsOf(on)}>
          <span className={cssOf(css.icon)}>{it.icon}</span>
          <span className={cssOf(css.label)}>{it.label}</span>
          {isCountShown(it.count) && <span className={cssOf(css.count)}>{it.count}</span>}
        </Button>
      </li>,
    )
  }
  return (
    <nav aria-label={ariaLabel}>
      <ul className={cssOf(css.list)}>{rows}</ul>
    </nav>
  )
}
