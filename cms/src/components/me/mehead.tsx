'use client'
/**
 * me 域的结构:页标题(当前节的名字)。宽屏是一行 h1;窄屏标题本身是一颗钮,后面一个向下的箭头,
 * 点了从左边拉出导航抽屉(照 Fluent 2 Nav 窄屏变覆盖抽屉;不另放汉堡钮,免得和顶栏的 ☰ 撞成两个)。
 * 右边可带这一页的动作(效果图:主按钮或开关,最多一两个)。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronDown } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { meLabelOf } from './functions'
import type { MeHeadIn } from './types'
import css from './me.module.css'

/**
 * 页标题。
 *
 * @param props 当前节、取词、窄屏否、抽屉开没开、拉开回调与右边的动作。
 * @returns 标题一行。
 */
export function MeHead({ sec, t, narrow, open, onOpen, acts = null }: MeHeadIn) {
  const label = meLabelOf({ sec, t })
  return (
    <div className={cssOf(css.head)}>
      <h1 className={cssOf(css.h1)}>
        {narrow && (
          <Button kind={PLAIN_BTN_KIND} onClick={onOpen} expanded={open} className={cssOf(css.pick)}>
            {label}
            <IconChevronDown />
          </Button>
        )}
        {narrow === false && label}
      </h1>
      {acts != null && <div className={cssOf(css.acts)}>{acts}</div>}
    </div>
  )
}
