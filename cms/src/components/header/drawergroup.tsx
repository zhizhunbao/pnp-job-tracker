'use client'
/**
 * header 域的抽屉分组件(带二级的组:标题钮 + chevron,展开列二级链)。
 * 2026-08-24 自 MobileDrawer 拆出(一个 tsx 一个组件;域内小件不出桶)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { cssOf } from '@/components/css'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import { Button, LinkButton } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { makeGroupClick, withOn } from './functions'
import type { DrawerGroupIn } from './types'
import css from './header.module.css'

/**
 * 抽屉分组(单开:开着的组键 === 自己才展开)。
 *
 * @param props 组键/标题/开合/条目(见 DrawerGroupIn 逐格注释)。
 * @returns 组标题钮 + 展开的二级链。
 */
export function DrawerGroup({ groupKey, label, openKey, onToggle, items }: DrawerGroupIn) {
  const click = makeGroupClick({ onToggle, groupKey })
  let chev = <IconChevronRight />
  if (openKey === groupKey) {
    chev = <IconChevronDown />
  }
  const subs = []
  if (openKey === groupKey) {
    for (const c of items) {
      let on = false
      if (c.active) {
        on = true
      }
      subs.push(
        <LinkButton key={c.href} href={c.href}
          className={withOn({ base: cssOf(css.drawerSub), on })}>{c.label}</LinkButton>,
      )
    }
  }
  return (
    <>
      <Button kind={PLAIN_BTN_KIND} className={css.drawerGrpBtn} onClick={click}>
        <span>{label}</span><span className={css.drawerChev}>{chev}</span>
      </Button>
      {subs}
    </>
  )
}
