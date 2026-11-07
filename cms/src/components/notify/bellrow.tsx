'use client'
/**
 * 铃铛面板里的一条(2026-10-11 批 5;2026-11-07 照效果图重写):前面一枚种类图标,一句黑字,下面一行灰字「去<页名>,<时刻>」;
 * 没看过的整行浅蓝底;点了整页去「我的」对应那一节。
 *
 * @author Frank
 * @time 2026-11-07 17:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { goTextOf, itemTextOf, makeGoItem, rowClsOf } from './functions'
import { BellIcon } from './bellicon'
import type { BellRowIn } from './types'
import css from './notify.module.css'

/**
 * 一条。
 *
 * @param props 取词函数与这一条。
 * @returns 一行钮。
 */
export function BellRow({ t, item }: BellRowIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} onClick={makeGoItem(item)} className={rowClsOf(item.unseen)}>
      <span className={cssOf(css.icon)} aria-hidden><BellIcon kind={item.kind} /></span>
      <span className={cssOf(css.body)}>
        <span className={cssOf(css.line)}>{itemTextOf({ item, t })}</span>
        <span className={cssOf(css.sub)}>{goTextOf({ item, t })}</span>
      </span>
    </Button>
  )
}
