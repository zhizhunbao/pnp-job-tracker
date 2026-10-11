'use client'
/**
 * 铃铛面板里的一条(2026-10-11 批 5):一句 + 灰字时刻,没看过的加一枚蓝点、底色浅蓝;点了整页去它的去处。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { TimeText } from '@/components/time'
import { GRAIN_MINUTE, PLAIN_BTN_KIND } from './constants'
import { itemTextOf, makeGoItem, rowClsOf } from './functions'
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
      <span className={cssOf(css.dot)} aria-hidden />
      <span className={cssOf(css.line)}>{itemTextOf({ item, t })}</span>
      <span className={cssOf(css.when)}><TimeText iso={item.at} grain={GRAIN_MINUTE} /></span>
    </Button>
  )
}
