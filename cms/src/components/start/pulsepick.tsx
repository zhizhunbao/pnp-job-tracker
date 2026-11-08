'use client'
/**
 * 域内小件:手机分区条(2026-11-07 两排页签改左侧导航;只在 640 及以下出,宽屏由左栏代)。
 * 一行写「分区 › 子项」告诉用户现在在哪,右端下拉箭头,整条一个钮,点了从左边拉出导航抽屉。
 * 不放三条横线:顶栏左边已有全站菜单的三条横线,两个同样的图标叠着分不清(效果图评审时撞上)。
 *
 * @author Frank
 * @time 2026-11-07 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import type { PulsePickIn } from './types'
import css from './start.module.css'

/**
 * 手机分区条。
 *
 * @param props 分区名、子项名、抽屉开着没有与拉开回调。
 * @returns 粘顶的一条。
 */
export function PulsePick({ head, sub, open, onOpen }: PulsePickIn) {
  return (
    <div className={cssOf(css.pickBar)}>
      <Button kind={PLAIN_BTN_KIND} onClick={onOpen} expanded={open} className={cssOf(css.pick)}>
        <span className={cssOf(css.pickHead)}>{head}</span>
        {sub !== TEXT_NONE && <span className={cssOf(css.pickSep)}><IconChevronRight /></span>}
        {sub !== TEXT_NONE && <span className={cssOf(css.pickSub)}>{sub}</span>}
        <span className={cssOf(css.pickChev)}><IconChevronDown /></span>
      </Button>
    </div>
  )
}
