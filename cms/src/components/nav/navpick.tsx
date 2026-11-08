'use client'
/**
 * nav 域的小件:手机分区条(显示当前分类与子项,点开导航抽屉;2026-11-08 运维页立,形照就业把脉)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import type { NavPickBarIn } from './types'
import css from './nav.module.css'

/**
 * 手机分区条。
 *
 * @param props 分类名、子项名、抽屉开着没有与拉开回调。
 * @returns 粘顶的一条。
 */
export function NavPick({ head, sub, open, onOpen }: NavPickBarIn) {
  return (
    <div className={cssOf(css.pickBar)}>
      <Button kind={PLAIN_BTN_KIND} onClick={onOpen} expanded={open} className={cssOf(css.pick)}>
        <span className={cssOf(css.pickHead)}>{head}</span>
        {sub !== '' && <span className={cssOf(css.pickSep)}><IconChevronRight /></span>}
        {sub !== '' && <span className={cssOf(css.pickSub)}>{sub}</span>}
        <span className={cssOf(css.pickChev)}><IconChevronDown /></span>
      </Button>
    </div>
  )
}
