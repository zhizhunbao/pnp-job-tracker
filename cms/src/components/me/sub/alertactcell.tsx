'use client'
/**
 * me 桶子桶 sub 的提醒表:操作格(改条件 + 行末菜单删除;按档案推荐那一行没有)。
 *
 * @author Frank
 * @time 2026-11-08 23:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Menu } from '@/components/menu'
import { AL_BTN_KIND, TEXT_NONE } from './constants'
import type { AlertRow } from './types'
import css from './sub.module.css'

/**
 * 操作格。
 *
 * @param r 表行。
 * @returns 钮组或空。
 */
export function AlertActCell(r: AlertRow) {
  if (r.href === TEXT_NONE) {
    return null
  }
  return (
    <div className={cssOf(css.alertActs)}>
      <Button kind={AL_BTN_KIND} sm href={r.href}>{r.editText}</Button>
      <Menu label={r.more} items={r.menu} />
    </div>
  )
}
