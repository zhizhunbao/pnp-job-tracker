'use client'
/**
 * nav 域的结构:侧边导航(照 Fluent 2 Nav 的 Simple nav —— 一层、每项带图标、当前项左边一条主色竖条;
 * 2026-11-07 Frank「我的」整页照 Fluent / Azure 重做,docs/design/我的/我的框架-20261107.md)。
 * 宽屏常驻在 NavFrame 左栏,窄屏装进 NavDrawer;两处同一个件。
 * 2026-11-07 就业把脉侧栏:加 Complex nav with categories —— 带子项的一项是类别(NavCat),其余照旧一行(NavRow)。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { cssOf } from '@/components/css'
import { navOpenOf } from './functions'
import { useNavFlips } from './hooks'
import { NavCat } from './navcat'
import { NavRow } from './navrow'
import type { NavIn } from './types'
import css from './nav.module.css'

/**
 * 侧边导航。
 *
 * @param props 各项、当前项、点击回调与无障碍名。
 * @returns nav 地标。
 */
export function Nav({ items, value, onPick, ariaLabel }: NavIn) {
  const f = useNavFlips({ items, value })
  const rows = []
  for (const it of items) {
    if (it.subs.length === 0) {
      rows.push(<NavRow key={it.key} item={it} value={value} onPick={onPick} sub={false} />)
    } else {
      rows.push(
        <NavCat key={it.key} item={it} value={value} onPick={onPick}
          open={navOpenOf({ item: it, value, flips: f.flips })} setFlips={f.setFlips} />,
      )
    }
  }
  return (
    <nav aria-label={ariaLabel}>
      <ul className={cssOf(css.list)}>{rows}</ul>
    </nav>
  )
}
