'use client'
/**
 * menu 域的结构:行内「⋯」更多操作菜单(2026-11-07 Frank「我的求职」三张表加回删除,照 Azure 门户资源列表一行末尾的
 * More actions:一行仍只有一颗主钮,次要操作收进「⋯」;docs/design/我的/我的求职-20261009.md 2.11)。
 * 无障碍照 WAI-ARIA APG Disclosure:「⋯」带 aria-expanded,下面一列普通按钮;不挂 role="menu" ——
 * 那个角色要方向键在项间移动,这里没有,不许诺做不到的键盘行为。点外面、按 Esc 收起。
 *
 * @author Frank
 * @time 2026-11-07 23:10:00
 */
import { useRef } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMore } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { triggerClsOf } from './functions'
import { useMenu } from './hooks'
import { MenuRow } from './menurow'
import type { MenuIn } from './types'
import css from './menu.module.css'

/**
 * 「⋯」按钮 + 弹出的一列操作。
 *
 * @param props 无障碍名与各项。
 * @returns 菜单根节点。
 */
export function Menu({ label, items }: MenuIn) {
  const ref = useRef<HTMLDivElement | null>(null)
  const m = useMenu(ref)
  const rows = []
  for (const it of items) {
    rows.push(<MenuRow key={it.key} item={it} close={m.close} />)
  }
  return (
    <div ref={ref} className={cssOf(css.root)}>
      <Button kind={PLAIN_BTN_KIND} sm ariaLabel={label} title={label} expanded={m.open} onClick={m.onToggle}
        className={triggerClsOf(m.open)}>
        <IconMore />
      </Button>
      {m.open && <ul className={cssOf(css.list)}>{rows}</ul>}
    </div>
  )
}
