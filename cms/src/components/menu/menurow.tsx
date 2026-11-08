'use client'
/**
 * menu 域的一项:危险项红字、前面挂删除图标。
 *
 * @author Frank
 * @time 2026-11-07 23:10:00
 */
import { Button } from '@/components/button'
import { IconTrash } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { itemClsOf, makePick } from './functions'
import type { MenuRowIn } from './types'

/**
 * 渲染一项。
 *
 * @param props 这一项与收起菜单。
 * @returns 一颗菜单项钮。
 */
export function MenuRow({ item, close }: MenuRowIn) {
  return (
    <li>
      <Button kind={PLAIN_BTN_KIND} sm onClick={makePick({ item, close })}
        className={itemClsOf(item.danger)}>
        {item.danger && <IconTrash />}
        {item.text}
      </Button>
    </li>
  )
}
